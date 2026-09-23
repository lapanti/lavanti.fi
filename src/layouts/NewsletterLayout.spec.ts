import type * as Images from '../lib/images'
import type { Newsletter } from '../lib/newsletters'

import { queryByRole, queryByText } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'

const { getNewsletters } = vi.hoisted(() => ({ getNewsletters: vi.fn(() => []) }))
vi.mock('../lib/newsletters', () => ({ getNewsletters }))

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

const NewsletterLayout = (await import('./NewsletterLayout.astro')).default

const makeIssue = (overrides: Partial<Newsletter>): Newsletter =>
    ({
        description: 'description',
        entry: {} as Newsletter['entry'],
        id: 1,
        lang: 'fi',
        ogTitle: 'Og title',
        pageTitle: 'Page title',
        publishDate: '2026-01-01',
        readingTime: 3,
        sent: '2025-11-20',
        slug: 'slug',
        title: 'Title',
        updatedDate: '2026-01-02',
        url: '/fi/uutiskirje/1/slug/',
        wordCount: 500,
        ...overrides,
    }) as Newsletter

const langAlternates = { en: '/en/newsletter/1/slug/', fi: '/fi/uutiskirje/1/slug/', sv: '/sv/nyhetsbrev/1/slug/' }

const render = (issue: Newsletter) => renderAstroComponent(NewsletterLayout, { props: { issue, langAlternates } })

describe('<NewsletterLayout />', () => {
    const faq = [
        { a: 'Noin kahden viikon välein.', q: 'Kuinka usein uutiskirje ilmestyy?' },
        { a: '42 päivää lähetyksen jälkeen.', q: 'Milloin kirje päätyy arkistoon?' },
    ]

    it('should not render the FAQ plate for an issue without faq entries', async () => {
        const result = await render(makeIssue({}))

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
    })

    it('should not render the FAQ plate for a single entry, which cannot be a FAQPage', async () => {
        const result = await render(makeIssue({ faq: [faq[0]] }))

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
        expect(queryByRole(result, 'heading', { level: 3, name: faq[0].q })).toBeNull()
    })

    it('should render the FAQ plate from two entries up', async () => {
        const result = await render(makeIssue({ faq }))

        expect(queryByText(result, 'Usein kysyttyä')).not.toBeNull()
        for (const { q } of faq) {
            expect(queryByRole(result, 'heading', { level: 3, name: q })).not.toBeNull()
        }
    })

    it('should localize the plate heading', async () => {
        const sv = await render(makeIssue({ faq, lang: 'sv' }))
        const en = await render(makeIssue({ faq, lang: 'en' }))

        expect(queryByText(sv, 'Vanliga frågor')).not.toBeNull()
        expect(queryByText(en, 'Frequently asked questions')).not.toBeNull()
    })
})
