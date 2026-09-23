import type * as Images from '../lib/images'
import type { Post } from '../lib/posts'

import { queryByRole, queryByText } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'

const { getExcerptPosts } = vi.hoisted(() => ({ getExcerptPosts: vi.fn(() => []) }))
vi.mock('../lib/posts', () => ({ getExcerptPosts }))

/*
 * tests/setup.ts stubs lib/images for components, but not the hero preload helper
 * the layouts reach for; re-mock locally with the whole surface this tree needs.
 */
vi.mock('../lib/images', async (importOriginal) => ({
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

const PostLayout = (await import('./PostLayout.astro')).default

const makePost = (overrides: Partial<Post>): Post =>
    ({
        alt: 'alt',
        description: 'description',
        entry: {} as Post['entry'],
        heroImage: 'Lauri-Lavanti-next-to-a-table',
        id: 1,
        lang: 'fi',
        pageTitle: 'Page title',
        publishDate: '2026-01-01',
        readingTime: 3,
        slug: 'slug',
        tags: [],
        title: 'Title',
        updatedDate: '2026-01-02',
        url: '/fi/blog/1/slug/',
        wordCount: 500,
        ...overrides,
    }) as Post

const langAlternates = { en: '/en/blog/1/slug/', fi: '/fi/blog/1/slug/', sv: '/sv/blog/1/slug/' }

const render = (post: Post) => renderAstroComponent(PostLayout, { props: { langAlternates, post } })

describe('<PostLayout />', () => {
    const faq = [
        { a: 'Because the policy requires it.', q: 'Miksi FAQ näkyy?' },
        { a: 'Kaksi tai useampi.', q: 'Montako kysymystä tarvitaan?' },
    ]

    it('should not render the FAQ plate for a post without faq entries', async () => {
        const result = await render(makePost({}))

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
    })

    it('should not render the FAQ plate for a single entry, which cannot be a FAQPage', async () => {
        const result = await render(makePost({ faq: [faq[0]] }))

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
        expect(queryByRole(result, 'heading', { level: 3, name: faq[0].q })).toBeNull()
    })

    it('should render the FAQ plate from two entries up', async () => {
        const result = await render(makePost({ faq }))

        expect(queryByText(result, 'Usein kysyttyä')).not.toBeNull()
        for (const { q } of faq) {
            expect(queryByRole(result, 'heading', { level: 3, name: q })).not.toBeNull()
        }
    })

    it('should localize the plate heading', async () => {
        const sv = await render(makePost({ faq, lang: 'sv' }))
        const en = await render(makePost({ faq, lang: 'en' }))

        expect(queryByText(sv, 'Vanliga frågor')).not.toBeNull()
        expect(queryByText(en, 'Frequently asked questions')).not.toBeNull()
    })
})
