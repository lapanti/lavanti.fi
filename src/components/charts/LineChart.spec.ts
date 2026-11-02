import { getAllByRole, getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { pensionContribution, pensionersPerEmployed } from '../../content/pensionFunding'
import LineChart from './LineChart.astro'

const NBSP = ' '

const readout = (result: HTMLElement) =>
    result
        .querySelector('.readout')
        ?.textContent?.replace(/[ \n\t]+/g, ' ')
        .trim()

describe('<LineChart />', () => {
    const props = { caption: 'Eläkkeensaajat', data: pensionersPerEmployed, lang: 'fi' as const }

    it('should draw one line per series and never join them', async () => {
        const result = await renderAstroComponent(LineChart, { props })

        expect(result.querySelectorAll('svg polyline')).toHaveLength(3)
        expect(result.querySelectorAll('.series--dashed')).toHaveLength(1)
        expect(result.querySelectorAll('.series--muted')).toHaveLength(1)
    })

    it('should give a year two series share one marker stop with a dot each', async () => {
        const result = await renderAstroComponent(LineChart, { props })
        const step = result.querySelector('.step[data-year="2025"]')

        expect(result.querySelectorAll('.step[data-year="2025"]')).toHaveLength(1)
        expect(step?.querySelectorAll('.dot')).toHaveLength(2)
        expect(step?.getAttribute('data-detail')).toBe('Eläkkeensaajat · ETK:n laskelma 63,2')
    })

    it('should open on the last year in the readout', async () => {
        const result = await renderAstroComponent(LineChart, { props })

        expect(readout(result)).toBe('2100 81,8 ETK:n laskelma')
    })

    it('should print a single percentage series without a series name', async () => {
        const result = await renderAstroComponent(LineChart, {
            props: { ...props, caption: 'Työeläkemaksu', data: pensionContribution },
        })

        expect(readout(result)).toBe(`2025 24,7${NBSP}%`)
        expect(result.querySelector('.key')).toBeNull()
    })

    it('should give every year a row in a captioned table', async () => {
        const result = await renderAstroComponent(LineChart, { props })
        const table = getByRole(result, 'table', { name: 'Eläkkeensaajat' })
        const years = new Set(pensionersPerEmployed.series.flatMap((series) => series.points.map(([year]) => year)))

        expect(getAllByRole(table, 'row')).toHaveLength(years.size + 1)
    })

    /* Without the script the plot must not be a focus stop that does nothing. */
    it('should leave the slider role and focus to the script', async () => {
        const result = await renderAstroComponent(LineChart, { props })
        const plot = result.querySelector('.plot')

        expect(plot?.hasAttribute('role')).toBe(false)
        expect(plot?.hasAttribute('tabindex')).toBe(false)
        expect(plot?.getAttribute('data-slider-label')).toBe('Eläkkeensaajia 100 työllistä kohden, valitse vuosi')
    })
})
