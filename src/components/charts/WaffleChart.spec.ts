import { getAllByRole, getByText } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { publicRevenue2027 } from '../../content/publicFinance2027'
import WaffleChart from './WaffleChart.astro'

const NBSP = ' '

describe('<WaffleChart />', () => {
    const props = { caption: 'Julkiset tulot 2027', data: publicRevenue2027, lang: 'fi' as const }

    it('should render one square per billion, hidden from assistive technology', async () => {
        const result = await renderAstroComponent(WaffleChart, { props })
        const grid = result.querySelector('.grid')

        expect(grid?.getAttribute('aria-hidden')).toBe('true')
        expect(grid?.querySelectorAll('.cell')).toHaveLength(160)
    })

    it('should render a toggle button per group with its amount and share as text', async () => {
        const result = await renderAstroComponent(WaffleChart, { props })
        const buttons = getAllByRole(result, 'button')

        expect(buttons).toHaveLength(publicRevenue2027.groups.length)
        expect(buttons[0].textContent).toContain(`46${NBSP}mrd${NBSP}€`)
        expect(buttons[0].textContent).toContain(`29${NBSP}%`)
    })

    /* A toggle that toggles nothing is a false promise; the script adds the state when it runs. */
    it('should leave the toggle state to the script', async () => {
        const result = await renderAstroComponent(WaffleChart, { props })

        expect(getAllByRole(result, 'button').some((button) => button.hasAttribute('aria-pressed'))).toBe(false)
    })

    it('should hide the separator dot from screen readers', async () => {
        const result = await renderAstroComponent(WaffleChart, { props })
        const dot = [...result.querySelectorAll('.amount span')].find((span) => span.textContent === '·')

        expect(dot?.getAttribute('aria-hidden')).toBe('true')
    })

    it('should list the breakdown of groups that have more than one item', async () => {
        const result = await renderAstroComponent(WaffleChart, { props })

        const items = [...result.querySelectorAll('.item')].map((item) => item.textContent?.trim())

        expect(items).toContain(`yhteisövero 7,7${NBSP}mrd${NBSP}€`)
        expect(result.querySelectorAll('.items')).toHaveLength(3)
    })

    it('should label the chart in the requested locale', async () => {
        const result = await renderAstroComponent(WaffleChart, { props: { ...props, caption: 'Revenue', lang: 'en' } })

        expect(getByText(result, 'Income taxes')).toBeTruthy()
        expect(getByText(result, 'Revenue')).toBeTruthy()
    })
})
