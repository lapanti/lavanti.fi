import { describe, expect, it } from 'vitest'

import {
    bodyStats,
    buildAlternatesMap,
    byPublishDateThenId,
    filterExcerptPosts,
    type Post,
    sortByRelatedTags,
    stripImportsExports,
} from './posts'

/**
 * getCollection() cannot be exercised here: Astro's Content Layer data store is only
 * populated by a prior `astro dev`/`astro build`/`astro sync` run in the same process,
 * which a plain `vitest run` invocation does not trigger (known upstream limitation,
 * see withastro/astro#7051, #12836). So getAllPosts/getExcerptPosts/getPostAlternates
 * stay thin, untested wrappers — everything they delegate to is fixture-tested below,
 * and the real collection data is exercised by `npm run build` and the e2e suite.
 */
const makePost = (overrides: Partial<Post>): Post =>
    ({
        alt: 'alt text',
        description: 'description',
        entry: {} as Post['entry'],
        heroImage: 'hero',
        id: 1,
        lang: 'fi',
        pageTitle: 'Page title',
        publishDate: '2024-01-01',
        readingTime: 1,
        slug: 'slug',
        tags: [],
        title: 'Title',
        updatedDate: '2024-01-01',
        url: '/fi/blog/1/slug/',
        wordCount: 100,
        ...overrides,
    }) as Post

describe('stripImportsExports', () => {
    it('removes import lines', () => {
        expect(stripImportsExports("import H2 from '../../../components/H2.astro'\nbody text")).toBe('\nbody text')
    })

    it('removes the components export line', () => {
        expect(stripImportsExports('export const components = { h2: H2 }\nbody text')).toBe('\nbody text')
    })

    it('leaves body prose untouched', () => {
        expect(stripImportsExports('Just a paragraph with no imports.')).toBe('Just a paragraph with no imports.')
    })
})

describe('filterExcerptPosts', () => {
    const posts = [
        makePost({ id: 3, lang: 'fi', slug: 'c', tags: ['kirkkonummi'] }),
        makePost({ id: 2, lang: 'fi', slug: 'b', tags: ['digitalisation'] }),
        makePost({ id: 1, lang: 'fi', slug: 'a', tags: ['kirkkonummi', 'freedom'] }),
        makePost({ id: 4, lang: 'sv', slug: 'd', tags: ['kirkkonummi'] }),
    ]

    it('returns only posts for the given lang', () => {
        const results = filterExcerptPosts(posts, { lang: 'fi' })
        expect(results.every((p) => p.lang === 'fi')).toBe(true)
        expect(results).toHaveLength(3)
    })

    it('excludes the post whose slug matches currentSlug', () => {
        const results = filterExcerptPosts(posts, { currentSlug: 'a', lang: 'fi' })
        expect(results.find((p) => p.slug === 'a')).toBeUndefined()
        expect(results).toHaveLength(2)
    })

    it('filters by tag', () => {
        const results = filterExcerptPosts(posts, { lang: 'fi', tag: 'kirkkonummi' })
        expect(results.map((p) => p.id).toSorted()).toEqual([1, 3])
    })

    it('onlyIds restricts to the given ids', () => {
        const results = filterExcerptPosts(posts, { lang: 'fi', onlyIds: [1, 2] })
        expect(results.map((p) => p.id).toSorted()).toEqual([1, 2])
    })

    it('excludeIds removes the given ids', () => {
        const results = filterExcerptPosts(posts, { excludeIds: [1], lang: 'fi' })
        expect(results.map((p) => p.id).toSorted()).toEqual([2, 3])
    })

    it('onlyIds and excludeIds compose: excludeIds wins over onlyIds for overlap', () => {
        const results = filterExcerptPosts(posts, { excludeIds: [2], lang: 'fi', onlyIds: [1, 2] })
        expect(results.map((p) => p.id)).toEqual([1])
    })

    it('slices to the given limit', () => {
        const results = filterExcerptPosts(posts, { lang: 'fi', limit: 1 })
        expect(results).toHaveLength(1)
    })

    it('default ordering (no relatedTags) preserves input order', () => {
        const results = filterExcerptPosts(posts, { lang: 'fi' })
        expect(results.map((p) => p.id)).toEqual([3, 2, 1])
    })
})

describe('sortByRelatedTags', () => {
    const posts = [
        makePost({ id: 1, tags: ['kirkkonummi'] }),
        makePost({ id: 2, tags: ['kirkkonummi', 'freedom'] }),
        makePost({ id: 3, tags: ['digitalisation'] }),
    ]

    it('ranks posts by number of matching tags, highest first', () => {
        const results = sortByRelatedTags(posts, ['kirkkonummi', 'freedom'])
        expect(results.map((p) => p.id)).toEqual([2, 1, 3])
    })

    it('breaks ties by id descending', () => {
        const results = sortByRelatedTags(posts, [])
        expect(results.map((p) => p.id)).toEqual([3, 2, 1])
    })

    it('breaks equal-tag ties by publishDate descending before id', () => {
        // Lower id but later publishDate must sort first — the far-future-post case.
        const dated = [
            makePost({ id: 5, publishDate: '2026-01-01', tags: ['kirkkonummi'] }),
            makePost({ id: 6, publishDate: '2025-01-01', tags: ['kirkkonummi'] }),
        ]
        const results = sortByRelatedTags(dated, ['kirkkonummi'])
        expect(results.map((p) => p.id)).toEqual([5, 6])
    })
})

describe('buildAlternatesMap', () => {
    const posts = [
        makePost({ id: 10, lang: 'fi', slug: 'fi-slug', url: '/fi/blog/10/fi-slug/' }),
        makePost({ id: 10, lang: 'sv', slug: 'sv-slug', url: '/sv/blog/10/sv-slug/' }),
        makePost({ id: 10, lang: 'en', slug: 'en-slug', url: '/en/blog/10/en-slug/' }),
        makePost({ id: 11, lang: 'fi', slug: 'other', url: '/fi/blog/11/other/' }),
    ]

    it('returns a URL per locale for a known post id', () => {
        const alternates = buildAlternatesMap(posts, 10)
        expect(alternates).toEqual({
            en: '/en/blog/10/en-slug/',
            fi: '/fi/blog/10/fi-slug/',
            sv: '/sv/blog/10/sv-slug/',
        })
    })

    it('returns an empty object for an unknown post id', () => {
        const alternates = buildAlternatesMap(posts, 999999)
        expect(Object.keys(alternates)).toHaveLength(0)
    })
})

describe('byPublishDateThenId', () => {
    it('orders newest publishDate first', () => {
        const sorted = [
            { id: 1, publishDate: '2026-01-01' },
            { id: 2, publishDate: '2026-03-01' },
        ].toSorted(byPublishDateThenId)
        expect(sorted.map((e) => e.id)).toEqual([2, 1])
    })

    it('breaks a publishDate tie by descending id', () => {
        const sorted = [
            { id: 3, publishDate: '2026-01-01' },
            { id: 7, publishDate: '2026-01-01' },
        ].toSorted(byPublishDateThenId)
        expect(sorted.map((e) => e.id)).toEqual([7, 3])
    })
})

describe('bodyStats', () => {
    it('counts words after stripping MDX import/export lines and derives reading time', () => {
        const body =
            "import X from './X.astro'\nexport const components = { a: X }\n\n" + Array(201).fill('sana').join(' ')
        expect(bodyStats(body)).toEqual({ readingTime: 2, wordCount: 201 })
    })

    it('treats a missing body as empty', () => {
        expect(bodyStats(undefined)).toEqual({ readingTime: 0, wordCount: 0 })
    })
})
