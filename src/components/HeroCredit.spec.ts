import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import HeroCredit from './HeroCredit.astro'

const credit = {
    creator: 'Jane Doe',
    creatorUrl: 'https://example.org/jane',
    landingUrl: 'https://example.org/photo',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
    modified: false,
    title: 'Server hall',
}

describe('<HeroCredit />', () => {
    it('renders nothing without a credit', async () => {
        const result = await renderAstroComponent(HeroCredit, { props: { lang: 'fi' } })

        expect(result.querySelector('.hero-credit')).toBeNull()
    })

    it('links title, creator and licence', async () => {
        const result = await renderAstroComponent(HeroCredit, { props: { credit, lang: 'fi' } })
        const links = [...result.querySelectorAll('a')].map((a) => [a.textContent?.trim(), a.getAttribute('href')])

        expect(result.querySelector('.hero-credit')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'Kansikuva: “Server hall”, Jane Doe, CC BY 2.0.'
        )
        expect(links).toEqual([
            ['“Server hall”', 'https://example.org/photo'],
            ['Jane Doe', 'https://example.org/jane'],
            ['CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/'],
        ])
    })

    it.each([
        ['en', 'Cover photo: “Untitled”, CC0 1.0, modified.'],
        ['fi', 'Kansikuva: “Nimetön”, CC0 1.0, muokattu.'],
        ['sv', 'Omslagsbild: “Namnlös”, CC0 1.0, bearbetad.'],
    ] as const)('localises the label, fallback title and modified mark (%s)', async (lang, text) => {
        const result = await renderAstroComponent(HeroCredit, {
            props: { credit: { license: 'CC0 1.0', modified: true }, lang },
        })

        expect(result.querySelector('.hero-credit')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(text)
        expect(result.querySelector('a')).toBeNull()
    })
})
