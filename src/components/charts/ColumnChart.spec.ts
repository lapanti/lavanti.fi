import { getAllByRole, getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { lifeExpectancyCut, pensionReturnByCohort } from '../../content/pensionFunding'
import ColumnChart from './ColumnChart.astro'

const NBSP = ' '

const readout = (result: HTMLElement) =>
    result
        .querySelector('.readout')
        ?.textContent?.replace(/[ \n\t]+/g, ' ')
        .trim()

describe('<ColumnChart />', () => {
    const props = { caption: 'Vastine', data: pensionReturnByCohort, lang: 'fi' as const }

    it('should draw a column per cohort and mark the ones now of retirement age', async () => {
        const result = await renderAstroComponent(ColumnChart, { props })

        expect(result.querySelectorAll('.columns .slot')).toHaveLength(15)
        expect(result.querySelectorAll('.slot--highlight')).toHaveLength(5)
        expect(result.querySelector('.columns')?.getAttribute('aria-hidden')).toBe('true')
    })

    it('should tag only the marked columns', async () => {
        const result = await renderAstroComponent(ColumnChart, { props })

        expect([...result.querySelectorAll('.tag')].map((tag) => tag.textContent)).toEqual([
            '4,7×',
            '2,0×',
            '1,7×',
            '1,8×',
        ])
    })

    it('should open on the oldest cohort in the readout', async () => {
        const result = await renderAstroComponent(ColumnChart, { props })

        expect(readout(result)).toBe('Syntynyt 1940 4,7× eläkkeitä maksuihin nähden')
    })

    it('should add the retirement age to the readout and the table when the data has it', async () => {
        const result = await renderAstroComponent(ColumnChart, {
            props: { ...props, caption: 'Elinaikakerroin', data: lifeExpectancyCut },
        })
        const table = getByRole(result, 'table', { name: 'Elinaikakerroin' })

        expect(readout(result)).toBe(`Syntynyt 1965 5,5${NBSP}% leikkaus kuukausieläkkeeseen, eläkeikä 65${NBSP}v`)
        expect(getAllByRole(table, 'columnheader')).toHaveLength(3)
        expect(result.querySelector('.key')).toBeNull()
    })

    it('should give every cohort a row in a captioned table', async () => {
        const result = await renderAstroComponent(ColumnChart, { props })
        const table = getByRole(result, 'table', { name: 'Vastine' })

        expect(getAllByRole(table, 'row')).toHaveLength(pensionReturnByCohort.bars.length + 1)
    })

    /* Without the script the plot must not be a focus stop that does nothing. */
    it('should leave the slider role and focus to the script', async () => {
        const result = await renderAstroComponent(ColumnChart, { props })
        const plot = result.querySelector('.plot')

        expect(plot?.hasAttribute('role')).toBe(false)
        expect(plot?.hasAttribute('tabindex')).toBe(false)
    })
})
