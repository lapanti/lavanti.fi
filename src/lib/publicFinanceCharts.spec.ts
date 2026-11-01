import { describe, expect, it } from 'vitest'

import { publicInterest, publicRevenue2027, publicSpending2027 } from '../content/publicFinance2027'
import {
    apportion,
    decimalsFor,
    formatBn,
    formatDecimal,
    formatShare,
    groupValue,
    interestShare,
    waffleCells,
} from './publicFinanceCharts'

const NBSP = ' '

describe('formatBn', () => {
    it('should write billions the way each locale does', () => {
        expect(formatBn(46.2, 'fi')).toBe(`46${NBSP}mrd${NBSP}€`)
        expect(formatBn(46.2, 'sv')).toBe(`46${NBSP}md${NBSP}€`)
        expect(formatBn(46.2, 'en')).toBe('€46bn')
    })

    it('should use a decimal comma in Finnish and Swedish', () => {
        expect(formatBn(7, 'fi', 1)).toBe(`7,0${NBSP}mrd${NBSP}€`)
        expect(formatBn(7, 'en', 1)).toBe('€7.0bn')
    })
})

describe('formatShare and formatDecimal', () => {
    it('should space the percent sign in Finnish and Swedish only', () => {
        expect(formatShare(28.7, 'fi')).toBe(`29${NBSP}%`)
        expect(formatShare(3.5, 'en', 1)).toBe('3.5%')
        expect(formatDecimal(4.5, 1, 'sv')).toBe('4,5')
    })
})

describe('decimalsFor', () => {
    it('should keep one decimal below ten billion', () => {
        expect(decimalsFor(7)).toBe(1)
        expect(decimalsFor(14.4)).toBe(0)
    })
})

describe('apportion', () => {
    it('should add up to the total and keep each count within one of its value', () => {
        const values = [40.2, 14.4, 38.2, 23.2, 7.0, 51.0]
        const counts = apportion(values, 174)

        expect(counts.reduce((sum, count) => sum + count, 0)).toBe(174)
        counts.forEach((count, index) => expect(Math.abs(count - values[index])).toBeLessThan(1))
    })
})

describe('waffleCells', () => {
    it.each([
        ['revenue', publicRevenue2027, 160],
        ['spending', publicSpending2027, 174],
    ])('should draw one square per billion of %s', (_, data, squares) => {
        expect(waffleCells(data)).toHaveLength(squares)
    })

    /* The legend prints whole billions; the squares must agree with it. */
    it('should give pensions 40 squares, as its legend entry says', () => {
        const cells = waffleCells(publicSpending2027)

        expect(cells.filter((cell) => cell.group === 'elakkeet')).toHaveLength(40)
    })

    it('should keep groups contiguous in reading order', () => {
        const order = waffleCells(publicRevenue2027)
            .map((cell) => cell.group)
            .filter((group, index, all) => group !== all[index - 1])

        expect(order).toEqual(publicRevenue2027.groups.map((group) => group.key))
    })
})

describe('chart data', () => {
    it.each([
        ['revenue', publicRevenue2027],
        ['spending', publicSpending2027],
    ])('should have %s items that sum to the stated total', (_, data) => {
        const sum = data.groups.reduce((total, group) => total + groupValue(group), 0)

        expect(sum).toBeCloseTo(data.total, 5)
    })

    it('should match the interest figures the post states', () => {
        const byYear = Object.fromEntries(publicInterest.map((year) => [year.year, year]))

        expect(interestShare(byYear[1997])).toBeCloseTo(7.3, 1)
        expect(byYear[2021].interest).toBe(1289)
        expect(interestShare(byYear[2027])).toBeCloseTo(3.5, 1)
    })
})
