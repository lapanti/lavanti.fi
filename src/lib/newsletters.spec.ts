import type { CollectionEntry } from 'astro:content'

import { describe, expect, it } from 'vitest'

import { decorateNewsletter, filterNewsletters, type Newsletter } from './newsletters'

const makeEntry = (
    overrides: Partial<CollectionEntry<'newsletters'>['data']> = {},
    body = ''
): CollectionEntry<'newsletters'> =>
    ({
        body,
        collection: 'newsletters',
        data: {
            description: 'description',
            id: 1,
            lang: 'fi',
            pageTitle: 'Page title',
            publishDate: '2026-04-25',
            sent: '2026-03-14',
            slug: 'slug',
            title: 'Title',
            updatedDate: '2026-04-25',
            ...overrides,
        },
        id: 'slug',
    }) as CollectionEntry<'newsletters'>

describe('decorateNewsletter', () => {
    it('builds the localized URL from lang, id and slug', () => {
        expect(decorateNewsletter(makeEntry({ id: 3, lang: 'sv', slug: 'ai' })).url).toBe('/sv/nyhetsbrev/3/ai/')
    })

    it('counts words after stripping MDX import/export lines', () => {
        const body = "import X from './X.astro'\nexport const components = { a: X }\n\none two three four five"
        const decorated = decorateNewsletter(makeEntry({}, body))
        expect(decorated.wordCount).toBe(5)
        expect(decorated.readingTime).toBe(1)
    })

    it('keeps the entry for rendering', () => {
        const entry = makeEntry()
        expect(decorateNewsletter(entry).entry).toBe(entry)
    })
})

describe('filterNewsletters', () => {
    const make = (overrides: Partial<Newsletter>): Newsletter =>
        ({ ...decorateNewsletter(makeEntry()), ...overrides }) as Newsletter
    const issues = [
        make({ id: 3, lang: 'fi' }),
        make({ id: 2, lang: 'fi' }),
        make({ id: 2, lang: 'en' }),
        make({ id: 1, lang: 'fi' }),
    ]

    it('filters by language, keeping order', () => {
        expect(filterNewsletters(issues, { lang: 'fi' }).map((n) => n.id)).toEqual([3, 2, 1])
    })

    it('treats limit 0 as none, not as unlimited', () => {
        expect(filterNewsletters(issues, { lang: 'fi', limit: 0 })).toEqual([])
    })

    it('excludes the current issue and applies the limit', () => {
        expect(filterNewsletters(issues, { excludeId: 3, lang: 'fi', limit: 1 }).map((n) => n.id)).toEqual([2])
    })

    it('puts ranked ids first, then newest-first, before the limit', () => {
        expect(filterNewsletters(issues, { lang: 'fi', rankedIds: [1, 7] }).map((n) => n.id)).toEqual([1, 3, 2])
        expect(
            filterNewsletters(issues, { excludeId: 1, lang: 'fi', limit: 1, rankedIds: [2] }).map((n) => n.id)
        ).toEqual([2])
    })
})
