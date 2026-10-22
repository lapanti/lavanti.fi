import { getAllByRole, getByText, queryAllByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import FinanceStats from './FinanceStats.astro'

describe('<FinanceStats />', () => {
    const items = [
        { label: 'Kampanjabudjetti', value: '30 000 €' },
        { label: 'Kerätty', value: '10 000 €' },
        { label: 'Käytetty', note: 'Tilanne 25.9.2026', value: '5 000 €' },
    ]

    it('should render', async () => {
        const result = await renderAstroComponent(FinanceStats, { props: { items } })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should render every figure as a description-list pair', async () => {
        const result = await renderAstroComponent(FinanceStats, { props: { items } })

        expect(getAllByRole(result, 'term')).toHaveLength(items.length)
        expect(getAllByRole(result, 'definition')).toHaveLength(items.length)
    })

    it('should render labels and values as text', async () => {
        const result = await renderAstroComponent(FinanceStats, { props: { items } })

        for (const item of items) {
            expect(getByText(result, item.label)).toBeTruthy()
            expect(getByText(result, item.value, { exact: false })).toBeTruthy()
        }
    })

    it('should render a note only for the figures that have one', async () => {
        const result = await renderAstroComponent(FinanceStats, { props: { items } })

        expect(result.querySelectorAll('.note')).toHaveLength(1)
        expect(getByText(result, 'Tilanne 25.9.2026')).toBeTruthy()
    })

    it('should render the detail as a second line of small print, after the note', async () => {
        const result = await renderAstroComponent(FinanceStats, {
            props: {
                items: [
                    { detail: '24 lahjoittajaa', label: 'Kerätty', note: '+ 500 € tilittämättä', value: '10 000 €' },
                    { detail: '24 lahjoittajaa', label: 'Kerätty', value: '10 000 €' },
                ],
            },
        })
        const notes = [...result.querySelectorAll('.note')].map((node) => node.textContent)

        expect(notes).toEqual(['+ 500 € tilittämättä', '24 lahjoittajaa', '24 lahjoittajaa'])
    })

    it('should render nothing for an empty list', async () => {
        const result = await renderAstroComponent(FinanceStats, { props: { items: [] } })

        expect(queryAllByRole(result, 'term')).toHaveLength(0)
    })
})
