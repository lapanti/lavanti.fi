import type {
    Benchmark,
    CampaignFinance,
    Expense,
    ExpenseCategory,
    FundingSource,
    Income,
} from '../content/campaignFinance'

import { describe, expect, it } from 'vitest'

import {
    barsMax,
    barWidth,
    benchmarkRows,
    benchmarkSet,
    benchmarkShareRows,
    budgetSegments,
    categoryRows,
    formatDate,
    formatDecimal,
    formatEuro,
    formatInteger,
    formatPercent,
    gapToBudget,
    mergeParty,
    percentOf,
    spendingSegments,
    summaryTiles,
    toneColors,
    totalRaised,
    totalSpent,
    withPending,
} from './campaignFinance'

const NBSP = '\u00A0'

const income = (banked: number, pending = 0): Income => ({ banked, pending })
const expense = (budgeted: number, banked = 0, committed = 0): Expense => ({ banked, budgeted, committed })

const raisedWith = (changes: Partial<Record<FundingSource, Income>> = {}): Record<FundingSource, Income> => ({
    companies: income(0),
    loans: income(0),
    other: income(0),
    own: income(0),
    party: income(0),
    partyAssociations: income(0),
    private: income(0),
    ...changes,
})

const spentWith = (changes: Partial<Record<ExpenseCategory, Expense>> = {}): Record<ExpenseCategory, Expense> => ({
    design: expense(1000),
    events: expense(1000),
    media: expense(10000),
    other: expense(1000),
    outdoor: expense(10000),
    print: expense(3000),
    supportCosts: expense(1000),
    ...changes,
})

const finance = (overrides: Partial<CampaignFinance> = {}): CampaignFinance => ({
    asOf: '2026-09-25',
    budget: 30000,
    donationUrl: 'https://lavanti.fi/lahjoita',
    donationsOpen: false,
    raised: raisedWith({ own: income(10000) }),
    spent: spentWith({ media: expense(10000, 5000) }),
    ...overrides,
})

const benchmark: Benchmark = {
    range: { max: 136739, min: 0 },
    retrievedDate: '2026-09-25',
    sets: [
        { id: 'all', mean: 37540, median: 32634, n: 273, q1: 19801, q3: 48986 },
        { id: 'uusimaa', mean: 42517, median: 36355, n: 46, q1: 25566, q3: 59106 },
    ],
    shares: { companies: 20.1, loans: 1.1, other: 22.9, own: 24.7, party: 3, partyAssociations: 8.3, private: 19.9 },
    sourceUrl: 'https://www.vaalirahoitusvalvonta.fi/example.csv',
}

describe('totalRaised', () => {
    it('should sum banked and pending separately over every funding source', () => {
        expect(totalRaised(finance())).toEqual({ banked: 10000, pending: 0 })
        expect(
            totalRaised(
                finance({
                    raised: raisedWith({
                        companies: income(500),
                        other: income(250, 50),
                        own: income(10000, 7000),
                        party: income(100),
                        partyAssociations: income(200),
                        private: income(1200, 494),
                    }),
                })
            )
        ).toEqual({ banked: 12250, pending: 7544 })
    })

    it('should be zero when nothing has come in', () => {
        expect(totalRaised(finance({ raised: raisedWith() }))).toEqual({ banked: 0, pending: 0 })
    })
})

describe('totalSpent', () => {
    it('should sum budgeted, paid and committed separately over every category', () => {
        const spent = spentWith({ media: expense(10000, 5000, 2000), print: expense(3000, 0, 500) })

        expect(totalSpent(finance({ spent }))).toEqual({ banked: 5000, budgeted: 27000, committed: 2500 })
    })
})

describe('gapToBudget', () => {
    it('should report what is left to raise', () => {
        expect(gapToBudget(finance())).toBe(20000)
    })

    /* Pending income is bound by a contract, so the budget can rely on it. */
    it('should count pending income towards the budget', () => {
        expect(gapToBudget(finance({ raised: raisedWith({ own: income(10000, 5000) }) }))).toBe(15000)
    })

    it('should clamp at zero when the campaign has raised more than it budgeted', () => {
        expect(gapToBudget(finance({ raised: raisedWith({ own: income(32000) }) }))).toBe(0)
    })

    it('should clamp at zero when banked and pending together exceed the budget', () => {
        expect(gapToBudget(finance({ raised: raisedWith({ own: income(10000, 25000) }) }))).toBe(0)
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

describe('formatInteger', () => {
    it('should group thousands without a currency sign', () => {
        expect(formatInteger(136739, 'fi')).toBe(`136${NBSP}739`)
        expect(formatInteger(136739, 'sv')).toBe(`136${NBSP}739`)
        expect(formatInteger(136739, 'en')).toBe('136,739')
        expect(formatInteger(273, 'fi')).toBe('273')
    })
})

describe('formatDecimal', () => {
    it('should print one decimal without a percent sign', () => {
        expect(formatDecimal(22.9, 'fi')).toBe('22,9')
        expect(formatDecimal(22.9, 'en')).toBe('22.9')
        expect(formatDecimal(3, 'sv')).toBe('3,0')
    })
})

describe('benchmarkSet', () => {
    it('should return the set with the given id', () => {
        expect(benchmarkSet(benchmark, 'uusimaa').median).toBe(36355)
    })

    it('should throw when the set is missing, so the build fails instead of printing undefined', () => {
        expect(() => benchmarkSet({ ...benchmark, sets: [] }, 'all')).toThrow(/no benchmark set "all"/)
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
        expect(loans?.pending).toBe(0)
        expect(loans?.label).toBe('Lainat')
    })

    const size = (segments: { pending?: number; value: number }[]): number =>
        segments.reduce((sum, segment) => sum + segment.value + (segment.pending ?? 0), 0)

    it('should total the budget while the campaign is under it', () => {
        const { segments, total } = budgetSegments(finance(), 'fi')

        expect(total).toBe(30000)
        expect(size(segments)).toBe(30000)
    })

    /*
     * Pending is not banked: it rides on its source as a separate, hatched part, so the
     * solid part of the bar stays exactly the money that has arrived.
     */
    it('should carry pending income on its source, apart from the banked amount', () => {
        const pending = finance({ raised: raisedWith({ own: income(3000, 7000) }) })
        const { segments, total } = budgetSegments(pending, 'fi')
        const own = segments.find((segment) => segment.id === 'own')

        expect(own).toMatchObject({ pending: 7000, pendingLabel: 'tilittämättä', value: 3000 })
        expect(segments.find((segment) => segment.id === 'needed')?.value).toBe(20000)
        expect(total).toBe(30000)
    })

    it('should merge the party associations into the party row, banked and pending alike', () => {
        const party = finance({ raised: raisedWith({ party: income(100, 10), partyAssociations: income(200, 20) }) })
        const row = budgetSegments(party, 'fi').segments.find((segment) => segment.id === 'party')

        expect(row).toMatchObject({ pending: 30, value: 300 })
    })

    it('should total the raised sum when the campaign has overshot the budget', () => {
        const over = finance({ raised: raisedWith({ own: income(30000, 2000) }) })
        const { segments, total } = budgetSegments(over, 'fi')

        expect(total).toBe(32000)
        expect(segments.find((segment) => segment.id === 'needed')?.value).toBe(0)
        expect(size(segments)).toBe(32000)
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

        expect(rows[0]).toEqual({ emphasis: true, label: 'Oma budjettini', value: 30000 })
        expect(rows.filter((row) => row.emphasis)).toHaveLength(1)
    })

    /*
     * Medians only: the costs are right-skewed, so a mean drawn beside a median reads
     * as the shape of the data without being able to show it.
     */
    it('should follow with the median of every set and no mean', () => {
        const rows = benchmarkRows(finance(), benchmark, 'fi')

        expect(rows.slice(1)).toEqual([
            { label: 'Koko Suomi, mediaani', value: 32634 },
            { label: 'Uudenmaan vaalipiiri, mediaani', value: 36355 },
        ])
    })

    it('should label the rows in the requested language', () => {
        expect(benchmarkRows(finance(), benchmark, 'en')[1].label).toBe('All of Finland, median')
        expect(benchmarkRows(finance(), benchmark, 'sv')[2].label).toBe('Nylands valkrets, median')
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
    /* Nothing paid and nothing committed: the page prints the pending line instead. */
    it('should give nothing before anything is paid or committed', () => {
        expect(spendingSegments(finance({ spent: spentWith() }), 'fi')).toBeUndefined()
    })

    it('should split the raised sum into spent and unspent', () => {
        const { segments, total } = spendingSegments(finance(), 'fi')!

        expect(total).toBe(10000)
        expect(segments.map((segment) => [segment.id, segment.value, segment.pending ?? 0])).toEqual([
            ['spent', 5000, 0],
            ['unspent', 5000, 0],
        ])
    })

    it('should carry committed spending hatched on the spent segment and count pending income', () => {
        const committed = finance({
            raised: raisedWith({ own: income(10000, 2000) }),
            spent: spentWith({ media: expense(10000, 3000, 2000) }),
        })
        const { segments, total } = spendingSegments(committed, 'fi')!

        expect(total).toBe(12000)
        expect(segments[0]).toMatchObject({ id: 'spent', pending: 2000, pendingLabel: 'sitouduttu', value: 3000 })
        expect(segments[1]).toMatchObject({ id: 'unspent', value: 7000 })
    })

    /* A contract can come before the money: the total grows rather than unspent going negative. */
    it('should never draw a negative unspent row when commitments run ahead of income', () => {
        const ahead = finance({ spent: spentWith({ outdoor: expense(20000, 0, 15000) }) })
        const { segments, total } = spendingSegments(ahead, 'fi')!

        expect(total).toBe(15000)
        expect(segments[1].value).toBe(0)
    })

    it('should label the segments in the requested language', () => {
        expect(spendingSegments(finance(), 'en')!.segments[0].label).toBe('Spent so far')
        expect(spendingSegments(finance(), 'sv')!.segments[1].label).toBe('Oanvänt')
    })
})

describe('categoryRows', () => {
    it('should list the seven categories in disclosure order, zeros included', () => {
        const rows = categoryRows(finance(), 'fi')

        expect(rows.map((row) => row.label)).toEqual([
            'Vaalimainonta medioissa',
            'Ulkomainonta',
            'Vaalilehdet, esitteet ja muu painettu materiaali',
            'Mainonnan suunnittelu',
            'Vaalitilaisuudet',
            'Vastikkeellisen tuen hankintakulut',
            'Muut kulut',
        ])
        expect(rows[1]).toEqual({
            label: 'Ulkomainonta',
            pending: 0,
            pendingLabel: 'sitouduttu',
            target: 10000,
            value: 0,
        })
    })

    it('should give paid as the value, committed as pending and budgeted as the target', () => {
        const spent = spentWith({ print: expense(3000, 200, 524) })

        expect(categoryRows(finance({ spent }), 'en')[2]).toMatchObject({
            label: 'Campaign papers, brochures and other print',
            pending: 524,
            pendingLabel: 'committed',
            target: 3000,
            value: 200,
        })
    })
})

describe('withPending', () => {
    it('should name both parts when money is on its way', () => {
        expect(withPending(3000, 7000, 'tilittämättä', 'fi')).toBe(
            `3${NBSP}000${NBSP}€ + 7${NBSP}000${NBSP}€ tilittämättä`
        )
        expect(withPending(3000, 7000, 'pending', 'en')).toBe('€3,000 + €7,000 pending')
    })

    it('should give just the amount when nothing is pending', () => {
        expect(withPending(3000, 0, 'tilittämättä', 'fi')).toBe(`3${NBSP}000${NBSP}€`)
        expect(withPending(3000, undefined, undefined, 'en')).toBe('€3,000')
    })
})

describe('summaryTiles', () => {
    it('should give budget, raised, spent and gap, and date the gap', () => {
        const tiles = summaryTiles(finance(), 'fi')

        expect(tiles.map((tile) => tile.label)).toEqual(['Kampanjabudjetti', 'Kerätty', 'Käytetty', 'Vielä kerättävä'])
        expect(tiles[3].note).toBe('Tilanne 25.9.2026')
    })

    it('should show what has moved, with what is bound to move as a note', () => {
        const tiles = summaryTiles(
            finance({
                raised: raisedWith({ own: income(3000, 7000) }),
                spent: spentWith({ media: expense(10000, 1000, 4000) }),
            }),
            'fi'
        )

        expect(tiles[1]).toEqual({
            label: 'Kerätty',
            note: `+ 7${NBSP}000${NBSP}€ tilittämättä`,
            value: `3${NBSP}000${NBSP}€`,
        })
        expect(tiles[2]).toEqual({
            label: 'Käytetty',
            note: `+ 4${NBSP}000${NBSP}€ sitouduttu`,
            value: `1${NBSP}000${NBSP}€`,
        })
    })

    it('should leave the note out when nothing is pending or committed', () => {
        const tiles = summaryTiles(finance(), 'en')

        expect(tiles[1].note).toBeUndefined()
        expect(tiles[2].note).toBeUndefined()
    })

    it('should format every value for the requested locale', () => {
        expect(summaryTiles(finance(), 'en')[0].value).toBe('€30,000')
        expect(summaryTiles(finance(), 'fi')[0].value).toBe(`30${NBSP}000${NBSP}€`)
    })
})
