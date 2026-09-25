import { getAllByRole, getByText } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import FinanceBars from './FinanceBars.astro'

const NBSP = '\u00A0'

describe('<FinanceBars />', () => {
    const rows = [
        { emphasis: true, label: 'Oma budjettimme', value: 30000 },
        { label: 'Koko Suomi, mediaani', value: 32634 },
        { label: 'Uusimaa, keskiarvo', value: 42517 },
    ]

    it('should render', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should render one list item per row with its caption', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
        })

        expect(getAllByRole(result, 'listitem')).toHaveLength(rows.length)
        expect(getByText(result, 'Paljonko kampanja maksaa?')).toBeTruthy()
    })

    it('should print every amount as text in the requested locale', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Costs', lang: 'en', rows, unit: 'eur' },
        })

        const amounts = [...result.querySelectorAll('.amount')].map((amount) => amount.textContent)

        expect(amounts).toEqual(['€30,000', '€32,634', '€42,517'])
    })

    it('should print percentages when the unit is percent', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: {
                caption: 'Mistä rahat tulivat?',
                lang: 'fi',
                rows: [
                    { label: 'Omat varat', value: 24.7 },
                    { label: 'Puolue', value: 11.3 },
                ],
                unit: 'percent',
            },
        })

        const amounts = [...result.querySelectorAll('.amount')].map((amount) => amount.textContent)

        expect(amounts).toEqual([`24,7${NBSP}%`, `11,3${NBSP}%`])
    })

    it('should hide the bars from assistive technology', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
        })

        const tracks = result.querySelectorAll('.track')

        expect(tracks).toHaveLength(rows.length)
        for (const track of tracks) {
            expect(track.getAttribute('aria-hidden')).toBe('true')
        }
    })

    it('should scale bar widths against the largest row', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
        })

        const widths = [...result.querySelectorAll('.fill')].map((fill) => fill.getAttribute('style'))

        // Astro appends the component's define:vars to the same attribute.
        expect(widths[0]).toContain('--w: 71%')
        expect(widths[1]).toContain('--w: 77%')
        expect(widths[2]).toContain('--w: 100%')
    })

    it('should mark our own row for emphasis', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
        })

        expect(result.querySelectorAll('.row--emphasis')).toHaveLength(1)
    })

    it('should give every bar zero width when no row has a value', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: {
                caption: 'Ei vielä mitään',
                lang: 'fi',
                rows: [
                    { label: 'Yritykset', value: 0 },
                    { label: 'Lainat', value: 0 },
                ],
                unit: 'eur',
            },
        })

        const widths = [...result.querySelectorAll('.fill')].map((fill) => fill.getAttribute('style'))

        expect(widths[0]).toContain('--w: 0%')
        expect(widths[1]).toContain('--w: 0%')
        expect(result.innerHTML).not.toContain('NaN')
    })

    it('should render a source line passed as a slot', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
            slots: { default: '<p>Lähde: VTV</p>' },
        })

        expect(getByText(result, 'Lähde: VTV')).toBeTruthy()
    })

    it('should omit the source area when no slot is given', async () => {
        const result = await renderAstroComponent(FinanceBars, {
            props: { caption: 'Paljonko kampanja maksaa?', lang: 'fi', rows, unit: 'eur' },
        })

        expect(result.querySelectorAll('.foot')).toHaveLength(0)
    })
})
