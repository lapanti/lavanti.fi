import { getAllByRole, getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { publicInterest } from '../../content/publicFinance2027'
import InterestChart from './InterestChart.astro'

const NBSP = ' '

describe('<InterestChart />', () => {
    const props = { caption: 'Korkomenot', data: publicInterest, lang: 'fi' as const }

    it('should keep an empty slot for the years without data', async () => {
        const result = await renderAstroComponent(InterestChart, { props })

        expect(result.querySelectorAll('.columns .slot')).toHaveLength(2027 - 1990 + 1)
        expect(result.querySelectorAll('.columns .slot[data-value]')).toHaveLength(publicInterest.length)
        expect(result.querySelector('.columns')?.getAttribute('aria-hidden')).toBe('true')
    })

    it('should open on the estimate in the readout', async () => {
        const result = await renderAstroComponent(InterestChart, { props })

        expect(
            result
                .querySelector('.readout')
                ?.textContent?.replace(/[ \n\t]+/g, ' ')
                .trim()
        ).toBe(`2027 (arvio) 6,1${NBSP}mrd${NBSP}€ 3,5${NBSP}% menoista`)
    })

    it('should give every year a row in a captioned table', async () => {
        const result = await renderAstroComponent(InterestChart, { props })
        const table = getByRole(result, 'table', { name: 'Korkomenot' })

        expect(getAllByRole(table, 'row')).toHaveLength(publicInterest.length + 1)
    })

    /* Without the script the plot must not be a focus stop that does nothing. */
    it('should leave the slider role and focus to the script', async () => {
        const result = await renderAstroComponent(InterestChart, { props })
        const plot = result.querySelector('.plot')

        expect(plot?.hasAttribute('role')).toBe(false)
        expect(plot?.hasAttribute('tabindex')).toBe(false)
        expect(plot?.getAttribute('data-slider-label')).toBe('Korkomenot, valitse vuosi')
    })

    it('should draw the estimate hatched', async () => {
        const result = await renderAstroComponent(InterestChart, { props })

        expect(result.querySelectorAll('.slot--estimate')).toHaveLength(1)
    })
})
