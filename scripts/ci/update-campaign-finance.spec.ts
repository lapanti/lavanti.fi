import type { Options } from 'prettier'

import { readFileSync } from 'node:fs'
import { format } from 'prettier'
import { describe, expect, it } from 'vitest'

import prettierConfig from '../../.prettierrc.mjs'
import { campaignFinance, EXPENSE_CATEGORY_ORDER } from '../../src/content/campaignFinance'
import {
    canonical,
    changeTable,
    EXPENSE_CATEGORIES,
    FIGURES_PATH,
    figuresChanged,
    FINANCE_PAGES,
    type FinancePayload,
    FUNDING_SOURCES,
    MODULE_PATH,
    parsePayload,
    readBudget,
    readFigures,
    serializeFigures,
    setUpdatedDate,
} from './update-campaign-finance'

/* Far from any asOf a real update writes, so "asOf changed" always holds in these tests. */
const TODAY = '2099-01-04'
const BUDGET = 45000

const income = (banked: number, pending = 0) => ({ banked, pending })
const expense = (budgeted: number, banked = 0, committed = 0) => ({ banked, budgeted, committed })

const fixture = (): FinancePayload => ({
    asOf: TODAY,
    raised: {
        companies: income(0),
        loans: income(0),
        other: income(0),
        own: income(3000, 7000),
        party: income(0),
        partyAssociations: income(0),
        private: income(500, 494),
    },
    spent: {
        design: expense(1655, 0, 1255),
        events: expense(2000),
        media: expense(11340, 1000, 4600),
        other: expense(2825),
        outdoor: expense(20082),
        print: expense(3080, 200, 524),
        supportCosts: expense(1500),
    },
})

const parse = (value: unknown, budget = BUDGET): FinancePayload => parsePayload(JSON.stringify(value), budget, TODAY)

describe('the lists mirror the data module', () => {
    it('lists exactly the funding sources and categories the module records', () => {
        expect([...FUNDING_SOURCES].sort()).toEqual(Object.keys(campaignFinance.raised).sort())
        expect([...EXPENSE_CATEGORIES]).toEqual([...EXPENSE_CATEGORY_ORDER])
    })

    it('reads the manual budget from the module', () => {
        expect(readBudget(readFileSync(MODULE_PATH, 'utf8'))).toBe(campaignFinance.budget)
    })

    it('reads the same figures the module exports', () => {
        const figures = readFigures(readFileSync(FIGURES_PATH, 'utf8'))
        expect(figures).toEqual({
            asOf: campaignFinance.asOf,
            raised: campaignFinance.raised,
            spent: campaignFinance.spent,
        })
    })
})

describe('parsePayload', () => {
    it('accepts a payload that satisfies the invariants', () => {
        expect(parse(fixture())).toEqual(fixture())
    })

    it('accepts committed spending that runs ahead of the account', () => {
        const payload = fixture()
        payload.spent.outdoor = expense(20082, 0, 20000)
        expect(parse(payload).spent.outdoor.committed).toBe(20000)
    })

    const withRaised = (changes: Record<string, unknown>) => ({
        ...fixture(),
        raised: { ...fixture().raised, ...changes },
    })
    const withSpent = (changes: Record<string, unknown>) => ({
        ...fixture(),
        spent: { ...fixture().spent, ...changes },
    })

    it.each([
        ['an unknown source', withRaised({ crypto: income(5) }), /raised has unknown keys: crypto/],
        ['a missing source', withRaised({ loans: undefined }), /raised is missing keys: loans/],
        ['an unknown category', withSpent({ yachts: expense(1) }), /spent has unknown keys: yachts/],
        ['a missing field', withRaised({ own: { banked: 3000 } }), /raised\.own\.pending must be/],
        [
            'an unknown field',
            withSpent({ media: { ...expense(1), pledged: 5 } }),
            /spent\.media has unknown fields: pledged/,
        ],
        ['a negative figure', withRaised({ private: income(-1) }), /raised\.private\.banked/],
        ['a fractional figure', withSpent({ print: expense(3080, 10.5) }), /spent\.print\.banked must be/],
        ['a flat number for a source', withRaised({ own: 3000 }), /raised\.own must be an object/],
        ['raised above budget', withRaised({ own: income(30000, 20000) }), /exceeds budget/],
        [
            'paid out above banked income',
            withSpent({ media: expense(11340, 5000) }),
            /spent 5200 exceeds banked raised 3500/,
        ],
        ['a non-ISO asOf', { ...fixture(), asOf: '4.1.2099' }, /ISO date/],
        ['a future asOf', { ...fixture(), asOf: '2099-01-05' }, /in the future/],
    ])('rejects %s', (_name, payload, message) => {
        expect(() => parse(payload)).toThrow(message)
    })

    it('rejects text that is not JSON', () => {
        expect(() => parsePayload('{', BUDGET, TODAY)).toThrow(/not JSON/)
    })
})

describe('serializeFigures', () => {
    it('writes keys in canonical order, whatever order they arrived in', () => {
        const reversed = {
            ...fixture(),
            raised: Object.fromEntries(Object.entries(fixture().raised).reverse()),
            spent: Object.fromEntries(Object.entries(fixture().spent).reverse()),
        } as FinancePayload
        const text = serializeFigures(reversed)

        expect(text).toBe(serializeFigures(fixture()))
        expect(Object.keys(JSON.parse(text).raised)).toEqual([...FUNDING_SOURCES])
        expect(Object.keys(JSON.parse(text).spent)).toEqual([...EXPENSE_CATEGORIES])
        expect(Object.keys(JSON.parse(text).spent.media)).toEqual(['budgeted', 'banked', 'committed'])
    })

    /*
     * The bot commits this file unattended. If its bytes differ from Prettier's, a
     * later format pass churns the diff, or a format check fails the weekly PR.
     */
    it("is byte-identical to Prettier's output under the repo config", async () => {
        const text = serializeFigures(fixture())
        expect(text).toBe(await format(text, { ...(prettierConfig as Options), filepath: FIGURES_PATH }))
    })

    it('matches the committed file, so it was written by the serializer', () => {
        const committed = readFileSync(FIGURES_PATH, 'utf8')
        expect(serializeFigures(readFigures(committed))).toBe(committed)
    })
})

describe('figuresChanged', () => {
    it('ignores a payload that differs only in asOf', () => {
        expect(figuresChanged(fixture(), { ...fixture(), asOf: '2026-10-01' })).toBe(false)
    })

    it('ignores key order', () => {
        const reordered = { ...fixture(), raised: Object.fromEntries(Object.entries(fixture().raised).reverse()) }
        expect(figuresChanged(fixture(), reordered as FinancePayload)).toBe(false)
    })

    it('detects a changed pending, committed or budgeted figure', () => {
        const pending = fixture()
        pending.raised.private.pending += 1
        const committed = fixture()
        committed.spent.events.committed = 100
        const budgeted = fixture()
        budgeted.spent.other.budgeted = 3000

        for (const next of [pending, committed, budgeted]) expect(figuresChanged(fixture(), next)).toBe(true)
    })
})

describe('canonical', () => {
    it('drops nothing and adds nothing', () => {
        expect(canonical(fixture())).toEqual(fixture())
    })
})

describe('changeTable', () => {
    it('bolds changed rows and shows every part', () => {
        const after = fixture()
        after.raised.private = income(800, 194)
        after.asOf = '2099-01-03'
        const table = changeTable({ ...fixture(), asOf: '2098-12-27' }, after)

        expect(table).toContain('Figures as of 2099-01-03 (previously 2098-12-27)')
        expect(table).toContain('| **raised.private** | 500 + 494 | 800 + 194 |')
        expect(table).toContain('| raised.own | 3000 + 7000 | 3000 + 7000 |')
        expect(table).toContain('| **raised total** | 3500 + 7494 | 3800 + 7194 |')
        expect(table).toContain('| spent.media | 1000 + 4600 / 11340 | 1000 + 4600 / 11340 |')
    })
})

describe('setUpdatedDate', () => {
    it.each(FINANCE_PAGES)('bumps the frontmatter date of %s', (page) => {
        const next = setUpdatedDate(page, readFileSync(page, 'utf8'), TODAY)
        expect(next).toMatch(new RegExp(`^updatedDate: '${TODAY}'$`, 'm'))
    })

    it('fails when the page has no updatedDate', () => {
        expect(() => setUpdatedDate('x.mdx', '---\ntitle: x\n---\n', TODAY)).toThrow(/no updatedDate/)
    })
})
