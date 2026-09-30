import { describe, expect, it } from 'vitest'

import { languageSwitchHrefs } from './languageSwitch'

describe('languageSwitchHrefs', () => {
    it('should use declared alternates when the page has them', () => {
        const alternates = { en: '/en/about/', fi: '/fi/laurista/', sv: '/sv/om-lauri/' }

        expect(languageSwitchHrefs('/fi/laurista/', alternates, false)).toEqual(alternates)
    })

    it('should swap the locale prefix when no alternates are declared', () => {
        expect(languageSwitchHrefs('/sv/kategori/teknologi/', undefined, false)).toEqual({
            en: '/en/kategori/teknologi/',
            fi: '/fi/kategori/teknologi/',
            sv: '/sv/kategori/teknologi/',
        })
    })

    it('should leave noindex pages on the front-page links', () => {
        expect(languageSwitchHrefs('/sv/404/', undefined, true)).toBeUndefined()
    })

    it('should leave paths without a locale prefix on the front-page links', () => {
        expect(languageSwitchHrefs('/', undefined, false)).toBeUndefined()
    })
})
