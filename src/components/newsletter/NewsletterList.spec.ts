import type { Newsletter } from '../../lib/newsletters'

import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'

const { getNewsletters } = vi.hoisted(() => ({ getNewsletters: vi.fn() }))
vi.mock('../../lib/newsletters', () => ({ getNewsletters }))

const NewsletterList = (await import('./NewsletterList.astro')).default

const countIssues = (result: HTMLElement): number => result.querySelector('ul')!.children.length

const makeIssue = (overrides: Partial<Newsletter>): Newsletter =>
    ({
        description: 'description',
        entry: {} as Newsletter['entry'],
        id: 1,
        lang: 'fi',
        pageTitle: 'Page title',
        publishDate: '2026-04-25',
        readingTime: 1,
        sent: '2026-03-14',
        slug: 'slug',
        title: 'Title',
        updatedDate: '2026-04-25',
        url: '/fi/uutiskirje/1/slug/',
        wordCount: 100,
        ...overrides,
    }) as Newsletter

describe('<NewsletterList />', () => {
    it('renders one card per issue, linking its canonical URL', async () => {
        getNewsletters.mockResolvedValue([makeIssue({ id: 2, url: '/fi/uutiskirje/2/toinen/' }), makeIssue({ id: 1 })])

        const result = await renderAstroComponent(NewsletterList, { props: { lang: 'fi' } })

        expect(countIssues(result)).toBe(2)
        expect(result.querySelector('a')).toHaveAttribute('href', '/fi/uutiskirje/2/toinen/')
        expect(result.querySelector('img')).toBeNull()
    })

    it('renders an empty list when nothing is published yet', async () => {
        getNewsletters.mockResolvedValue([])

        const result = await renderAstroComponent(NewsletterList, { props: { lang: 'sv' } })

        expect(countIssues(result)).toBe(0)
    })

    it('passes lang, excludeId and limit through', async () => {
        getNewsletters.mockResolvedValue([])

        await renderAstroComponent(NewsletterList, { props: { excludeId: 3, lang: 'en', limit: 3 } })

        expect(getNewsletters).toHaveBeenCalledWith({ excludeId: 3, lang: 'en', limit: 3 })
    })
})
