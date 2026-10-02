import type { LocalTag } from '../../../content/tags'
import type * as Images from '../../../lib/images'

import { queryByText } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../../../tests/helpers'
import { economyTag } from '../../../content/tags/economy'

/* Loosely typed on purpose: each test returns only the post fields the route reads. */
type ExcerptQuery = { excludeIds?: number[]; lang: string; onlyIds?: number[]; rankedIds?: number[]; tag?: string }
const { getExcerptPosts } = vi.hoisted(() => ({
    getExcerptPosts: vi.fn<(q: ExcerptQuery) => Promise<unknown[]>>(async () => []),
}))
vi.mock('../../../lib/posts', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getExcerptPosts,
}))
vi.mock('../../../lib/images', async (importOriginal) => ({
    ...(await importOriginal<typeof Images>()),
    getHeroPreload: vi.fn(() => ({ imagesizes: '100vw', imagesrcset: 'hero.jpg 1x' })),
    getImage: vi.fn((slug: string) => ({ height: 1680, src: `https://lavanti.fi/images/${slug}`, width: 1680 })),
    getImageSrcset: vi.fn((slug: string) => ({
        height: 1680,
        src: `https://lavanti.fi/images/${slug}`,
        srcset: `https://lavanti.fi/images/${slug} 1680w`,
        width: 1680,
    })),
}))

const TagPage = (await import('./[tag].astro')).default

/* The real tag's copy, without the content fields each test sets for itself. */
const baseTag: LocalTag = { ...economyTag, faq: undefined, featured: undefined }

const fiOnly: LocalTag = {
    ...baseTag,
    faq: {
        fi: [
            { a: 'Koska talous rahoittaa hyvinvoinnin.', q: 'Miksi talous on vihreä kysymys?' },
            { a: 'Osaamisella ja tuottavuudella.', q: 'Miten Suomen talous kasvaa?' },
        ],
    },
}

const render = (tag: LocalTag, lang: 'en' | 'fi' | 'sv') =>
    renderAstroComponent(TagPage, { params: { lang }, props: { tag } })

const jsonLdTypes = (root: HTMLElement): string[] =>
    [...root.querySelectorAll('script[type="application/ld+json"]')].map(
        (s) => (JSON.parse(s.textContent ?? '{}') as { '@type': string })['@type']
    )

const collectionPage = (root: HTMLElement): Record<string, unknown> =>
    [...root.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => JSON.parse(s.textContent ?? '{}') as Record<string, unknown>)
        .find((node) => node['@type'] === 'CollectionPage')!

describe('category page JSON-LD', () => {
    it('carries the tag updatedDate as dateModified', async () => {
        const result = await render(baseTag, 'fi')

        expect(collectionPage(result).dateModified).toBe(economyTag.updatedDate)
    })

    it('lists the tag posts from the excerpt query as the ItemList and the tag as about', async () => {
        const posts = [
            { id: 2, tags: ['economy'], title: 'Toinen', url: '/fi/blog/2/toinen/' },
            { id: 1, tags: ['economy'], title: 'Ensimmäinen', url: '/fi/blog/1/ensimmainen/' },
        ]
        getExcerptPosts.mockImplementation(async (q: { rankedIds?: number[] }) => (q.rankedIds ? posts : []))
        const result = await render(baseTag, 'fi')
        getExcerptPosts.mockImplementation(async () => [])
        const page = collectionPage(result)

        expect(getExcerptPosts).toHaveBeenCalledWith({ lang: 'fi', rankedIds: [], tag: 'economy' })
        expect(page.about).toMatchObject({ '@type': 'DefinedTerm', name: economyTag.names.fi })
        expect(page.mainEntity).toMatchObject({
            itemListElement: [
                { name: 'Toinen', position: 1, url: 'https://example.com/fi/blog/2/toinen/' },
                { name: 'Ensimmäinen', position: 2, url: 'https://example.com/fi/blog/1/ensimmainen/' },
            ],
            numberOfItems: 2,
        })
    })
})

describe('category page featured posts', () => {
    it('renders a start-here list of the featured posts and leaves them out of the full list', async () => {
        getExcerptPosts.mockClear()
        const result = await render({ ...baseTag, featured: [7, 3] }, 'en')

        expect(queryByText(result, 'Start here')).not.toBeNull()
        const calls = getExcerptPosts.mock.calls.map(([q]) => q)
        expect(calls).toContainEqual(expect.objectContaining({ onlyIds: [7, 3], rankedIds: [7, 3], tag: 'economy' }))
        expect(calls).toContainEqual(expect.objectContaining({ excludeIds: [7, 3], tag: 'economy' }))
        expect(calls).toContainEqual({ lang: 'en', rankedIds: [7, 3], tag: 'economy' })
    })

    it('renders no start-here list without featured posts', async () => {
        const result = await render({ ...baseTag, featured: undefined }, 'en')

        expect(queryByText(result, 'Start here')).toBeNull()
    })
})

describe('category page related topics', () => {
    it('links the sibling categories that share posts with the tag', async () => {
        getExcerptPosts.mockImplementation(async (q: { tag?: string }) =>
            q.tag
                ? []
                : [
                      { id: 1, tags: ['economy', 'freedom', 'kirkkonummi'] },
                      { id: 2, tags: ['economy', 'freedom'] },
                  ]
        )
        const result = await render(baseTag, 'en')
        getExcerptPosts.mockImplementation(async () => [])

        const list = result.querySelector('ul[aria-label="Related topics"]')!
        expect([...list.querySelectorAll('a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
            ['Freedom', '/en/category/freedom/'],
            ['Kirkkonummi', '/en/category/kirkkonummi/'],
        ])
    })

    it('renders no related topics with fewer than two siblings', async () => {
        getExcerptPosts.mockImplementation(async (q: { tag?: string }) =>
            q.tag ? [] : [{ id: 1, tags: ['economy', 'freedom'] }]
        )
        const result = await render(baseTag, 'en')
        getExcerptPosts.mockImplementation(async () => [])

        expect(queryByText(result, 'Related topics')).toBeNull()
    })
})

describe('category page FAQ', () => {
    it('renders the plate and FAQPage JSON-LD beside CollectionPage for a locale with 2+ entries', async () => {
        const result = await render(fiOnly, 'fi')

        expect(queryByText(result, 'Usein kysyttyä')).not.toBeNull()
        expect(queryByText(result, 'Miksi talous on vihreä kysymys?')).not.toBeNull()
        expect(jsonLdTypes(result)).toEqual(expect.arrayContaining(['CollectionPage', 'FAQPage']))
    })

    it('renders neither for a locale without entries', async () => {
        const result = await render(fiOnly, 'sv')

        expect(queryByText(result, 'Vanliga frågor')).toBeNull()
        expect(jsonLdTypes(result)).toContain('CollectionPage')
        expect(jsonLdTypes(result)).not.toContain('FAQPage')
    })

    it('renders neither for a tag without faq', async () => {
        const result = await render({ ...baseTag, faq: undefined }, 'fi')

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
        expect(jsonLdTypes(result)).not.toContain('FAQPage')
    })
})
