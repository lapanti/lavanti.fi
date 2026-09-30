import { describe, expect, it } from 'vitest'

import {
    footerCampaignFinanceHref,
    footerCampaignFinanceLabel,
    footerSourceCodeLabel,
    footerSourceCodeUrl,
} from './footer'

const LANGS = ['en', 'fi', 'sv'] as const

/*
 * The campaign finance page is reachable from the footer in every locale, and from
 * nowhere else in the chrome — the header nav stays at six sections. If these hrefs
 * drift from the page slugs, the only site-wide route to the figures breaks.
 */
describe('footer campaign finance link', () => {
    it('should point at the finance page of every locale', () => {
        expect(footerCampaignFinanceHref).toEqual({
            en: '/en/elections/campaign-finance/',
            fi: '/fi/eduskuntavaalit/vaalirahoitus/',
            sv: '/sv/riksdagsvalet/valfinansiering/',
        })
    })

    it('should use canonical paths with a trailing slash', () => {
        for (const lang of LANGS) {
            expect(footerCampaignFinanceHref[lang]).toMatch(new RegExp(`^/${lang}/.+/$`))
        }
    })

    it('should have a label in every locale', () => {
        for (const lang of LANGS) {
            expect(footerCampaignFinanceLabel[lang]).toBeTruthy()
        }
    })
})

describe('footer source code link', () => {
    it('should point at the public repository over https', () => {
        expect(footerSourceCodeUrl).toBe('https://github.com/lapanti/lavanti.fi')
    })

    it('should have a distinct label in every locale', () => {
        const labels = LANGS.map((lang) => footerSourceCodeLabel[lang])
        expect(labels.every(Boolean)).toBe(true)
        expect(new Set(labels).size).toBe(LANGS.length)
    })
})
