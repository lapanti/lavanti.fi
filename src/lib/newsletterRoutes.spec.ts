import { describe, expect, it } from 'vitest'

import { archivePath, landingPath, newsletterPath, newsletterSlug } from './newsletterRoutes'

describe('newsletterRoutes', () => {
    it('builds the localized issue path per language', () => {
        expect(newsletterPath('fi', 1, 'tekoaly')).toBe('/fi/uutiskirje/1/tekoaly/')
        expect(newsletterPath('sv', 1, 'ai')).toBe('/sv/nyhetsbrev/1/ai/')
        expect(newsletterPath('en', '12', 'ai')).toBe('/en/newsletter/12/ai/')
    })

    it('exposes the slash-less slug used for OG ids', () => {
        expect(newsletterSlug('fi', 1, 'tekoaly')).toBe('fi/uutiskirje/1/tekoaly')
    })

    it('nests the archive list under the landing page', () => {
        expect(landingPath('fi')).toBe('/fi/uutiskirje/')
        expect(archivePath('fi')).toBe('/fi/uutiskirje/arkisto/')
        expect(archivePath('en')).toBe('/en/newsletter/archive/')
        expect(archivePath('sv')).toBe('/sv/nyhetsbrev/arkiv/')
    })
})
