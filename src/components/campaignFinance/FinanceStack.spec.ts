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

    it('should print amounts without shares when showShares is off', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Toteutuneet menot', lang: 'fi', segments, showShares: false, total: 30000 },
        })

        const own = getAllByRole(result, 'listitem')[0].textContent

        expect(own).toContain(`10${NBSP}000${NBSP}€`)
        expect(own).not.toContain('%')
    })

    it('should draw only the segments that have money in them', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(result.querySelectorAll('.seg')).toHaveLength(3)
    })

    /*
     * Money that has not moved yet and the shortfall are hatched, so the solid part of
     * the bar is exactly what has arrived.
     */
    it('should draw money that is not in the account yet hatched', async () => {
        const result = await renderAstroComponent(FinanceStack, {
            props: { caption: 'Mistä rahat tulevat?', lang: 'fi', segments, total: 30000 },
        })

        expect(result.querySelectorAll('.seg--hatched')).toHaveLength(2)
        expect(result.querySelectorAll('.swatch--hatched')).toHaveLength(2)
    })

    describe('with pending money', () => {
        const pendingSegments: FinanceSegment[] = [
            { id: 'own', label: 'Omat varat', pending: 7000, pendingLabel: 'tilittämättä', tone: 'own', value: 3000 },
            {
                id: 'private',
                label: 'Yksityishenkilöt',
                pending: 500,
                pendingLabel: 'tilittämättä',
                tone: 'private',
                value: 0,
            },
            { id: 'needed', label: 'Vielä kerättävä', tone: 'needed', value: 19500 },
        ]
        const props = { caption: 'Mistä rahat tulevat?', lang: 'fi', segments: pendingSegments, total: 30000 } as const

        it('should draw the banked part solid and the pending part hatched, in the same tone', async () => {
            const result = await renderAstroComponent(FinanceStack, { props })
            const segs = [...result.querySelectorAll('.seg')]

            expect(segs.map((seg) => seg.classList.contains('seg--hatched'))).toEqual([false, true, true, true])
            expect(segs[0].getAttribute('style')).toContain('flex: 3000 1 0%')
            expect(segs[1].getAttribute('style')).toContain('flex: 7000 1 0%')
            expect(segs[0].getAttribute('style')?.split(';')[0]).toBe(segs[1].getAttribute('style')?.split(';')[0])
        })

        it('should skip the solid part when nothing is banked yet', async () => {
            const result = await renderAstroComponent(FinanceStack, { props })

            expect(result.querySelectorAll('.seg')).toHaveLength(4)
            expect(result.querySelectorAll('.seg[style*="flex: 0 "]')).toHaveLength(0)
        })

        it('should name both parts in the legend and share the sum', async () => {
            const result = await renderAstroComponent(FinanceStack, { props })
            const own = getAllByRole(result, 'listitem')[0].textContent

            expect(own).toContain(`3${NBSP}000${NBSP}€ + 7${NBSP}000${NBSP}€ tilittämättä`)
            expect(own).toContain(`33,3${NBSP}%`)
        })
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
