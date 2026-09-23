import type { JevClient, QuestionSpec, SystemOneResponse } from './jev/client'

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { readReceipts } from './jev/suggestions'
import { hashTagFile } from './jev/tags'
import { runTags, USAGE } from './suggest-tags'

const writePost = (root: string, id: number, publishDate: string, tags: string[]): void => {
    const dir = join(root, 'posts', String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate, tags }))
    for (const lang of ['en', 'fi', 'sv'] as const) {
        writeFileSync(
            join(dir, `${lang}.mdx`),
            `---\ntitle: '${lang} post ${id}'\nslug: 's${id}'\ndescription: 'about ${id}'\n---\n\n${id === 3 ? '' : `Body of ${id}.`}\n`
        )
    }
}

const writeNewsletter = (root: string, id: number): void => {
    const dir = join(root, 'newsletters', String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate: '2026-01-01', sent: '2025-11-20' }))
    for (const lang of ['en', 'fi', 'sv'] as const) {
        writeFileSync(
            join(dir, `${lang}.mdx`),
            `---\ntitle: '${lang} issue ${id}'\nslug: 'i${id}'\ndescription: 'd'\n---\n\nIssue.\n`
        )
    }
}

const writeTag = (dir: string, id: string, name: string): void =>
    writeFileSync(
        join(dir, `${id}.ts`),
        `export const tag = { id: '${id}', names: { en: '${name}', fi: 'x' }, descriptions: { en: ['${name} matters.'], fi: ['x'] } }\n`
    )

interface Call {
    questions: Record<string, QuestionSpec>
    state: unknown
}

/** noul: p from the tag id in the instructions and the post title in the state. */
const fakeClient = (
    noul: (tagId: string, state: string) => number,
    failOn?: string
): { calls: Call[]; client: JevClient } => {
    const calls: Call[] = []
    const client: JevClient = {
        ask: async (state, questions): Promise<SystemOneResponse> => {
            calls.push({ questions, state })
            const text = JSON.stringify(state)
            if (failOn && text.includes(failOn)) throw new Error('boom')
            const answers: SystemOneResponse['answers'] = {}
            for (const [name, q] of Object.entries(questions)) {
                if (q.type === 'noul') answers[name] = { noul: noul(name, text), type: 'noul' }
            }

            return {
                answers,
                id: 'r',
                model: 'typesafe/jev-1.13-20260917',
                usage: { input_tokens: 100, output_tokens: 1 },
            }
        },
        provider: { apiKey: 'k', baseUrl: 'http://x', model: 'jev-1.13', name: 'openrouter' },
    }

    return { calls, client }
}

describe('runTags', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-suggest-tags-'))
    const tagsDir = join(root, 'tags')
    const receipts = join(root, 'suggestions.json')
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    writePost(root, 1, '2026-01-01', ['economy', 'municipal-elections-2025'])
    writePost(root, 2, '2026-02-01', ['nature'])
    writePost(root, 3, '2026-03-01', [])
    writeNewsletter(root, 5)
    mkdirSync(tagsDir)
    writeFileSync(join(tagsDir, 'types.ts'), 'export interface LocalTag { id: string }\n')
    for (const [id, name] of [
        ['economy', 'Economy'],
        ['freedom', 'Freedom'],
        ['municipal-elections-2025', 'Municipal elections 2025'],
        ['nature', 'Nature'],
        ['orphan', 'Orphan'],
    ]) {
        writeTag(tagsDir, id, name)
    }
    writeFileSync(
        join(root, 'tags.ts'),
        "import type { LocalTag } from './tags/types'\n\nimport { tag as a } from './tags/economy'\nimport { tag as b } from './tags/freedom'\nimport { tag as c } from './tags/municipal-elections-2025'\nimport { tag as d } from './tags/nature'\n"
    )
    const env = { OPENROUTER_API_KEY: 'k' }
    const deps = (client: JevClient, log: (l: string) => void = () => {}) => ({ client, log, receipts, root, tagsDir })

    it('skips without a key and rejects bad arguments before any request', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0)

        expect(await runTags(['post', '1'], {}, { log: (l) => lines.push(l), root, tagsDir })).toBe(0)
        expect(lines).toEqual(['skipped: no OPENROUTER_API_KEY or TYPESAFE_API_KEY'])
        for (const argv of [
            [],
            ['newsletter', '5'],
            ['post', 'x'],
            ['post', '1', '--lang', 'de'],
            ['post', '1', '--consider', '1.5'],
            ['post', '1', '--doubtful', '0'],
            ['post', '1', '--concurrency', '0'],
            ['--tag', 'economy', 'post', '1'],
            ['--tag', 'economy', '--changed-since', 'main'],
            ['--changed-since', 'main', 'post', '1'],
        ]) {
            lines.length = 0
            expect(
                await runTags(
                    argv,
                    env,
                    deps(client, (l) => lines.push(l))
                )
            ).toBe(2)
            expect(lines).toEqual([USAGE])
        }
        expect(calls).toEqual([])
    })

    it('per-post mode: one request per post, English labels, partitioned tables, editorial tags listed once', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient((tag, state) => {
            if (tag === 'municipal-elections-2025') return 0.99
            if (tag === 'nature') return state.includes('post 1') ? 0.9 : 0.1
            if (tag === 'economy') return 0.05
            if (tag === 'freedom') return 0.75
            if (tag === 'orphan') return state.includes('post 1') ? 0.8 : 0.3

            return 0
        })

        expect(
            await runTags(
                ['post', '1', 'post', '2', '--lang', 'en'],
                env,
                deps(client, (l) => lines.push(l))
            )
        ).toBe(0)
        expect(calls).toHaveLength(2)
        expect(calls[0].state).toEqual({ description: 'about 1', headings: '', lead: 'Body of 1.', title: 'en post 1' })
        expect(Object.keys(calls[0].questions).toSorted()).toEqual([
            'economy',
            'freedom',
            'municipal-elections-2025',
            'nature',
            'orphan',
        ])
        expect(calls[0].questions.nature).toEqual({
            instructions: "This article belongs in the category 'Nature': Nature matters.",
            type: 'noul',
        })
        const text = lines.join('\n')
        expect(text).toContain('## post:1 — en post 1\n\nassigned: economy, municipal-elections-2025')
        expect(text).toContain('### consider\n\n| tag | p |\n| --- | --- |\n| nature | 0.90 |\n| orphan | 0.80 |')
        expect(text).toContain('### doubtful\n\n| tag | p |\n| --- | --- |\n| economy | 0.05 |')
        expect(text).toContain('| economy | 0.05 | ✓ |\n| culture-and-education | 0.00 |  |\n| freedom | 0.75 |  |')
        expect(text).toContain('not suggested: coop-elections, council-motion')
        expect(text).toContain('## post:2 — en post 2\n\nassigned: nature\n\n### consider\n\nno tags to consider')
        expect(text).toContain('### doubtful\n\n| tag | p |\n| --- | --- |\n| nature | 0.10 |')
        expect(readReceipts(receipts)).toBeNull()
    })

    it('per-post mode honours the thresholds and sends a request for a post without prose', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient((tag) => (tag === 'nature' ? 0.5 : 0))

        expect(
            await runTags(
                ['post', '3', '--consider', '0.4', '--doubtful', '0.6'],
                env,
                deps(client, (l) => lines.push(l))
            )
        ).toBe(0)
        expect(calls).toHaveLength(1)
        expect(calls[0].state).toEqual({ description: 'about 3', headings: '', lead: '', title: 'fi post 3' })
        expect(lines.join('\n')).toContain(
            '### consider\n\n| tag | p |\n| --- | --- |\n| nature | 0.50 |\n\n### doubtful\n\nno doubtful tags'
        )
    })

    it('retro-scan: one request per post lacking the tag, newest first, writes the receipt', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient((tag, state) => (state.includes('post 2') ? 0.6 : 0.8))

        expect(
            await runTags(
                ['--tag', 'economy'],
                env,
                deps(client, (l) => lines.push(l))
            )
        ).toBe(0)
        expect(calls).toHaveLength(2)
        expect(calls.map((c) => Object.keys(c.questions))).toEqual([['economy'], ['economy']])
        expect(lines.join('\n')).toContain(
            [
                '## tag economy — Economy',
                '',
                '| post | title | publishDate | p | current tags |',
                '| --- | --- | --- | --- | --- |',
                '| post:3 | fi post 3 | 2026-03-01 | 0.80 |  |',
                '',
                'already tagged: 1 of 3 posts',
            ].join('\n')
        )
        expect(readReceipts(receipts)!.tags).toEqual({
            economy: {
                checkedAt: '2026-09-23',
                contentHash: hashTagFile('economy', tagsDir),
                model: 'typesafe/jev-1.13-20260917',
            },
        })
    })

    it('retro-scan refuses an unknown or unregistered tag and prefixes an editorial one with a notice', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0)
        const d = deps(client, (l) => lines.push(l))

        expect(await runTags(['--tag', 'no-such-tag'], env, d)).toBe(2)
        expect(await runTags(['--tag', 'orphan'], env, d)).toBe(2)
        expect(lines).toEqual(['tag no-such-tag not found', 'tag orphan is not registered in src/content/tags.ts'])
        expect(calls).toEqual([])
        lines.length = 0
        expect(await runTags(['--tag', 'municipal-elections-2025'], env, d)).toBe(0)
        expect(lines[2]).toMatch(/^notice: municipal-elections-2025 is an editorial tag/)
        expect(readReceipts(receipts)!.tags['municipal-elections-2025']).toBeDefined()
    })

    it('reports a malformed tag file and exits 1', async () => {
        const broken = join(root, 'broken-tags')
        mkdirSync(broken)
        writeFileSync(join(broken, 'bad.ts'), 'export const nothing = 1\n')
        const lines: string[] = []

        expect(
            await runTags(['post', '1'], env, {
                ...deps(fakeClient(() => 0).client, (l) => lines.push(l)),
                tagsDir: broken,
            })
        ).toBe(1)
        expect(lines).toEqual(['tag files: bad.ts: no LocalTag export'])
    })

    it('--changed-since runs posts then tags from git, and reports no changes', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0.9)
        const git = (args: string[]): string => {
            expect(args).toEqual(['diff', '--name-only', 'main...HEAD', '--', 'src/content/posts', 'src/content/tags'])

            return 'src/content/posts/2/fi.mdx\nsrc/content/posts/99/fi.mdx\nsrc/content/tags/nature.ts\nsrc/content/tags/types.ts\n'
        }

        expect(await runTags(['--changed-since', 'main'], env, { ...deps(client, (l) => lines.push(l)), git })).toBe(0)
        expect(lines[0]).toBe('## post:2 — fi post 2')
        expect(lines).toContain('## tag nature — Nature')
        expect(calls).toHaveLength(1 + 2)
        expect(readReceipts(receipts)!.tags.nature).toBeDefined()
        lines.length = 0
        expect(
            await runTags(['--changed-since', 'main'], env, { ...deps(client, (l) => lines.push(l)), git: () => '\n' })
        ).toBe(0)
        expect(lines).toEqual(['no content changes'])
    })

    it('unknown post exits 2; a failed request prints the completed sections, writes --out and keeps receipts', async () => {
        const lines: string[] = []
        const out = join(root, 'out.md')
        const { client } = fakeClient(() => 0.9, 'post 3')
        const d = {
            ...deps(client, (l) => lines.push(l)),
            git: () => 'src/content/posts/1/fi.mdx\nsrc/content/tags/freedom.ts\n',
        }
        rmSync(receipts, { force: true })

        expect(await runTags(['post', '999'], env, d)).toBe(2)
        expect(lines).toEqual(['post:999 not found'])
        lines.length = 0
        expect(await runTags(['--changed-since', 'main', '--out', out], env, d)).toBe(1)
        expect(lines[0]).toBe('## post:1 — fi post 1')
        expect(lines.at(-1)).toBe('failed at post:3: boom')
        expect(readFileSync(out, 'utf8')).toBe(`${lines.join('\n')}\n`)
        expect(readReceipts(receipts)).toBeNull()
    })
})
