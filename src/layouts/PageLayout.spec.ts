import type * as Images from '../lib/images'

import { queryByRole, queryByText } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'

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

const PageLayout = (await import('./PageLayout.astro')).default

const faq = [
    { a: 'Koska Googlen ohje vaatii sen.', q: 'Miksi FAQ näkyy sivulla?' },
    { a: 'Kaksi tai useampi.', q: 'Montako kysymystä tarvitaan?' },
]

const render = (props: Record<string, unknown>) =>
    renderAstroComponent(PageLayout, {
        props: { lang: 'fi', pageTitle: 'Page title', slug: 'fi/page', title: 'Title', ...props },
    })

describe('<PageLayout />', () => {
    it('should not render the FAQ plate without the opt-in, even with entries', async () => {
        const result = await render({ faq })

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
    })

    it('should not render the FAQ plate for a single entry, which cannot be a FAQPage', async () => {
        const result = await render({ faq: [faq[0]], faqSection: true })

        expect(queryByText(result, 'Usein kysyttyä')).toBeNull()
        expect(queryByRole(result, 'heading', { level: 3, name: faq[0].q })).toBeNull()
    })

    it('should render the FAQ plate when a page opts in and has two entries', async () => {
        const result = await render({ faq, faqSection: true })

        expect(queryByText(result, 'Usein kysyttyä')).not.toBeNull()
        for (const { q } of faq) {
            expect(queryByRole(result, 'heading', { level: 3, name: q })).not.toBeNull()
        }
    })

    it('should localize the plate heading', async () => {
        const sv = await render({ faq, faqSection: true, lang: 'sv' })
        const en = await render({ faq, faqSection: true, lang: 'en' })

        expect(queryByText(sv, 'Vanliga frågor')).not.toBeNull()
        expect(queryByText(en, 'Frequently asked questions')).not.toBeNull()
    })
})
