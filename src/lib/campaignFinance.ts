/**
 * Arithmetic and formatting for the campaign finance page.
 *
 * Deliberately free of `Intl`: ICU group separators and month names differ between
 * Node builds, and every string here lands in an e2e aria snapshot. Hand-rolled
 * formatting keeps the goldens stable wherever the site is built.
 */

import type { CampaignFinance, DisplaySource, FundingSource } from '../content/campaignFinance'
import type { Lang } from '../content/nav'

import { DISPLAY_SOURCE_ORDER, financeLabels } from '../content/campaignFinance'
import { colors } from './styles'

/** Segment colours. `needed` also gets a dashed outline from FinanceStack. */
export type Tone = 'companies' | 'loans' | 'needed' | 'other' | 'own' | 'party' | 'private' | 'spent' | 'unspent'

export const toneColors: Record<Tone, string> = {
    companies: colors.signalBlue,
    loans: colors.oat,
    needed: colors.sand,
    other: colors.aquaBlue,
    own: colors.darkGreen,
    party: colors.brightSky,
    private: colors.brightGreen,
    spent: colors.peach,
    unspent: colors.lightSand,
}

export interface FinanceSegment {
    id: string
    label: string
    tone: Tone
    value: number
}

/** No-break space: keeps "30 000 €" and "12,3 %" from breaking across lines. */
const NBSP = '\u00A0'

const MONTHS_EN = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
]

export const totalRaised = (finance: CampaignFinance): number =>
    Object.values(finance.raised).reduce((sum, value) => sum + value, 0)

/**
 * What is left to raise. Clamped at zero: a campaign that overshoots its budget has
 * nothing left to collect, and a negative "still needed" row would read as a debt.
 */
export const gapToBudget = (finance: CampaignFinance): number => Math.max(0, finance.budget - totalRaised(finance))

/** One decimal. A whole that is zero or negative has no parts, so the share is 0. */
export const percentOf = (part: number, whole: number): number =>
    whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0

/** Bar width as a whole percent. `max` at or below zero means every bar is empty. */
export const barWidth = (value: number, max: number): number =>
    max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0

/** The scale for a bar group: its largest value, so the tallest bar fills the track. */
export const barsMax = (values: number[]): number => values.reduce((max, value) => Math.max(max, value), 0)

/**
 * Whole euros, grouped in threes. Finnish and Swedish put the sign last after a
 * no-break space; English puts it first, the way both locales write money.
 */
export const formatEuro = (value: number, lang: Lang): string => {
    const grouped = Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : NBSP)

    return lang === 'en' ? `€${grouped}` : `${grouped}${NBSP}€`
}

/** One decimal, comma in fi/sv with a no-break space before the sign. */
export const formatPercent = (value: number, lang: Lang): string => {
    const rounded = (Math.round(value * 10) / 10).toFixed(1)

    return lang === 'en' ? `${rounded}%` : `${rounded.replace('.', ',')}${NBSP}%`
}

/**
 * An ISO calendar date as readers write it: "25.9.2026" in fi/sv, "25 September
 * 2026" in English. Parsed by hand rather than through `Date`, so a calendar date
 * never shifts a day in a westward time zone.
 */
export const formatDate = (iso: string, lang: Lang): string => {
    const [year, month, day] = iso.split('-').map(Number)

    if (!year || !month || !day) return iso

    return lang === 'en' ? `${day} ${MONTHS_EN[month - 1]} ${year}` : `${day}.${month}.${year}`
}

/**
 * The party and its local associations as one figure. They are separate fields on the
 * statutory form but one thing to a reader: money that came from the party side.
 * Rounded after summing so two one-decimal shares do not add up to 11.299999999.
 */
export const mergeParty = (amounts: Record<FundingSource, number>): Record<DisplaySource, number> => ({
    companies: amounts.companies,
    loans: amounts.loans,
    other: amounts.other,
    own: amounts.own,
    party: Math.round((amounts.party + amounts.partyAssociations) * 10) / 10,
    private: amounts.private,
})

/**
 * Where the budget stands: every funding source in statutory order, then what is
 * still missing. Zero sources stay in the list — the zero is the disclosure.
 *
 * The total is `max(budget, raised)` so an overshooting campaign still renders a bar
 * whose segments sum to the whole.
 */
export const budgetSegments = (finance: CampaignFinance, lang: Lang): { segments: FinanceSegment[]; total: number } => {
    const merged = mergeParty(finance.raised)
    const labels = financeLabels[lang]
    const segments: FinanceSegment[] = DISPLAY_SOURCE_ORDER.map((source) => ({
        id: source,
        label: labels.sources[source],
        tone: source,
        value: merged[source],
    }))

    return {
        segments: [...segments, { id: 'needed', label: labels.needed, tone: 'needed', value: gapToBudget(finance) }],
        total: Math.max(finance.budget, totalRaised(finance)),
    }
}

/**
 * Spent against raised. No clamping: the data module's own spec refuses to build a
 * campaign that reports more spent than it has raised, so a negative here is a bug
 * worth seeing rather than hiding.
 */
export const spendingSegments = (
    finance: CampaignFinance,
    lang: Lang
): { segments: FinanceSegment[]; total: number } => {
    const raised = totalRaised(finance)
    const labels = financeLabels[lang]

    return {
        segments: [
            { id: 'spent', label: labels.spent, tone: 'spent', value: finance.spent },
            { id: 'unspent', label: labels.unspent, tone: 'unspent', value: raised - finance.spent },
        ],
        total: raised,
    }
}
