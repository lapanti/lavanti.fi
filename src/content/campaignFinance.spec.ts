import type { DisplaySource, FundingSource } from './campaignFinance'
import type { Lang } from './nav'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { formatInteger, totalRaised, totalSpent } from '../lib/campaignFinance'
import {
    benchmark2023,
    campaignFinance,
    DISPLAY_SOURCE_ORDER,
    EXPENSE_CATEGORY_ORDER,
    financeLabels,
} from './campaignFinance'

const LANGS = ['en', 'fi', 'sv'] as const
const SOURCES: FundingSource[] = ['companies', 'loans', 'other', 'own', 'party', 'partyAssociations', 'private']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const NBSP = ' '

describe('campaign finance data', () => {
    it('should date the figures with an ISO calendar date', () => {
        expect(campaignFinance.asOf).toMatch(ISO_DATE)
    })

    it('should state every figure as a non-negative whole euro amount', () => {
        const figures = [
            campaignFinance.budget,
            ...Object.values(campaignFinance.raised).flatMap((income) => [income.banked, income.pending]),
            ...Object.values(campaignFinance.spent).flatMap((expense) => [
                expense.budgeted,
                expense.banked,
                expense.committed,
            ]),
        ]

        for (const figure of figures) {
            expect(Number.isInteger(figure)).toBe(true)
            expect(figure).toBeGreaterThanOrEqual(0)
        }
    })

    it('should carry every statutory funding source and expense category, zeros included', () => {
        expect(Object.keys(campaignFinance.raised).sort()).toEqual([...SOURCES].sort())
        expect(Object.keys(campaignFinance.spent).sort()).toEqual([...EXPENSE_CATEGORY_ORDER].sort())
    })

    /* Committed spending is exempt: a contract can come before the money. */
    it('should not report more paid out than banked', () => {
        expect(totalSpent(campaignFinance).banked).toBeLessThanOrEqual(totalRaised(campaignFinance).banked)
    })

    it('should not report more raised, pending included, than the budget', () => {
        const raised = totalRaised(campaignFinance)

        expect(raised.banked + raised.pending).toBeLessThanOrEqual(campaignFinance.budget)
    })
})

describe('EXPENSE_CATEGORY_ORDER', () => {
    it('should list the seven categories in the order of the disclosure form', () => {
        expect(EXPENSE_CATEGORY_ORDER).toEqual([
            'media',
            'outdoor',
            'print',
            'design',
            'events',
            'supportCosts',
            'other',
        ])
    })
})

describe('donation channel', () => {
    /*
     * The destination lives in a Cloudflare redirect rule. The page links the short URL
     * so that print, social and the site share one address that never changes.
     */
    it('should be the lavanti.fi/lahjoita short URL, not the destination', () => {
        expect(campaignFinance.donationUrl).toBe('https://lavanti.fi/lahjoita')
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

    it('should bracket the median with the quartiles', () => {
        for (const set of benchmark2023.sets) {
            expect(set.q1).toBeLessThan(set.median)
            expect(set.median).toBeLessThan(set.q3)
        }
    })

    it('should hold the national range outside the national quartiles', () => {
        const national = benchmark2023.sets.find((set) => set.id === 'all')

        expect(national).toBeDefined()
        expect(benchmark2023.range.min).toBeGreaterThanOrEqual(0)
        expect(benchmark2023.range.min).toBeLessThanOrEqual(national?.q1 ?? -1)
        expect(benchmark2023.range.max).toBeGreaterThanOrEqual(national?.q3 ?? Infinity)
    })

    /* A right-skewed distribution: the tail pulls the mean above the middle value. */
    it('should record a mean above the median, as a skewed distribution gives', () => {
        for (const set of benchmark2023.sets) {
            expect(set.mean).toBeGreaterThan(set.median)
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
            expect(labels.donate.cta).toBeTruthy()
            expect(labels.donate.pending).toBeTruthy()
            expect(labels.committed).toBeTruthy()
            expect(labels.pending).toBeTruthy()
            expect(labels.spentPending).toBeTruthy()
            expect(labels.teaser.cta).toBeTruthy()
            expect(labels.teaser.eyebrow).toBeTruthy()
            expect(labels.teaser.heading).toBeTruthy()
        }
    })

    it('should name every expense category in every locale', () => {
        for (const lang of LANGS) {
            for (const category of EXPENSE_CATEGORY_ORDER) {
                expect(financeLabels[lang].categories[category]).toBeTruthy()
            }
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
            expect(financeLabels[lang].source('25.9.2026')).toMatch(/VTV|revisionsverk|National Audit Office/)
        }
    })

    it('should ask the teaser heading as a question', () => {
        for (const lang of LANGS) {
            expect(financeLabels[lang].teaser.heading).toMatch(/\?$/)
        }
    })
})

/*
 * The one sanctioned copy of benchmark figures outside this module: FAQ answers are
 * frontmatter strings that also feed FAQPage JSON-LD, so they cannot read the data.
 * The 2023 figures are final, and this test holds the "how much does a campaign cost"
 * answer to them so the copy cannot drift.
 */
describe('finance page FAQ benchmark figures', () => {
    const PAGES: Record<Lang, { file: string; question: string }> = {
        en: {
            file: 'en/elections/campaign-finance',
            question: 'How much does a parliamentary election campaign cost?',
        },
        fi: { file: 'fi/eduskuntavaalit/vaalirahoitus', question: 'Paljonko eduskuntavaalikampanja maksaa?' },
        sv: { file: 'sv/riksdagsvalet/valfinansiering', question: 'Hur mycket kostar en riksdagsvalskampanj?' },
    }

    const answerTo = (file: string, question: string): string => {
        const lines = readFileSync(join(__dirname, '..', 'pages', file, 'index.mdx'), 'utf8').split('\n')
        const at = lines.findIndex((line) => line.includes(`q: '${question}'`))
        const answer = lines[at + 1]?.match(/^\s+a: '(.*)'$/)?.[1]
        if (at < 0 || !answer) {
            throw new Error(`${file}: no FAQ answer for "${question}"`)
        }
        return answer
    }

    /* FAQ strings use plain spaces; formatInteger groups with no-break spaces. */
    const plain = (value: number, lang: Lang): string => formatInteger(value, lang).split(NBSP).join(' ')

    for (const lang of LANGS) {
        it(`should quote the benchmark2023 medians and means in ${lang}`, () => {
            const { file, question } = PAGES[lang]
            const answer = answerTo(file, question)
            const expected = benchmark2023.sets.flatMap((set) => [plain(set.median, lang), plain(set.mean, lang)])

            for (const figure of expected) {
                expect(answer).toContain(figure)
            }
            const quoted = answer.match(/\d{1,3}(?:[ ,]\d{3})+/g) ?? []
            expect(quoted.sort()).toEqual([...expected].sort())
        })
    }
})
