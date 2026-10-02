import type { LocalTag } from '../../../content/tags'
import type * as Images from '../../../lib/images'

import { queryByText } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../../../tests/helpers'
import { economyTag } from '../../../content/tags/economy'

const { getExcerptPosts } = vi.hoisted(() => ({ getExcerptPosts: vi.fn(async () => []) }))
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

const fiOnly: LocalTag = {
    ...economyTag,
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
        const result = await render(economyTag, 'fi')

        expect(collectionPage(result).dateModified).toBe(economyTag.updatedDate)
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
        const result = await render({ ...economyTag, faq: undefined }, 'fi')

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
        expect(jsonLdTypes(result)).not.toContain('FAQPage')
    })
})
