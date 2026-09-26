import type { FinanceSegment } from '../../lib/campaignFinance'

import { getAllByRole, getByText } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import FinanceStack from './FinanceStack.astro'

const NBSP = '\u00A0'

const segments: FinanceSegment[] = [
    { id: 'own', label: 'Omat varat', tone: 'own', value: 10000 },
    { id: 'loans', label: 'Lainat', tone: 'loans', value: 0 },
    { id: 'private', label: 'Yksityishenkilöt', tone: 'private', value: 0 },
    { id: 'committed', label: 'Oma sitoumukseni', tone: 'committed', value: 5000 },
    { id: 'needed', label: 'Vielä kerättävä', tone: 'needed', value: 15000 },
]

describe('<FinanceStack />', () => {
    it('should render', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should list every segment in the legend, zeros included', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(getAllByRole(result, 'listitem')).toHaveLength(segments.length)
        expect(getByText(result, 'Lainat')).toBeTruthy()
        expect(getByText(result, 'Yksityishenkilöt')).toBeTruthy()
    })

    it('should print a zero segment as an amount and a share', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        const loans = getAllByRole(result, 'listitem')[1].textContent

        expect(loans).toContain(`0${NBSP}€`)
        expect(loans).toContain(`0,0${NBSP}%`)
    })

    it('should draw only the segments that have money in them', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(result.querySelectorAll('.seg')).toHaveLength(3)
    })

    /*
     * Pledged money and the shortfall are outlined, so the solid part of the bar is
     * exactly what has arrived.
     */
    it('should draw money that is not in the account yet as an outline', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(result.querySelectorAll('.seg--pledged')).toHaveLength(2)
        expect(result.querySelectorAll('.swatch--pledged')).toHaveLength(2)
    })

    it('should size drawn segments by their value', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        const styles = [...result.querySelectorAll('.seg')].map((seg) => seg.getAttribute('style'))

        expect(styles[0]).toContain('flex: 10000 1 0%')
        expect(styles[1]).toContain('flex: 5000 1 0%')
        expect(styles[2]).toContain('flex: 15000 1 0%')
    })

    it('should hide the bar and the swatches from assistive technology', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(result.querySelector('.bar')?.getAttribute('aria-hidden')).toBe('true')
        for (const swatch of result.querySelectorAll('.swatch')) {
            expect(swatch.getAttribute('aria-hidden')).toBe('true')
        }
    })

    it('should give every segment a colour', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        for (const swatch of result.querySelectorAll('.swatch')) {
            expect(swatch.getAttribute('style')).toMatch(/--tone: (#|rgb)/)
        }
    })

    it('should compute shares against the total', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(getAllByRole(result, 'listitem')[0].textContent).toContain(`33,3${NBSP}%`)
    })

    it('should draw nothing and report zero shares when the total is zero', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: {
                caption: 'Mihin rahaa on käytetty?',
                lang: 'fi',
                segments: [
                    { id: 'spent', label: 'Käytetty', tone: 'spent', value: 0 },
                    { id: 'unspent', label: 'Käyttämättä', tone: 'unspent', value: 0 },
                ],
                total: 0,
            },
        })

        expect(result.querySelectorAll('.seg')).toHaveLength(0)
        expect(getAllByRole(result, 'listitem')).toHaveLength(2)
        expect(result.innerHTML).not.toContain('NaN')
    })

    it('should format amounts and shares in the requested locale', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Where does the money come from?', lang: 'en', segments, total: 30000 },
        })

        const own = getAllByRole(result, 'listitem')[0].textContent

        expect(own).toContain('€10,000')
        expect(own).toContain('33.3%')
    })
})
