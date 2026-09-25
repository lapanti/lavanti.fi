/**
 * Arithmetic and formatting for the campaign finance page.
 *
 * Deliberately free of `Intl`: ICU group separators and month names differ between
 * Node builds, and every string here lands in an e2e aria snapshot. Hand-rolled
 * formatting keeps the goldens stable wherever the site is built.
 */

import type { Benchmark, CampaignFinance, DisplaySource, FundingSource } from '../content/campaignFinance'
import type { Lang } from '../content/nav'

import { DISPLAY_SOURCE_ORDER, financeLabels } from '../content/campaignFinance'
import { colors } from './styles'

/**
 * Segment colours, all from the Signal Band palette: the five signal colours for the
 * funding sources, the grounds for the neutral rows. The palest of them would vanish
 * against the oat and off-white plates, so FinanceStack outlines every swatch and
 * segment rather than substituting an off-palette colour. `needed` is outlined dashed.
 */
export type Tone =
    'committed' | 'companies' | 'loans' | 'needed' | 'other' | 'own' | 'party' | 'private' | 'spent' | 'unspent'

export const toneColors: Record<Tone, string> = {
    committed: colors.darkGreen,
    companies: colors.signalBlue,
    loans: colors.darkMoss,
    needed: colors.sand,
    other: colors.aquaBlue,
    own: colors.darkGreen,
    party: colors.brightSky,
    private: colors.brightGreen,
    spent: colors.peach,
    unspent: colors.sand,
}

export interface FinanceSegment {
    id: string
    label: string
    tone: Tone
    value: number
}

export interface BarRow {
    /** Our own figure among the comparisons. */
    emphasis?: boolean
    label: string
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
 * What is left to find from other people. The candidate's own undertaking counts
 * towards it, because it is money the budget can already rely on.
 *
 * Clamped at zero: a campaign that overshoots its budget has nothing left to collect,
 * and a negative "still needed" row would read as a debt.
 */
export const gapToBudget = (finance: CampaignFinance): number =>
    Math.max(0, finance.budget - totalRaised(finance) - finance.ownCommitment)

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
 * Where the budget stands: every funding source in statutory order, then the
 * candidate's own undertaking, then what is still missing. Zero sources stay in the
 * list — the zero is the disclosure.
 *
 * The undertaking is its own segment rather than part of `own`, so pledged money is
 * never shown as received. The total is `max(budget, …)` so an overshooting campaign
 * still renders a bar whose segments sum to the whole.
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
        segments: [
            ...segments,
            { id: 'committed', label: labels.committed, tone: 'committed', value: finance.ownCommitment },
            { id: 'needed', label: labels.needed, tone: 'needed', value: gapToBudget(finance) },
        ],
        total: Math.max(finance.budget, totalRaised(finance) + finance.ownCommitment),
    }
}

/**
 * Our budget against what the 2023 campaigns cost: our own figure first, then the
 * median of each comparison set.
 *
 * Medians only. The distribution is right-skewed, so a mean drawn beside a median
 * invites the reader to treat two numbers as the shape of the data when they cannot
 * show it; the spread belongs in the quartiles the page states in words.
 */
export const benchmarkRows = (finance: CampaignFinance, benchmark: Benchmark, lang: Lang): BarRow[] => {
    const labels = financeLabels[lang]

    return [
        { emphasis: true, label: labels.budgetRow, value: finance.budget },
        ...benchmark.sets.map((set) => ({ label: `${labels.sets[set.id]}, ${labels.median}`, value: set.median })),
    ]
}

/**
 * How the 2023 campaigns were funded, as the same six display rows the budget stack
 * uses — so a reader can compare our sources with theirs row by row.
 */
export const benchmarkShareRows = (benchmark: Benchmark, lang: Lang): BarRow[] => {
    const merged = mergeParty(benchmark.shares)
    const labels = financeLabels[lang]

    return DISPLAY_SOURCE_ORDER.map((source) => ({ label: labels.sources[source], value: merged[source] }))
}

/**
 * Spent against raised, or undefined while no spending figure is confirmed: the page
 * then prints the pending line instead of a figure it cannot stand behind.
 *
 * No clamping. The data module's own spec refuses to build a campaign that reports
 * more spent than it has raised, so a negative here is a bug worth seeing.
 */
export const spendingSegments = (
    finance: CampaignFinance,
    lang: Lang
): { segments: FinanceSegment[]; total: number } | undefined => {
    if (finance.spent === undefined) return undefined

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

/**
 * The four headline figures, in one place rather than composed in each of the three
 * pages and again in the teaser. Spending is not among them: it has a section of its
 * own, and while it is unconfirmed there is no figure to show.
 */
export const summaryTiles = (
    finance: CampaignFinance,
    lang: Lang
): { label: string; note?: string; value: string }[] => {
    const labels = financeLabels[lang]

    return [
        { label: labels.budget, value: formatEuro(finance.budget, lang) },
        { label: labels.raised, value: formatEuro(totalRaised(finance), lang) },
        { label: labels.committed, value: formatEuro(finance.ownCommitment, lang) },
        {
            label: labels.gap,
            note: labels.asOf(formatDate(finance.asOf, lang)),
            value: formatEuro(gapToBudget(finance), lang),
        },
    ]
}
