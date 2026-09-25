import type { Benchmark, CampaignFinance } from '../content/campaignFinance'

import { describe, expect, it } from 'vitest'

import {
    barsMax,
    barWidth,
    benchmarkRows,
    benchmarkShareRows,
    budgetSegments,
    formatDate,
    formatEuro,
    formatPercent,
    gapToBudget,
    mergeParty,
    percentOf,
    spendingSegments,
    toneColors,
    totalRaised,
} from './campaignFinance'

const NBSP = '\u00A0'

const finance = (overrides: Partial<CampaignFinance> = {}): CampaignFinance => ({
    asOf: '2026-09-25',
    budget: 30000,
    raised: { companies: 0, loans: 0, other: 0, own: 10000, party: 0, partyAssociations: 0, private: 0 },
    spent: 5000,
    ...overrides,
})

const benchmark: Benchmark = {
    retrievedDate: '2026-09-25',
    sets: [
        { id: 'all', mean: 37540, median: 32634, n: 273 },
        { id: 'uusimaa', mean: 42517, median: 36355, n: 46 },
    ],
    shares: { companies: 20.1, loans: 1.1, other: 22.9, own: 24.7, party: 3, partyAssociations: 8.3, private: 19.9 },
    sourceUrl: 'https://www.vaalirahoitusvalvonta.fi/example.csv',
}

describe('totalRaised', () => {
    it('should sum every funding category', () => {
        expect(totalRaised(finance())).toBe(10000)
        expect(
            totalRaised(
                finance({
                    raised: {
                        companies: 500,
                        loans: 0,
                        other: 250,
                        own: 10000,
                        party: 100,
                        partyAssociations: 200,
                        private: 1200,
                    },
                })
            )
        ).toBe(12250)
    })

    it('should be zero when nothing has come in', () => {
        const empty = finance({
            raised: { companies: 0, loans: 0, other: 0, own: 0, party: 0, partyAssociations: 0, private: 0 },
            spent: 0,
        })

        expect(totalRaised(empty)).toBe(0)
    })
})

describe('gapToBudget', () => {
    it('should report what is left to raise', () => {
        expect(gapToBudget(finance())).toBe(20000)
    })

    it('should clamp at zero when the campaign has raised more than it budgeted', () => {
        const over = finance({
            raised: { companies: 0, loans: 0, other: 0, own: 32000, party: 0, partyAssociations: 0, private: 0 },
        })

        expect(gapToBudget(over)).toBe(0)
    })
})

describe('percentOf', () => {
    it('should give a share to one decimal', () => {
        expect(percentOf(5000, 10000)).toBe(50)
        expect(percentOf(1, 3)).toBe(33.3)
    })

    it('should be zero when the whole is zero or negative', () => {
        expect(percentOf(5, 0)).toBe(0)
        expect(percentOf(5, -10)).toBe(0)
    })
})

describe('barWidth', () => {
    it('should scale a value against the largest bar', () => {
        expect(barWidth(30000, 42517)).toBe(71)
        expect(barWidth(42517, 42517)).toBe(100)
    })

    it('should be zero rather than NaN when there is no scale', () => {
        expect(barWidth(30000, 0)).toBe(0)
        expect(barWidth(0, 0)).toBe(0)
    })

    it('should never exceed the track', () => {
        expect(barWidth(200, 100)).toBe(100)
    })
})

describe('barsMax', () => {
    it('should find the largest value', () => {
        expect(barsMax([30000, 32634, 42517])).toBe(42517)
    })

    it('should be zero for an empty group or all-zero values', () => {
        expect(barsMax([])).toBe(0)
        expect(barsMax([0, 0])).toBe(0)
    })
})

describe('formatEuro', () => {
    it('should group thousands with a no-break space and trail the sign in fi and sv', () => {
        expect(formatEuro(30000, 'fi')).toBe(`30${NBSP}000${NBSP}€`)
        expect(formatEuro(30000, 'sv')).toBe(`30${NBSP}000${NBSP}€`)
        expect(formatEuro(1234567, 'fi')).toBe(`1${NBSP}234${NBSP}567${NBSP}€`)
    })

    it('should use commas and lead with the sign in English', () => {
        expect(formatEuro(30000, 'en')).toBe('€30,000')
        expect(formatEuro(5000, 'en')).toBe('€5,000')
    })

    it('should print zero without a separator', () => {
        expect(formatEuro(0, 'fi')).toBe(`0${NBSP}€`)
        expect(formatEuro(0, 'en')).toBe('€0')
    })

    it('should not group amounts below a thousand', () => {
        expect(formatEuro(300, 'fi')).toBe(`300${NBSP}€`)
    })
})

describe('formatPercent', () => {
    it('should use a comma and a no-break space in fi and sv', () => {
        expect(formatPercent(50, 'fi')).toBe(`50,0${NBSP}%`)
        expect(formatPercent(11.3, 'sv')).toBe(`11,3${NBSP}%`)
    })

    it('should use a point and no space in English', () => {
        expect(formatPercent(50, 'en')).toBe('50.0%')
        expect(formatPercent(11.3, 'en')).toBe('11.3%')
    })

    it('should always show one decimal', () => {
        expect(formatPercent(3, 'fi')).toBe(`3,0${NBSP}%`)
        expect(formatPercent(0, 'en')).toBe('0.0%')
    })
})

describe('formatDate', () => {
    it('should write fi and sv dates as day.month.year', () => {
        expect(formatDate('2026-09-25', 'fi')).toBe('25.9.2026')
        expect(formatDate('2026-09-25', 'sv')).toBe('25.9.2026')
        expect(formatDate('2027-04-18', 'fi')).toBe('18.4.2027')
    })

    it('should name the month in English', () => {
        expect(formatDate('2026-09-25', 'en')).toBe('25 September 2026')
        expect(formatDate('2026-01-01', 'en')).toBe('1 January 2026')
        expect(formatDate('2026-12-31', 'en')).toBe('31 December 2026')
    })

    it('should return the input unchanged when it is not a calendar date', () => {
        expect(formatDate('not-a-date', 'fi')).toBe('not-a-date')
    })
})

describe('mergeParty', () => {
    it('should sum the party and its associations into one figure', () => {
        const merged = mergeParty({
            companies: 20.1,
            loans: 1.1,
            other: 22.9,
            own: 24.7,
            party: 3,
            partyAssociations: 8.3,
            private: 19.9,
        })

        expect(merged.party).toBe(11.3)
        expect(merged).not.toHaveProperty('partyAssociations')
    })

    it('should keep every other category untouched', () => {
        const merged = mergeParty({
            companies: 20.1,
            loans: 1.1,
            other: 22.9,
            own: 24.7,
            party: 3,
            partyAssociations: 8.3,
            private: 19.9,
        })

        expect(merged.companies).toBe(20.1)
        expect(merged.loans).toBe(1.1)
        expect(merged.other).toBe(22.9)
        expect(merged.own).toBe(24.7)
        expect(merged.private).toBe(19.9)
    })
})

describe('budgetSegments', () => {
    it('should list every funding source in statutory order, then what is missing', () => {
        const { segments } = budgetSegments(finance(), 'fi')

        expect(segments.map((segment) => segment.id)).toEqual([
            'own',
            'loans',
            'private',
            'companies',
            'party',
            'other',
            'needed',
        ])
    })

    it('should keep zero sources in the list', () => {
        const { segments } = budgetSegments(finance(), 'fi')
        const loans = segments.find((segment) => segment.id === 'loans')

        expect(loans?.value).toBe(0)
        expect(loans?.label).toBe('Lainat')
    })

    it('should total the budget while the campaign is under it', () => {
        const { segments, total } = budgetSegments(finance(), 'fi')

        expect(total).toBe(30000)
        expect(segments.reduce((sum, segment) => sum + segment.value, 0)).toBe(30000)
    })

    it('should total the raised sum when the campaign has overshot the budget', () => {
        const over = finance({
            raised: { companies: 0, loans: 0, other: 0, own: 32000, party: 0, partyAssociations: 0, private: 0 },
        })
        const { segments, total } = budgetSegments(over, 'fi')

        expect(total).toBe(32000)
        expect(segments.find((segment) => segment.id === 'needed')?.value).toBe(0)
        expect(segments.reduce((sum, segment) => sum + segment.value, 0)).toBe(32000)
    })

    it('should label the segments in the requested language', () => {
        expect(budgetSegments(finance(), 'en').segments[0].label).toBe('My own funds')
        expect(budgetSegments(finance(), 'sv').segments[0].label).toBe('Egna medel')
    })

    it('should give every segment a tone with a colour', () => {
        for (const segment of budgetSegments(finance(), 'fi').segments) {
            expect(toneColors[segment.tone]).toMatch(/^(#|rgb)/)
        }
    })
})

describe('benchmarkRows', () => {
    it('should lead with our own budget and emphasise it', () => {
        const rows = benchmarkRows(finance(), benchmark, 'fi')

        expect(rows[0]).toEqual({ emphasis: true, label: 'Oma budjettimme', value: 30000 })
        expect(rows.filter((row) => row.emphasis)).toHaveLength(1)
    })

    it('should follow with the median and mean of every set', () => {
        const rows = benchmarkRows(finance(), benchmark, 'fi')

        expect(rows.slice(1)).toEqual([
            { label: 'Koko Suomi, mediaani', value: 32634 },
            { label: 'Koko Suomi, keskiarvo', value: 37540 },
            { label: 'Uudenmaan vaalipiiri, mediaani', value: 36355 },
            { label: 'Uudenmaan vaalipiiri, keskiarvo', value: 42517 },
        ])
    })

    it('should label the rows in the requested language', () => {
        expect(benchmarkRows(finance(), benchmark, 'en')[1].label).toBe('All of Finland, median')
        expect(benchmarkRows(finance(), benchmark, 'sv')[3].label).toBe('Nylands valkrets, median')
    })
})

describe('benchmarkShareRows', () => {
    it('should give the six display sources in statutory order', () => {
        expect(benchmarkShareRows(benchmark, 'fi')).toEqual([
            { label: 'Omat varat', value: 24.7 },
            { label: 'Lainat', value: 1.1 },
            { label: 'Yksityishenkilöt', value: 19.9 },
            { label: 'Yritykset', value: 20.1 },
            { label: 'Puolue ja puolueyhdistykset', value: 11.3 },
            { label: 'Yhdistykset ja muut tahot', value: 22.9 },
        ])
    })

    it('should still sum to the whole after merging the party rows', () => {
        const total = benchmarkShareRows(benchmark, 'fi').reduce((sum, row) => sum + row.value, 0)

        expect(total).toBeCloseTo(100, 1)
    })
})

describe('spendingSegments', () => {
    it('should split the raised sum into spent and unspent', () => {
        const { segments, total } = spendingSegments(finance(), 'fi')

        expect(total).toBe(10000)
        expect(segments.map((segment) => [segment.id, segment.value])).toEqual([
            ['spent', 5000],
            ['unspent', 5000],
        ])
    })

    it('should render both segments as zero before any money has moved', () => {
        const empty = finance({
            raised: { companies: 0, loans: 0, other: 0, own: 0, party: 0, partyAssociations: 0, private: 0 },
            spent: 0,
        })
        const { segments, total } = spendingSegments(empty, 'fi')

        expect(total).toBe(0)
        expect(segments.every((segment) => segment.value === 0)).toBe(true)
    })

    it('should label the segments in the requested language', () => {
        expect(spendingSegments(finance(), 'en').segments[0].label).toBe('Spent so far')
        expect(spendingSegments(finance(), 'sv').segments[1].label).toBe('Oanvänt')
    })
})
