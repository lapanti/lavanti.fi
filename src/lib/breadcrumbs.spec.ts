import { describe, expect, it } from 'vitest'

import { pageBreadcrumbs } from './breadcrumbs'

describe('pageBreadcrumbs', () => {
    it('puts a category page under the blog, named after its tag', () => {
        expect(pageBreadcrumbs('fi', 'fi/kategoria/tekoaly', 'Tekoäly', 'blog')).toEqual([
            { name: 'Etusivu', url: 'https://lavanti.fi/fi/' },
            { name: 'Blogi', url: 'https://lavanti.fi/fi/blog/' },
            { name: 'Tekoäly', url: 'https://lavanti.fi/fi/kategoria/tekoaly/' },
        ])
    })

    it('puts the newsletter archive under the localised newsletter landing page', () => {
        expect(pageBreadcrumbs('sv', 'sv/nyhetsbrev/arkiv', 'Arkiv', 'newsletter')).toEqual([
            { name: 'Hem', url: 'https://lavanti.fi/sv/' },
            { name: 'Nyhetsbrev', url: 'https://lavanti.fi/sv/nyhetsbrev/' },
            { name: 'Arkiv', url: 'https://lavanti.fi/sv/nyhetsbrev/arkiv/' },
        ])
    })

    it('puts a page under the localised election page', () => {
        expect(pageBreadcrumbs('en', 'en/elections/campaign-finance', 'Campaign finance', 'elections')).toEqual([
            { name: 'Home', url: 'https://lavanti.fi/en/' },
            { name: 'Elections', url: 'https://lavanti.fi/en/elections/' },
            { name: 'Campaign finance', url: 'https://lavanti.fi/en/elections/campaign-finance/' },
        ])
    })

    it('leaves out the middle step for a page directly under the front page', () => {
        expect(pageBreadcrumbs('fi', 'fi/media', 'Kuvapankki', 'home')).toEqual([
            { name: 'Etusivu', url: 'https://lavanti.fi/fi/' },
            { name: 'Kuvapankki', url: 'https://lavanti.fi/fi/media/' },
        ])
    })

    it('drops soft hyphens from the page name', () => {
        const trail = pageBreadcrumbs('fi', 'fi/eduskuntavaalit/vaalirahoitus', 'Vaali­rahoitus', 'elections')

        expect(trail.at(-1)?.name).toBe('Vaalirahoitus')
    })
})
