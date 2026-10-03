import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { campaignFinance } from '../../src/content/campaignFinance'
import {
    applyPayload,
    figuresChanged,
    FINANCE_PAGES,
    type FinancePayload,
    FUNDING_SOURCES,
    MODULE_PATH,
    parsePayload,
    readFigures,
    setUpdatedDate,
} from './update-campaign-finance'

const source = readFileSync(MODULE_PATH, 'utf8')
const TODAY = '2026-10-04'

const payloadOf = (overrides: Partial<FinancePayload> = {}): FinancePayload => ({
    asOf: TODAY,
    raised: { ...campaignFinance.raised },
    spent: campaignFinance.spent ?? 0,
    ...overrides,
})

const parse = (value: unknown, budget = campaignFinance.budget): FinancePayload =>
    parsePayload(JSON.stringify(value), budget, TODAY)

describe('readFigures', () => {
    it('reads the same figures the module exports', () => {
        const figures = readFigures(source)
        expect(figures).toEqual({
            asOf: campaignFinance.asOf,
            budget: campaignFinance.budget,
            ownCommitment: campaignFinance.ownCommitment,
            raised: campaignFinance.raised,
            spent: campaignFinance.spent,
        })
    })

    it('lists exactly the funding sources the module records', () => {
        expect([...FUNDING_SOURCES].sort()).toEqual(Object.keys(campaignFinance.raised).sort())
    })
})

describe('parsePayload', () => {
    it('accepts a payload that satisfies the invariants', () => {
        const payload = payloadOf()
        expect(parse(payload)).toEqual(payload)
    })

    it.each([
        ['an unknown category', { raised: { ...campaignFinance.raised, crypto: 5 } }, /unknown categories: crypto/],
        [
            'a missing category',
            { raised: { ...campaignFinance.raised, loans: undefined } },
            /missing categories: loans/,
        ],
        ['a negative figure', { raised: { ...campaignFinance.raised, private: -1 } }, /raised.private/],
        ['a fractional figure', { spent: 10.5 }, /spent must be/],
        ['spent above total raised', { spent: 1_000_000 }, /exceeds total raised/],
        ['total raised above budget', { raised: { ...campaignFinance.raised, private: 1_000_000 } }, /exceeds budget/],
        ['a non-ISO asOf', { asOf: '4.10.2026' }, /ISO date/],
        ['a future asOf', { asOf: '2026-10-05' }, /in the future/],
    ])('rejects %s', (_name, overrides, message) => {
        expect(() => parse({ ...payloadOf(), ...overrides })).toThrow(message)
    })

    it('rejects text that is not JSON', () => {
        expect(() => parsePayload('{', campaignFinance.budget, TODAY)).toThrow(/not JSON/)
    })
})

describe('figuresChanged', () => {
    it('ignores a payload that differs only in asOf', () => {
        expect(figuresChanged(readFigures(source), payloadOf({ asOf: '2026-10-01' }))).toBe(false)
    })

    it('detects a changed category or spent figure', () => {
        const current = readFigures(source)
        expect(figuresChanged(current, payloadOf({ spent: (campaignFinance.spent ?? 0) + 1 }))).toBe(true)
        expect(figuresChanged(current, payloadOf({ raised: { ...campaignFinance.raised, party: 500 } }))).toBe(true)
    })
})

describe('applyPayload', () => {
    const raised = { ...campaignFinance.raised, own: campaignFinance.raised.own + 1000, private: 250 }
    const updated = readFigures(applyPayload(source, payloadOf({ raised, spent: 2000 })))

    it('writes asOf, every category and spent', () => {
        expect(updated.asOf).toBe(TODAY)
        expect(updated.raised).toEqual(raised)
        expect(updated.spent).toBe(2000)
        expect(updated.budget).toBe(campaignFinance.budget)
    })

    it('moves ownCommitment opposite to own, keeping their sum', () => {
        expect(updated.ownCommitment).toBe(campaignFinance.ownCommitment - 1000)
        expect(updated.ownCommitment + updated.raised.own).toBe(
            campaignFinance.ownCommitment + campaignFinance.raised.own
        )
    })

    it('floors ownCommitment at zero', () => {
        const own = campaignFinance.raised.own + campaignFinance.ownCommitment + 500
        const next = readFigures(applyPayload(source, payloadOf({ raised: { ...campaignFinance.raised, own } })))
        expect(next.ownCommitment).toBe(0)
    })

    it('touches nothing outside the changed values', () => {
        const next = applyPayload(source, payloadOf({ spent: 1234 }))
        const changed = next.split('\n').filter((row, i) => row !== source.split('\n')[i])
        expect(changed.map((row) => row.trim())).toEqual([`asOf: '${TODAY}',`, 'spent: 1234,'])
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
