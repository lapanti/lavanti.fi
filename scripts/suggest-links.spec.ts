import type { JevClient, QuestionSpec, SystemOneResponse } from './jev/client'

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { runSuggest, USAGE } from './suggest-links'

const writeDoc = (
    root: string,
    kind: 'newsletters' | 'posts',
    id: number,
    bodies: Record<'en' | 'fi', string>
): void => {
    const dir = join(root, kind, String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate: '2026-01-01', tags: ['economy'] }))
    for (const lang of ['en', 'fi', 'sv'] as const) {
        const body = lang === 'sv' ? bodies.en : bodies[lang]
        writeFileSync(
            join(dir, `${lang}.mdx`),
            `---\ntitle: '${lang} ${kind} ${id}'\nslug: 's${id}'\ndescription: 'about ${id}'\n---\n\n${body}\n`
        )
    }
}

interface Call {
    questions: Record<string, QuestionSpec>
    state: unknown
}

/** choice: a fixed preference per option key; noul: p from the paragraph text. */
const fakeClient = (
    choice: (keys: string[]) => Record<string, number>,
    noul: (instructions: string) => number = () => 0,
    failOn?: string
): { calls: Call[]; client: JevClient } => {
    const calls: Call[] = []
    const client: JevClient = {
        ask: async (state, questions): Promise<SystemOneResponse> => {
            calls.push({ questions, state })
            const answers: SystemOneResponse['answers'] = {}
            for (const [name, q] of Object.entries(questions)) {
                if (q.type === 'choice') {
                    if (failOn && JSON.stringify(state).includes(failOn)) throw new Error('boom')
                    const probabilities = choice(Object.keys(q.criteria))
                    answers[name] = {
                        choice: Object.keys(probabilities)[0],
                        confidence: 0.9,
                        probabilities,
                        type: 'choice',
                    }
                }
                if (q.type === 'noul') answers[name] = { noul: noul(q.instructions), type: 'noul' }
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

describe('runSuggest', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-suggest-'))
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    writeDoc(root, 'posts', 1, {
        en: 'Claim about two. [already](/en/blog/3/s3/)\n\nNothing here.',
        fi: 'Väite kakkosesta. [jo](/fi/blog/3/s3/)\n\nEi mitään tässä.',
    })
    writeDoc(root, 'posts', 2, { en: 'Two.', fi: 'Kaksi.' })
    writeDoc(root, 'posts', 3, { en: 'Three.', fi: 'Kolme.' })
    writeDoc(root, 'newsletters', 4, { en: 'Issue four.', fi: 'Numero neljä.' })

    const preferTwo = (keys: string[]): Record<string, number> =>
        Object.fromEntries(
            keys.map((k) => [k, k === 'post:2' ? 0.7 : k === 'newsletter:4' ? 0.15 : k === 'post:3' ? 0.05 : 0.1])
        )

    it('exits 2 with usage on bad arguments and 0 with the notice without a key', async () => {
        const lines: string[] = []
        const log = (l: string): void => {
            lines.push(l)
        }
        const env = { OPENROUTER_API_KEY: 'k' }

        expect(await runSuggest(['post'], env, { log, root })).toBe(2)
        expect(await runSuggest(['page', '1'], env, { log, root })).toBe(2)
        expect(await runSuggest(['post', '1', '--lang', 'de'], env, { log, root })).toBe(2)
        expect(await runSuggest(['post', '1', '--threshold', '1.5'], env, { log, root })).toBe(2)
        expect(await runSuggest(['post', '1', '--concurrency', '0'], env, { log, root })).toBe(2)
        expect(await runSuggest(['--backlinks', 'post', '1'], env, { log, root })).toBe(2)
        expect(await runSuggest(['--backlinks', 'newsletter', '4', '--changed-since', 'x'], env, { log, root })).toBe(2)
        expect(lines.every((l) => l === USAGE)).toBe(true)
        expect(await runSuggest(['post', '1'], {}, { log, root })).toBe(0)
        expect(lines.at(-1)).toContain('skipped: no OPENROUTER_API_KEY')
    })

    it('exits 2 naming an unknown document before any request', async () => {
        const { calls, client } = fakeClient(preferTwo)
        const lines: string[] = []

        expect(await runSuggest(['post', '99'], {}, { client, log: (l) => lines.push(l), root })).toBe(2)
        expect(lines).toEqual(['post:99 not found'])
        expect(calls).toHaveLength(0)
    })

    it('suggests per paragraph in the source locale, skipping linked targets, with urls and the link budget', async () => {
        const { calls, client } = fakeClient(preferTwo)
        const lines: string[] = []
        const out = join(root, 'out.md')

        expect(await runSuggest(['post', '1', '--out', out], {}, { client, log: (l) => lines.push(l), root })).toBe(0)
        expect(calls).toHaveLength(2)
        expect(calls[0].state).toEqual({ paragraph: 'Väite kakkosesta. jo', title: 'fi posts 1' })
        const criteria = (calls[0].questions.link_target as Extract<QuestionSpec, { type: 'choice' }>).criteria

        expect(Object.keys(criteria)).toEqual(['newsletter:4', 'post:2', 'post:3', 'none'])
        expect(criteria['post:2']).toBe('en posts 2 — about 2')
        const text = lines.join('\n')

        expect(text).toContain('## post:1 — fi posts 1')
        expect(text).toContain('| 0 | Väite kakkosesta. jo | post:2 | fi posts 2 | /fi/blog/2/s2/ | ★ 0.70 | 0.10 |')
        expect(text).toContain(
            '| 0 | Väite kakkosesta. jo | newsletter:4 | fi newsletters 4 | /fi/uutiskirje/4/s4/ | 0.15 | 0.10 |'
        )
        expect(text).not.toContain('| post:3 | fi posts 3 |')
        expect(text).toContain('### doubtful')
        expect(text).toContain('| 0 | Väite kakkosesta. jo | post:3 | 0.05 |')
        expect(text).toContain('links now: 1 of 3–10')
        expect(readFileSync(out, 'utf8')).toBe(`${lines.join('\n')}\n`)
    })

    it('uses English paragraphs and urls with --lang en and handles several documents', async () => {
        const { calls, client } = fakeClient(preferTwo)
        const lines: string[] = []

        expect(
            await runSuggest(
                ['post', '1', 'newsletter', '4', '--lang', 'en'],
                {},
                { client, log: (l) => lines.push(l), root }
            )
        ).toBe(0)
        expect(calls[0].state).toEqual({ paragraph: 'Claim about two. already', title: 'en posts 1' })
        expect(lines.join('\n')).toContain('/en/blog/2/s2/')
        expect(lines.join('\n')).toContain('## newsletter:4 — en newsletters 4')
    })

    it('finds backlink candidates with the issue as state and paragraph nouls, listing posts already linking it', async () => {
        writeDoc(root, 'posts', 5, {
            en: 'Cites [issue](/en/newsletter/4/s4/).',
            fi: 'Viittaa [numeroon](/fi/uutiskirje/4/s4/).',
        })
        const noul = (instructions: string): number => (instructions.includes('Kaksi') ? 0.9 : 0.1)
        const { calls, client } = fakeClient(preferTwo, noul)
        const lines: string[] = []

        expect(
            await runSuggest(['--backlinks', 'newsletter', '4'], {}, { client, log: (l) => lines.push(l), root })
        ).toBe(0)
        expect(calls.every((c) => (c.state as { title: string }).title === 'en newsletters 4')).toBe(true)
        expect(calls.map((c) => Object.keys(c.questions).length)).toEqual([2, 1, 1])
        const text = lines.join('\n')

        expect(text).toContain('| post:2 | fi posts 2 | /fi/blog/2/s2/ | 0 | Kaksi. | 0.90 |')
        expect(text).not.toContain('| post:3 |')
        expect(text).toContain('- post:5 — fi posts 5')
        rmSync(join(root, 'posts', '5'), { force: true, recursive: true })
    })

    it('runs per-document mode for changed documents and skips ids without a directory', async () => {
        const { calls, client } = fakeClient(preferTwo)
        const lines: string[] = []
        const git = (): string =>
            'src/content/posts/2/fi.mdx\nsrc/content/posts/77/meta.json\nsrc/content/newsletters/4/en.mdx\n'

        expect(
            await runSuggest(['--changed-since', 'origin/main'], {}, { client, git, log: (l) => lines.push(l), root })
        ).toBe(0)
        expect(calls).toHaveLength(2)
        expect(lines.join('\n')).toContain('## post:2 — fi posts 2')
        expect(lines.join('\n')).toContain('## newsletter:4 — fi newsletters 4')
        const none: string[] = []

        expect(
            await runSuggest(
                ['--changed-since', 'origin/main'],
                {},
                { client, git: () => '\n', log: (l) => none.push(l), root }
            )
        ).toBe(0)
        expect(none).toEqual(['no content changes'])
    })

    it('prints the sections done so far and the failure, writes --out, and exits 1 on a failed request', async () => {
        const { client } = fakeClient(preferTwo, () => 0, 'Kolme')
        const lines: string[] = []
        const out = join(root, 'fail.md')

        expect(
            await runSuggest(['post', '2', 'post', '3', '--out', out], {}, { client, log: (l) => lines.push(l), root })
        ).toBe(1)
        expect(lines.join('\n')).toContain('## post:2 — fi posts 2')
        expect(lines.at(-1)).toBe('failed at post:3 paragraph 0: boom')
        expect(readFileSync(out, 'utf8')).toContain('failed at post:3 paragraph 0: boom')
    })
})
