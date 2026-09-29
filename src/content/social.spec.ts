import { describe, expect, it } from 'vitest'

import { footerLinks } from './footer'
import { personSameAs } from './person'
import { socialChips, socialProfiles, socialUrls } from './social'

describe('socialProfiles', () => {
    it('lists every profile exactly once', () => {
        expect(new Set(socialUrls).size).toBe(socialUrls.length)
        expect(new Set(socialProfiles.map(({ title }) => title)).size).toBe(socialProfiles.length)
    })

    it('gives every footer profile an icon to render', () => {
        const missing = socialProfiles.filter(({ footer, icon }) => footer && !icon).map(({ title }) => title)
        expect(missing).toEqual([])
    })

    it('points every profile at an absolute https URL', () => {
        for (const { url } of socialProfiles) {
            expect(url).toMatch(/^https:\/\//)
        }
    })
})

/*
 * The drift these guard against is the reason the shared list exists: the four
 * surfaces each used to carry their own copy, and Reddit reached only one.
 */
describe('surfaces derived from the shared list', () => {
    it('declares every profile in sameAs, Reddit included', () => {
        for (const url of socialUrls) expect(personSameAs).toContain(url)
    })

    it('keeps the reference entries in sameAs alongside the profiles', () => {
        expect(personSameAs).toContain('https://fi.wikipedia.org/wiki/Lauri_Lavanti')
        expect(personSameAs).toContain('https://www.wikidata.org/wiki/Q139711658')
        expect(personSameAs).toContain('https://markkinavihreat.fi/ketka/lauri-lavanti/')
        expect(personSameAs).toContain('https://kirkkonummenvihreat.fi/jasenet/lauri-lavanti/')
        expect(personSameAs).toHaveLength(socialUrls.length + 4)
    })

    it('keeps the Markkinavihreät person page out of the rel="me" profile list', () => {
        expect(socialUrls).not.toContain('https://markkinavihreat.fi/ketka/lauri-lavanti/')
        expect(footerLinks.map(({ url }) => url)).not.toContain('https://markkinavihreat.fi/ketka/lauri-lavanti/')
    })

    it('keeps the Kirkkonummen Vihreät person page out of the rel="me" profile list', () => {
        expect(socialUrls).not.toContain('https://kirkkonummenvihreat.fi/jasenet/lauri-lavanti/')
        expect(footerLinks.map(({ url }) => url)).not.toContain('https://kirkkonummenvihreat.fi/jasenet/lauri-lavanti/')
    })

    it('offers every profile as a chip', () => {
        expect(socialChips.map(({ href }) => href)).toEqual(socialUrls)
    })

    it('puts only the footer-flagged profiles in the footer row', () => {
        expect(footerLinks.map(({ url }) => url)).toEqual(
            socialProfiles.filter(({ footer }) => footer).map(({ url }) => url)
        )
    })

    it('keeps RSS out of the profile list, since a feed identifies no one', () => {
        expect(socialUrls.some((url) => url.includes('rss'))).toBe(false)
        expect(personSameAs.some((url) => url.includes('rss'))).toBe(false)
    })
})
