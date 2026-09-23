import type { DocKey, Document } from './corpus'

import { describe, expect, it } from 'vitest'

import {
    alreadyLinked,
    BACKLINK_QUESTIONS_MAX,
    backlinkQuestions,
    docsFromPaths,
    doubtfulRows,
    linkCount,
    linkOptions,
    linkTargets,
    NONE,
    paragraphState,
    rankedOptions,
    renderTable,
    suggestionRows,
    topChoice,
    urlFor,
} from './links'

const doc = (key: DocKey, overrides: Partial<Document> = {}): Document => ({
    body: '',
    contentHash: 'c',
    description: `${key} description`,
    h2s: [],
    id: Number(key.split(':')[1]),
    key,
    kind: key.startsWith('post') ? 'post' : 'newsletter',
    lang: 'fi',
    lead: '',
    paragraphs: [],
    publishDate: '2026-01-01',
    slug: `slug-${key.split(':')[1]}`,
    sourceHash: 'h',
    tags: [],
    title: `Title ${key}`,
    ...overrides,
})

const known = new Set<DocKey>(['post:2', 'post:7', 'newsletter:3'])

describe('lifted helpers', () => {
    it('finds link targets, builds options with none, ranks and picks the top', () => {
        expect(linkTargets('[a](/fi/blog/2/x/) [b](/sv/nyhetsbrev/3/y/) [c](/fi/blog/99/z/)', known)).toEqual([
            'post:2',
            'newsletter:3',
        ])
        expect(
            Object.keys(linkOptions([doc('post:1', { lang: 'en' }), doc('post:2', { lang: 'en' })], 'post:1'))
        ).toEqual(['post:2', NONE])
        expect(rankedOptions({ [NONE]: 0.5, a: 0.2, b: 0.3 })).toEqual(['b', 'a'])
        expect(topChoice({ [NONE]: 0.5, a: 0.2 })).toBe(NONE)
    })
})

describe('paragraphState, urlFor, alreadyLinked, linkCount', () => {
    it('strips markup for the state and keeps the localized title', () => {
        expect(paragraphState(doc('post:1'), 'See **this** and [that](/fi/blog/2/x/).')).toEqual({
            paragraph: 'See this and that.',
            title: 'Title post:1',
        })
    })

    it('builds canonical urls per kind and locale and refuses an empty slug', () => {
        expect(urlFor(doc('post:57'))).toBe('/fi/blog/57/slug-57/')
        expect(urlFor(doc('newsletter:2', { lang: 'sv' }))).toBe('/sv/nyhetsbrev/2/slug-2/')
        expect(() => urlFor(doc('post:1', { slug: '' }))).toThrow('post:1 has no slug')
    })

    it('collects every corpus target linked anywhere in the document', () => {
        const d = doc('post:1', {
            body: '[a](/fi/blog/2/x/)\n\nplain\n\n<Aside>[b](/en/newsletter/3/y/) [a](/fi/blog/2/x/)</Aside>',
            paragraphs: ['[a](/fi/blog/2/x/)', 'plain'],
        })

        expect([...alreadyLinked(d, known)]).toEqual(['post:2', 'newsletter:3'])
    })

    it('counts links the way content.sh does: every [text](/path) in the body', () => {
        const d = doc('post:1', {
            body: '## H\n\n[a](/fi/blog/2/x/) and [b](/fi/about/)\n\n- [c](/fi/x/)\n\n[ext](https://x.y/)',
        })

        expect(linkCount(d)).toBe(3)
    })
})

describe('suggestionRows and doubtfulRows', () => {
    const byKey = new Map<DocKey, Document>([
        ['post:2', doc('post:2')],
        ['post:7', doc('post:7')],
        ['newsletter:3', doc('newsletter:3')],
        ['post:9', doc('post:9')],
    ])

    it('returns the top three above the floor, marks strong rows, excludes self and linked, and carries none', () => {
        const probabilities = { [NONE]: 0.3, 'newsletter:3': 0.05, 'post:2': 0.4, 'post:7': 0.55, 'post:9': 0.12 }
        const rows = suggestionRows(4, 'Some **claim** here.', probabilities, {
            byKey,
            exclude: new Set<DocKey>(['post:2']),
            threshold: 0.5,
        })

        expect(rows).toEqual([
            {
                index: 4,
                key: 'post:7',
                none: 0.3,
                p: 0.55,
                starts: 'Some claim here.',
                strong: true,
                title: 'Title post:7',
                url: '/fi/blog/7/slug-7/',
            },
            {
                index: 4,
                key: 'post:9',
                none: 0.3,
                p: 0.12,
                starts: 'Some claim here.',
                strong: false,
                title: 'Title post:9',
                url: '/fi/blog/9/slug-9/',
            },
        ])
    })

    it('limits starts to eight words', () => {
        const rows = suggestionRows(
            0,
            'one two three four five six seven eight nine ten',
            { [NONE]: 0, 'post:7': 0.9 },
            {
                byKey,
                exclude: new Set(),
                threshold: 0.5,
            }
        )

        expect(rows[0].starts).toBe('one two three four five six seven eight…')
    })

    it('flags a current link whose option scores below the doubtful threshold', () => {
        const paragraph = 'See [a](/fi/blog/2/x/) and [b](/fi/blog/7/y/).'

        expect(doubtfulRows(2, paragraph, { [NONE]: 0.8, 'post:2': 0.1, 'post:7': 0.5 }, known)).toEqual([
            { current: 'post:2', index: 2, p: 0.1, starts: 'See a and b.' },
        ])
        expect(doubtfulRows(2, 'no links', { [NONE]: 1 }, known)).toEqual([])
    })
})

describe('backlinkQuestions', () => {
    it('wraps each paragraph in a noul and chunks at the maximum', () => {
        const paragraphs = Array.from({ length: BACKLINK_QUESTIONS_MAX + 5 }, (_unused, i) => `Paragraph **${i}**.`)
        const chunks = backlinkQuestions(paragraphs)

        expect(chunks).toHaveLength(2)
        expect(chunks[0].indexes).toHaveLength(BACKLINK_QUESTIONS_MAX)
        expect(chunks[1].indexes).toEqual([40, 41, 42, 43, 44])
        expect(chunks[1].questions.p40).toEqual({
            instructions: 'This paragraph makes a claim that the newsletter issue substantiates: Paragraph 40.',
            type: 'noul',
        })
    })
})

describe('docsFromPaths and renderTable', () => {
    it('extracts unique documents in path order', () => {
        expect(
            docsFromPaths([
                'src/content/posts/57/fi.mdx',
                'src/content/posts/57/meta.json',
                'src/content/newsletters/2/en.mdx',
                'src/content/tags/economy.ts',
                'src/content/posts/3/sv.mdx',
            ])
        ).toEqual([
            { id: 57, kind: 'post' },
            { id: 2, kind: 'newsletter' },
            { id: 3, kind: 'post' },
        ])
    })

    it('renders a Markdown table and escapes pipes', () => {
        expect(renderTable(['a', 'b'], [['1', 'x|y']])).toBe('| a | b |\n| --- | --- |\n| 1 | x\\|y |')
    })
})
