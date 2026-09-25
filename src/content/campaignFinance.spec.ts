import type { DisplaySource, FundingSource } from './campaignFinance'

import { describe, expect, it } from 'vitest'

import { benchmark2023, campaignFinance, DISPLAY_SOURCE_ORDER, financeLabels } from './campaignFinance'

const LANGS = ['en', 'fi', 'sv'] as const
const SOURCES: FundingSource[] = ['companies', 'loans', 'other', 'own', 'party', 'partyAssociations', 'private']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

describe('campaign finance data', () => {
    it('should date the figures with an ISO calendar date', () => {
        expect(campaignFinance.asOf).toMatch(ISO_DATE)
    })

    it('should state every figure as a non-negative whole euro amount', () => {
        const figures = [campaignFinance.budget, campaignFinance.spent, ...Object.values(campaignFinance.raised)]

        for (const figure of figures) {
            expect(Number.isInteger(figure)).toBe(true)
            expect(figure).toBeGreaterThanOrEqual(0)
        }
    })

    it('should carry every statutory funding category, zeros included', () => {
        for (const source of SOURCES) {
            expect(campaignFinance.raised[source]).toBeDefined()
        }
    })

    /*
     * The guard the helpers rely on: spendingSegments subtracts without clamping, so a
     * campaign that reports more spent than raised must fail here rather than render a
     * negative segment.
     */
    it('should not report more spent than raised', () => {
        const raised = Object.values(campaignFinance.raised).reduce((sum, value) => sum + value, 0)

        expect(campaignFinance.spent).toBeLessThanOrEqual(raised)
    })

    it('should not report more raised than the budget', () => {
        const raised = Object.values(campaignFinance.raised).reduce((sum, value) => sum + value, 0)

        expect(raised).toBeLessThanOrEqual(campaignFinance.budget)
    })
})

describe('DISPLAY_SOURCE_ORDER', () => {
    it('should list the six display sources in statutory order', () => {
        expect(DISPLAY_SOURCE_ORDER).toEqual(['own', 'loans', 'private', 'companies', 'party', 'other'])
    })

    it('should cover every source except the merged party associations', () => {
        const merged: DisplaySource[] = SOURCES.filter(
            (source): source is DisplaySource => source !== 'partyAssociations'
        )

        expect([...DISPLAY_SOURCE_ORDER].sort()).toEqual(merged.sort())
    })
})

describe('2023 benchmark', () => {
    it('should date its retrieval with an ISO calendar date', () => {
        expect(benchmark2023.retrievedDate).toMatch(ISO_DATE)
    })

    it('should link the VTV disclosures CSV over https', () => {
        expect(benchmark2023.sourceUrl).toMatch(/^https:\/\/www\.vaalirahoitusvalvonta\.fi\//)
        expect(benchmark2023.sourceUrl).toMatch(/\.csv$/)
    })

    it('should hold a set for the whole country and for Uusimaa', () => {
        expect(benchmark2023.sets.map((set) => set.id)).toEqual(['all', 'uusimaa'])
    })

    it('should state a positive count, median and mean for every set', () => {
        for (const set of benchmark2023.sets) {
            expect(set.n).toBeGreaterThan(0)
            expect(set.median).toBeGreaterThan(0)
            expect(set.mean).toBeGreaterThan(0)
        }
    })

    /*
     * 2.8 (mediated support) is excluded from `shares` because it double-counts money
     * already reported under 2.3–2.7; with it the total would exceed 100.
     */
    it('should have shares that account for all reported financing', () => {
        const total = Object.values(benchmark2023.shares).reduce((sum, share) => sum + share, 0)

        expect(total).toBeCloseTo(100, 1)
    })

    it('should give a share for every statutory category', () => {
        for (const source of SOURCES) {
            expect(benchmark2023.shares[source]).toBeGreaterThanOrEqual(0)
        }
    })
})

describe('finance labels', () => {
    it('should have non-empty strings for every locale', () => {
        for (const lang of LANGS) {
            const labels = financeLabels[lang]

            expect(labels.budget).toBeTruthy()
            expect(labels.budgetRow).toBeTruthy()
            expect(labels.gap).toBeTruthy()
            expect(labels.mean).toBeTruthy()
            expect(labels.median).toBeTruthy()
            expect(labels.needed).toBeTruthy()
            expect(labels.raised).toBeTruthy()
            expect(labels.spent).toBeTruthy()
            expect(labels.unspent).toBeTruthy()
            expect(labels.sets.all).toBeTruthy()
            expect(labels.sets.uusimaa).toBeTruthy()
            expect(labels.sourceLinkText).toBeTruthy()
            expect(labels.teaser.cta).toBeTruthy()
            expect(labels.teaser.eyebrow).toBeTruthy()
            expect(labels.teaser.heading).toBeTruthy()
        }
    })

    it('should name every display source in every locale', () => {
        for (const lang of LANGS) {
            for (const source of DISPLAY_SOURCE_ORDER) {
                expect(financeLabels[lang].sources[source]).toBeTruthy()
            }
        }
    })

    it('should build the as-of and source lines from a formatted date', () => {
        for (const lang of LANGS) {
            expect(financeLabels[lang].asOf('25.9.2026')).toContain('25.9.2026')
            expect(financeLabels[lang].source('25.9.2026')).toContain('25.9.2026')
            expect(financeLabels[lang].source('25.9.2026')).toContain('VTV')
        }
    })

    it('should ask the teaser heading as a question', () => {
        for (const lang of LANGS) {
            expect(financeLabels[lang].teaser.heading).toMatch(/\?$/)
        }
    })
})
