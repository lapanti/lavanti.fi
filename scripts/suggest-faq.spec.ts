import type { JevClient, QuestionSpec, SystemOneResponse } from './jev/client'
import type { RelatedFile } from './jev/related'

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { runFaq, USAGE } from './suggest-faq'

const writeDoc = (
    root: string,
    kind: 'newsletters' | 'posts',
    id: number,
    body: string,
    faq: string[] = [],
    lang = 'fi'
): void => {
    const dir = join(root, kind, String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate: '2026-01-01', tags: ['economy'] }))
    const faqBlock = faq.length > 0 ? `faq:\n${faq.map((q) => `  - q: '${q}'\n    a: 'vastaus'`).join('\n')}\n` : ''
    for (const l of ['en', 'fi', 'sv']) {
        const text = l === lang ? body : `Other locale ${l}.`
        writeFileSync(
            join(dir, `${l}.mdx`),
            `---\ntitle: '${l} ${kind} ${id}'\nslug: 's${id}'\ndescription: 'about ${id}'\n${l === lang ? faqBlock : ''}---\n\n${text}\n`
        )
    }
}

interface Call {
    questions: Record<string, QuestionSpec>
    state: unknown
}

/** noul from the question text, score fixed per question text; fails on a state containing failOn. */
const fakeClient = (
    noul: (instructions: string) => number,
    usefulness: (instructions: string) => Record<string, number> = () => ({ '3': 1 }),
    failOn?: string
): { calls: Call[]; client: JevClient } => {
    const calls: Call[] = []
    const client: JevClient = {
        ask: async (state, questions): Promise<SystemOneResponse> => {
            calls.push({ questions, state })
            if (failOn && JSON.stringify(state).includes(failOn)) throw new Error('boom')
            const answers: SystemOneResponse['answers'] = {}
            for (const [name, q] of Object.entries(questions)) {
                if (q.type === 'noul') answers[name] = { noul: noul(q.instructions), type: 'noul' }
                if (q.type === 'score') {
                    const probabilities = usefulness(q.instructions)
                    answers[name] = {
                        confidence: 0.5,
                        probabilities,
                        score: Object.keys(probabilities)[0],
                        type: 'score',
                    }
                }
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

describe('runFaq', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-suggest-faq-'))
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    writeDoc(
        root,
        'posts',
        1,
        'Johdanto [linkillä](/x/).\n\n## Miksi eVaka säästää rahaa?\n\nKappale.\n\n## Sivistys\n\n### Onko kirjasto tärkeä?\n\nLisää.',
        ['Mitä eVaka on?']
    )
    writeDoc(root, 'posts', 2, '## Mitä eVaka on?\n\nx\n\n## Kuka maksaa?\n\ny')
    writeDoc(root, 'posts', 3, '## Miksi eVaka säästää rahaa?\n\nx\n\n### Milloin?\n\ny')
    writeDoc(root, 'posts', 4, 'Ei otsikoita.')
    writeDoc(root, 'posts', 5, 'Ei otsikoita.', ['Vanha?', 'Toinen vanha?'])
    writeDoc(root, 'newsletters', 6, '## Vad betyder det?\n\nx')
    writeDoc(root, 'posts', 7, '## Why in English?\n\nx', ['Old English?'], 'en')
    const related: RelatedFile = {
        candidateSetHash: 'h',
        entries: {
            'post:1': {
                ranked: [
                    { key: 'post:3', p: 0.6 },
                    { key: 'post:2', p: 0.3 },
                    { key: 'post:99', p: 0.1 },
                ],
                sourceHash: 's',
            },
            'post:5': { ranked: [{ key: 'post:4', p: 1 }], sourceHash: 's' },
        },
        generatedAt: '2026-09-23',
        model: 'typesafe/jev-1.13',
    }
    const env = { OPENROUTER_API_KEY: 'k' }
    const deps = (client: JevClient, lines: string[]) => ({ client, log: (l: string) => lines.push(l), related, root })

    it('skips without a key and rejects bad arguments before any request', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0)

        expect(await runFaq(['post', '1'], {}, { log: (l) => lines.push(l), related, root })).toBe(0)
        expect(lines).toEqual(['skipped: no OPENROUTER_API_KEY or TYPESAFE_API_KEY'])
        for (const argv of [
            [],
            ['tag', '1'],
            ['post', 'x'],
            ['post', '1', '--lang', 'de'],
            ['post', '1', '--answerable', '2'],
            ['post', '1', '--doubtful', '0'],
        ]) {
            lines.length = 0
            expect(await runFaq(argv, env, deps(client, lines))).toBe(2)
            expect(lines).toEqual([USAGE])
        }
        lines.length = 0
        expect(await runFaq(['post', '999'], env, deps(client, lines))).toBe(2)
        expect(lines).toEqual(['post:999 not found'])
        expect(calls).toEqual([])
    })

    it('harvests own and neighbour questions, sends one request with the prose, ranks and flags', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(
            (q) => (q.includes('Onko kirjasto') ? 0.5 : q.includes('Mitä eVaka on') ? 0.1 : 0.9),
            (q) => (q.includes('Kuka maksaa') ? { '4': 0.5, '5': 0.5 } : { '2': 0.5, '3': 0.5 })
        )

        expect(await runFaq(['post', '1'], env, deps(client, lines))).toBe(0)
        expect(calls).toHaveLength(1)
        expect(calls[0].state).toEqual({
            body: 'Johdanto linkillä.\n\nKappale.\n\nLisää.',
            description: 'about 1',
            headings: 'Miksi eVaka säästää rahaa?\nSivistys\nOnko kirjasto tärkeä?',
            title: 'fi posts 1',
        })
        expect(Object.keys(calls[0].questions)).toEqual(['a0', 'u0', 'a1', 'u1', 'a2', 'u2', 'a3', 'u3', 'f0'])
        expect(calls[0].questions.a2).toEqual({
            instructions: 'The article answers this question directly: Milloin?',
            type: 'noul',
        })
        expect(lines.join('\n')).toBe(
            [
                '## post:1 — fi posts 1',
                '',
                '### candidates',
                '',
                '| question | source | answers | usefulness |',
                '| --- | --- | --- | --- |',
                '| Kuka maksaa? | post:2 | 0.90 | 4.5 |',
                '| Miksi eVaka säästää rahaa? | own | 0.90 | 2.5 |',
                '| Milloin? | post:3 | 0.90 | 2.5 |',
                '',
                '### doubtful',
                '',
                '| question | answers |',
                '| --- | --- |',
                '| Mitä eVaka on? | 0.10 |',
                '',
                'faq entries: 1 (FAQPage JSON-LD needs 2)',
                '',
            ].join('\n')
        )
    })

    it('honours --lang and the thresholds', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0.6)

        expect(
            await runFaq(
                ['post', '7', '--lang', 'en', '--answerable', '0.5', '--doubtful', '0.7'],
                env,
                deps(client, lines)
            )
        ).toBe(0)
        expect(calls[0].state).toMatchObject({ headings: 'Why in English?', title: 'en posts 7' })
        const text = lines.join('\n')
        expect(text).toContain('| Why in English? | own | 0.60 | 3.0 |')
        expect(text).toContain('| Old English? | 0.60 |')
        expect(text).toContain('no related entry for post:7: own headings only')
    })

    it('sends nothing for a document without candidates or faq, but still checks an existing faq', async () => {
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0.2)

        expect(await runFaq(['post', '4', 'post', '5', 'newsletter', '6'], env, deps(client, lines))).toBe(0)
        expect(calls).toHaveLength(2)
        expect(Object.keys(calls[0].questions)).toEqual(['f0', 'f1'])
        const text = lines.join('\n')
        expect(text).toContain('\nno candidates\n')
        expect(text).toContain('no candidates above 0.70')
        expect(text).toContain('| Toinen vanha? | 0.20 |')
        expect(text).toContain('## newsletter:6 — fi newsletters 6')
        expect(text.split('\n').filter((l) => l.startsWith('faq entries'))).toEqual([
            'faq entries: 0 (FAQPage JSON-LD needs 2)',
            'faq entries: 2 (FAQPage JSON-LD needs 2)',
            'faq entries: 0 (FAQPage JSON-LD needs 2)',
        ])
    })

    it('chunks a long question list and merges the answers', async () => {
        const many = Array.from({ length: 30 }, (_unused, i) => `## Miksi ${i}?\n\nx`).join('\n\n')
        writeDoc(root, 'posts', 8, many)
        const lines: string[] = []
        const { calls, client } = fakeClient(() => 0.9)

        expect(await runFaq(['post', '8'], env, deps(client, lines))).toBe(0)
        expect(calls.map((c) => Object.keys(c.questions).length)).toEqual([40, 20])
        expect(
            lines
                .join('\n')
                .split('\n')
                .filter((l) => l.startsWith('| Miksi '))
        ).toHaveLength(30)
    })

    it('a failed request prints the completed sections, then the failure, and writes --out', async () => {
        const out = join(root, 'out.md')
        const lines: string[] = []
        const { client } = fakeClient(() => 0.9, undefined, 'fi posts 2')

        expect(await runFaq(['post', '3', 'post', '2', '--out', out], env, deps(client, lines))).toBe(1)
        expect(lines[0]).toBe('## post:3 — fi posts 3')
        expect(lines.at(-1)).toBe('failed at post:2: boom')
        expect(readFileSync(out, 'utf8')).toBe(`${lines.join('\n')}\n`)
    })

    it('a wrongly typed answer is a failed request', async () => {
        const lines: string[] = []
        const client: JevClient = {
            ask: async () => ({ answers: {}, id: 'r', model: 'm', usage: { input_tokens: 1, output_tokens: 1 } }),
            provider: { apiKey: 'k', baseUrl: 'http://x', model: 'jev-1.13', name: 'openrouter' },
        }

        expect(await runFaq(['post', '2'], env, deps(client, lines))).toBe(1)
        expect(lines.at(-1)).toBe('failed at post:2: expected a noul answer for a0, got nothing')
    })
})
