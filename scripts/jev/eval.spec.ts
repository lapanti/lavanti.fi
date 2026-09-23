import type { DocKey, Document } from './corpus'

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { CHOICE_OPTION_MAX, type JevClient, mapConcurrent, type QuestionSpec, type SystemOneResponse } from './client'
import {
    formatTable,
    linkMetrics,
    type LinkRow,
    loadTagLabels,
    prf,
    runCli,
    tagMetrics,
    tagQuestions,
    type TagRow,
} from './eval'
import { linkOptions, linkTargets, NONE, rankedOptions, topChoice } from './links'

const doc = (key: DocKey, title: string): Document => ({
    description: `${title} description`,
    h2s: [],
    id: Number(key.split(':')[1]),
    key,
    kind: key.startsWith('post') ? 'post' : 'newsletter',
    lang: 'en',
    lead: '',
    paragraphs: [],
    publishDate: '2026-01-01',
    slug: 'slug',
    sourceHash: 'h',
    tags: [],
    title,
})

describe('tagQuestions', () => {
    it('asks one English noul per tag from the registry', async () => {
        const labels = await loadTagLabels()
        const questions = tagQuestions(labels)

        expect(labels.length).toBe(34)
        expect(Object.keys(questions)).toHaveLength(34)
        expect(questions.economy).toEqual({
            instructions: expect.stringMatching(/^This article belongs in the category 'Economy': Finland/),
            type: 'noul',
        })
    })
})

describe('linkTargets', () => {
    const known = new Set<DocKey>(['post:2', 'post:7', 'newsletter:3'])

    it('maps blog and newsletter URLs in any locale to known keys, once each', () => {
        const paragraph =
            'See [a](/fi/blog/2/x/), [b](/en/newsletter/3/y/), [c](/sv/nyhetsbrev/3/z/), [d](/fi/uutiskirje/3/w/) and [a again](/en/blog/2/x/).'

        expect(linkTargets(paragraph, known)).toEqual(['post:2', 'newsletter:3'])
    })

    it('ignores unknown ids, other pages and external links', () => {
        const paragraph =
            '[gone](/fi/blog/99/x/) [about](/fi/about/) [cat](/fi/kategoria/talous/) [ext](https://example.com/fi/blog/2/)'

        expect(linkTargets(paragraph, known)).toEqual([])
    })
})

describe('linkOptions', () => {
    it('labels every other document and appends none', () => {
        const english = [doc('post:1', 'One'), doc('post:2', 'Two'), doc('newsletter:3', 'Three')]
        const criteria = linkOptions(english, 'post:1')

        expect(Object.keys(criteria)).toEqual(['post:2', 'newsletter:3', NONE])
        expect(criteria['post:2']).toBe('Two — Two description')
    })

    it('throws before any request when the corpus exceeds the option cap', () => {
        const english = Array.from({ length: CHOICE_OPTION_MAX + 1 }, (_unused, i) => doc(`post:${i}`, `P${i}`))

        expect(() => linkOptions(english, 'post:0')).toThrow('CHOICE_OPTION_MAX=255')
    })
})

describe('ranking helpers', () => {
    it('ranks non-none options by probability and picks the overall top', () => {
        const probabilities = { [NONE]: 0.3, a: 0.2, b: 0.5 }

        expect(rankedOptions(probabilities)).toEqual(['b', 'a'])
        expect(topChoice(probabilities)).toBe('b')
        expect(topChoice({ [NONE]: 0.9, a: 0.1 })).toBe(NONE)
    })

    it('computes precision, recall and F1 with zero guards', () => {
        expect(prf(2, 1, 2)).toEqual({ f1: 0.5714285714285715, precision: 2 / 3, recall: 0.5 })
        expect(prf(0, 0, 0)).toEqual({ f1: 0, precision: 0, recall: 0 })
    })
})

describe('tagMetrics', () => {
    const labels = ['economy', 'freedom', 'culture-and-education', 'rare']
    const rows: TagRow[] = [
        {
            expected: ['economy', 'freedom'],
            id: 50,
            key: 'post:50' as const,
            probabilities: { economy: 0.9, freedom: 0.6, rare: 0.8 },
        },
        { expected: ['economy'], id: 51, key: 'post:51' as const, probabilities: { economy: 0.75, freedom: 0.2 } },
        { expected: ['culture-and-education'], id: 10, key: 'post:10' as const, probabilities: { economy: 0.55 } },
    ]

    it('reports micro and macro F1 per threshold, a frequency baseline and pillar accuracy', () => {
        const { metrics, perTag } = tagMetrics(rows, labels)

        // @0.5: predicted {economy,freedom,rare}, {economy}, {economy} → tp 3, fp 2, fn 1
        expect(metrics['microPrecision@0.5']).toBeCloseTo(0.6)
        expect(metrics['microRecall@0.5']).toBeCloseTo(0.75)
        expect(metrics['microF1@0.5']).toBeCloseTo(2 / 3)
        // @0.7: predicted {economy,rare}, {economy}, {} → tp 2, fp 1, fn 2
        expect(metrics['microF1@0.7']).toBeCloseTo(4 / 7)
        // macro over labels with support: economy f1 0.8, freedom 1, culture 0 → 0.6
        expect(metrics['macroF1@0.5']).toBeCloseTo(0.6)
        // baseline predicts the 3 most common tags for every post: tp 4, fp 5, fn 0
        expect(metrics.baselineF1).toBeCloseTo(8 / 13)
        // pillar posts are ids ≥ 43: post 50 pillar set {economy,freedom} matches; post 51 {economy} matches
        expect(metrics.pillarPosts).toBe(2)
        expect(metrics.pillarAccuracy).toBe(1)
        expect(perTag[0]).toEqual({ id: 'economy', precision: 2 / 3, recall: 1, support: 2 })
        expect(perTag.map((t) => t.id)).toEqual(['economy', 'culture-and-education', 'freedom', 'rare'])
    })
})

describe('linkMetrics', () => {
    it('scores hit@k over linked paragraphs, abstain rate over unlinked ones and a popularity baseline', () => {
        const rows: LinkRow[] = [
            {
                expected: ['post:2' as const],
                key: 'post:1' as const,
                paragraph: 0,
                probabilities: { [NONE]: 0.1, 'post:2': 0.6, 'post:3': 0.3 },
            },
            {
                expected: ['post:3' as const],
                key: 'post:1' as const,
                paragraph: 1,
                probabilities: { [NONE]: 0.1, 'post:2': 0.5, 'post:3': 0.4 },
            },
            {
                expected: ['post:9' as const],
                key: 'post:1' as const,
                paragraph: 2,
                probabilities: { [NONE]: 0.1, 'post:2': 0.5, 'post:3': 0.4 },
            },
            { expected: [], key: 'post:1' as const, paragraph: 3, probabilities: { [NONE]: 0.7, 'post:2': 0.3 } },
            { expected: [], key: 'post:1' as const, paragraph: 4, probabilities: { [NONE]: 0.2, 'post:2': 0.8 } },
        ]
        const metrics = linkMetrics(rows)

        expect(metrics['hit@1']).toBeCloseTo(1 / 3)
        expect(metrics['hit@3']).toBeCloseTo(2 / 3)
        expect(metrics.abstainRate).toBeCloseTo(0.5)
        expect(metrics['baselineHit@3']).toBe(1)
        expect(metrics.linkedParagraphs).toBe(3)
        expect(metrics.unlinkedParagraphs).toBe(2)
    })
})

describe('mapConcurrent', () => {
    it('preserves order and caps in-flight work', async () => {
        let inFlight = 0
        let peak = 0
        const result = await mapConcurrent([30, 10, 20], 2, async (ms) => {
            inFlight++
            peak = Math.max(peak, inFlight)
            await new Promise((resolve) => setTimeout(resolve, ms))
            inFlight--

            return ms * 2
        })

        expect(result).toEqual([60, 20, 40])
        expect(peak).toBe(2)
    })

    it('stops handing out work after the first failure and rejects with that error', async () => {
        const started: number[] = []
        const run = mapConcurrent([1, 2, 3, 4, 5, 6], 1, async (n) => {
            started.push(n)
            if (n === 2) throw new Error('boom')

            return n
        })

        await expect(run).rejects.toThrow('boom')
        expect(started).toEqual([1, 2])
    })
})

describe('formatTable', () => {
    it('pads columns', () => {
        expect(
            formatTable([
                ['a', 'bbb'],
                ['cc', 'd'],
            ])
        ).toBe('a   bbb\ncc  d')
    })
})

describe('runCli', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-eval-'))
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    const write = (id: number, tags: string[], en: string, fi: string): void => {
        const dir = join(root, 'posts', String(id))
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate: '2026-01-01', tags }))
        writeFileSync(join(dir, 'en.mdx'), `---\ntitle: 'Post ${id}'\ndescription: 'About ${id}'\n---\n\n${en}\n`)
        writeFileSync(
            join(dir, 'fi.mdx'),
            `---\ntitle: 'Kirjoitus ${id}'\ndescription: 'Aiheesta ${id}'\n---\n\n${fi}\n`
        )
        writeFileSync(join(dir, 'sv.mdx'), `---\ntitle: 'Inlägg ${id}'\ndescription: 'Om ${id}'\n---\n\n${en}\n`)
    }
    write(
        50,
        ['economy'],
        'Money talk. See [two](/en/blog/51/x/).\n\nNothing to link here.',
        'Rahapuhe. Katso [kaksi](/fi/blog/51/x/).\n\nEi linkkejä.'
    )
    write(51, ['freedom'], 'Liberty.', 'Vapaus.')

    const fakeClient = (): {
        calls: Array<{ questions: Record<string, QuestionSpec>; state: unknown }>
        client: JevClient
    } => {
        const calls: Array<{ questions: Record<string, QuestionSpec>; state: unknown }> = []
        const client: JevClient = {
            ask: async (state, questions): Promise<SystemOneResponse> => {
                calls.push({ questions, state })
                const answers: SystemOneResponse['answers'] = {}
                for (const [name, q] of Object.entries(questions)) {
                    if (q.type === 'noul') answers[name] = { noul: name === 'economy' ? 0.9 : 0.1, type: 'noul' }
                    if (q.type === 'choice') {
                        const keys = Object.keys(q.criteria)
                        const probabilities = Object.fromEntries(
                            keys.map((k) => [k, k === NONE ? 0.2 : 0.8 / (keys.length - 1)])
                        )
                        answers[name] = { choice: keys[0], confidence: 0.8, probabilities, type: 'choice' }
                    }
                }

                return { answers, id: 'r', model: 'fake', usage: { cost: 0.001, input_tokens: 100, output_tokens: 1 } }
            },
            provider: { apiKey: 'k', baseUrl: 'http://x', model: 'fake', name: 'openrouter' },
        }

        return { calls, client }
    }

    it('skips with the notice and no request when no key is set', async () => {
        const lines: string[] = []
        const code = await runCli([], {}, { log: (l) => lines.push(l), root })

        expect(code).toBe(0)
        expect(lines).toEqual(['skipped: no OPENROUTER_API_KEY or TYPESAFE_API_KEY'])
    })

    it('rejects unknown tasks and langs', async () => {
        const lines: string[] = []

        expect(await runCli(['--task', 'faq'], { OPENROUTER_API_KEY: 'k' }, { log: (l) => lines.push(l), root })).toBe(
            2
        )
        expect(lines[0]).toContain('faq')
    })

    it('rejects a non-numeric concurrency or a zero limit before touching the network', async () => {
        const lines: string[] = []
        const env = { OPENROUTER_API_KEY: 'k' }

        expect(await runCli(['--concurrency', 'abc'], env, { log: (l) => lines.push(l), root })).toBe(2)
        expect(await runCli(['--limit', '0'], env, { log: (l) => lines.push(l), root })).toBe(2)
        expect(lines).toHaveLength(2)
    })

    it('runs both tasks for en and fi by default, keeps option labels English and writes the report', async () => {
        const { calls, client } = fakeClient()
        const lines: string[] = []
        const out = join(root, 'report.json')
        const code = await runCli(['--out', out, '--concurrency', '1'], {}, { client, log: (l) => lines.push(l), root })

        expect(code).toBe(0)
        // tags: 2 posts × 2 langs; links: 3 paragraphs × 2 langs
        expect(calls).toHaveLength(4 + 6)
        const fiLink = calls.find(
            (c) =>
                typeof c.state === 'object' &&
                c.state !== null &&
                'paragraph' in c.state &&
                String((c.state as { paragraph: string }).paragraph).startsWith('Rahapuhe')
        )

        expect(fiLink?.state).toEqual({ paragraph: 'Rahapuhe. Katso kaksi.', title: 'Kirjoitus 50' })
        expect(fiLink?.questions.link_target).toMatchObject({
            criteria: { none: expect.any(String), 'post:51': 'Post 51 — About 51' },
            type: 'choice',
        })
        const reports = JSON.parse(readFileSync(out, 'utf8')) as Array<{
            lang: string
            metrics: Record<string, number>
            task: string
        }>

        expect(reports.map((r) => `${r.task}/${r.lang}`)).toEqual(['tags/en', 'tags/fi', 'links/en', 'links/fi'])
        expect(reports[0].metrics['microRecall@0.5']).toBeCloseTo(0.5)
        expect(reports[2].metrics.linkedParagraphs).toBe(1)
        expect(lines.at(-1)).toContain('cost USD')
    })
})
