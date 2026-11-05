import { describe, expect, it } from 'vitest'

import { buildPublicationBylineText, coAuthorsHeading, coAuthorsOf, formatPublicationDate } from './byline'

describe('coAuthorsOf', () => {
    it('leaves Lauri out wherever he stands in the list', () => {
        expect(coAuthorsOf([{ name: 'Johanna Fleming' }, 'lauri', { name: 'Paula Oittinen' }])).toEqual([
            { name: 'Johanna Fleming' },
            { name: 'Paula Oittinen' },
        ])
    })

    it('keeps meta.json order', () => {
        expect(coAuthorsOf(['lauri', { name: 'B' }, { name: 'A' }]).map(({ name }) => name)).toEqual(['B', 'A'])
    })

    it('is empty for a solo post', () => {
        expect(coAuthorsOf(['lauri'])).toEqual([])
    })
})

describe('coAuthorsHeading', () => {
    it.each([
        ['fi', 'Kanssakirjoittaja', 'Kanssakirjoittajat'],
        ['sv', 'Medförfattare', 'Medförfattare'],
        ['en', 'Co-author', 'Co-authors'],
    ] as const)('%s: singular for one, plural for more', (lang, one, other) => {
        expect(coAuthorsHeading(1, lang)).toBe(one)
        expect(coAuthorsHeading(2, lang)).toBe(other)
        expect(coAuthorsHeading(5, lang)).toBe(other)
    })
})

describe('formatPublicationDate', () => {
    it('formats date in Finnish locale', () => {
        expect(formatPublicationDate('2025-03-15', 'fi')).toBe('15. maaliskuuta 2025')
    })

    it('formats date in English locale', () => {
        expect(formatPublicationDate('2025-03-15', 'en')).toBe('15 March 2025')
    })

    it('formats date in Swedish locale', () => {
        expect(formatPublicationDate('2025-03-15', 'sv')).toBe('15 mars 2025')
    })
})

describe('buildPublicationBylineText', () => {
    it('renders Finnish prefix, name, and date', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', name: 'Kauppalehti' }, 'fi')).toBe(
            'Julkaistu myös: Kauppalehti, 15. maaliskuuta 2025.'
        )
    })

    it('renders English prefix, name, and date', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', lang: 'en', name: 'Kauppalehti' }, 'en')).toBe(
            'Also published in: Kauppalehti, 15 March 2025.'
        )
    })

    it('renders Swedish prefix, name, and date', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', lang: 'sv', name: 'Kauppalehti' }, 'sv')).toBe(
            'Publicerat även i: Kauppalehti, 15 mars 2025.'
        )
    })

    it('output is identical whether url is present or absent', () => {
        const withUrl = buildPublicationBylineText(
            { date: '2024-06-01', name: 'Helsingin Sanomat', url: 'https://hs.fi/article' },
            'fi'
        )
        const withoutUrl = buildPublicationBylineText({ date: '2024-06-01', name: 'Helsingin Sanomat' }, 'fi')
        expect(withUrl).toBe(withoutUrl)
    })

    it('appends a language suffix when the publication lang differs from the page lang', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', lang: 'sv', name: 'HBL' }, 'fi')).toBe(
            'Julkaistu myös: HBL, 15. maaliskuuta 2025 (ruotsiksi).'
        )
    })

    it('omits the suffix when the publication lang matches the page lang', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', lang: 'fi', name: 'Kauppalehti' }, 'fi')).toBe(
            'Julkaistu myös: Kauppalehti, 15. maaliskuuta 2025.'
        )
    })

    it('defaults an unset lang to fi, omitting the suffix on the fi page', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', name: 'Kauppalehti' }, 'fi')).toBe(
            'Julkaistu myös: Kauppalehti, 15. maaliskuuta 2025.'
        )
    })

    it('defaults an unset lang to fi, adding the suffix on non-fi pages', () => {
        expect(buildPublicationBylineText({ date: '2025-03-15', name: 'Kauppalehti' }, 'en')).toBe(
            'Also published in: Kauppalehti, 15 March 2025 (in Finnish).'
        )
    })

    it('names the publication language in the reader language, not its own', () => {
        const pub = { date: '2025-03-15', lang: 'sv', name: 'HBL' } as const

        expect(buildPublicationBylineText(pub, 'en')).toContain('(in Swedish)')
        expect(buildPublicationBylineText(pub, 'fi')).toContain('(ruotsiksi)')
    })
})
