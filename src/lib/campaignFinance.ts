/**
 * Arithmetic and formatting for the campaign finance page.
 *
 * Deliberately free of `Intl`: ICU group separators and month names differ between
 * Node builds, and every string here lands in an e2e aria snapshot. Hand-rolled
 * formatting keeps the goldens stable wherever the site is built.
 */

import type {
    Benchmark,
    CampaignFinance,
    DisplaySource,
    Expense,
    FundingSource,
    Income,
} from '../content/campaignFinance'
import type { Lang } from '../content/nav'

import { DISPLAY_SOURCE_ORDER, EXPENSE_CATEGORY_ORDER, financeLabels } from '../content/campaignFinance'
import { colors } from './styles'

/**
 * Segment colours, all from the Signal Band palette: the five signal colours for the
 * funding sources, the grounds for the neutral rows. The palest of them would vanish
 * against the oat and off-white plates, so FinanceStack outlines every swatch and
 * segment rather than substituting an off-palette colour. `needed` is hatched whole.
 */
export type Tone = 'companies' | 'loans' | 'needed' | 'other' | 'own' | 'party' | 'private' | 'spent' | 'unspent'

export const toneColors: Record<Tone, string> = {
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

/**
 * Money bound to move but not moved yet — income contractually coming, spending the
 * campaign is bound to pay. Drawn hatched after `value`, in the same tone, and named
 * in the text by `pendingLabel` ("tilittämättä", "sitouduttu").
 */
interface Pending {
    pending?: number
    pendingLabel?: string
}

export interface FinanceSegment extends Pending {
    id: string
    label: string
    tone: Tone
    value: number
}

export interface BarRow extends Pending {
    /** Our own figure among the comparisons. */
    emphasis?: boolean
    label: string
    /** The planned amount, drawn as a marker on the track and printed after a slash. */
    target?: number
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

/** Banked and pending income, each summed over every funding source. */
export const totalRaised = (finance: CampaignFinance): Income =>
    Object.values(finance.raised).reduce(
        (sum, income) => ({ banked: sum.banked + income.banked, pending: sum.pending + income.pending }),
        { banked: 0, pending: 0 }
    )

/** Budgeted, paid and committed spending, each summed over every category. */
export const totalSpent = (finance: CampaignFinance): Expense =>
    Object.values(finance.spent).reduce(
        (sum, expense) => ({
            banked: sum.banked + expense.banked,
            budgeted: sum.budgeted + expense.budgeted,
            committed: sum.committed + expense.committed,
        }),
        { banked: 0, budgeted: 0, committed: 0 }
    )

/**
 * What is left to find. Pending income counts towards the budget: it is bound by a
 * contract, so the budget can rely on it.
 *
 * Clamped at zero: a campaign that overshoots its budget has nothing left to collect,
 * and a negative "still needed" row would read as a debt.
 */
export const gapToBudget = (finance: CampaignFinance): number => {
    const raised = totalRaised(finance)

    return Math.max(0, finance.budget - raised.banked - raised.pending)
}

/** One decimal. A whole that is zero or negative has no parts, so the share is 0. */
export const percentOf = (part: number, whole: number): number =>
    whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0

/** Bar width as a whole percent. `max` at or below zero means every bar is empty. */
export const barWidth = (value: number, max: number): number =>
    max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0

/** The scale for a bar group: its largest value, so the tallest bar fills the track. */
export const barsMax = (values: number[]): number => values.reduce((max, value) => Math.max(max, value), 0)

/** A whole number grouped in threes: no-break spaces in fi/sv, commas in English. */
export const formatInteger = (value: number, lang: Lang): string =>
    Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : NBSP)

/** One decimal, with a decimal comma in fi/sv. */
export const formatDecimal = (value: number, lang: Lang): string => {
    const rounded = (Math.round(value * 10) / 10).toFixed(1)

    return lang === 'en' ? rounded : rounded.replace('.', ',')
}

/**
 * Whole euros, grouped in threes. Finnish and Swedish put the sign last after a
 * no-break space; English puts it first, the way both locales write money.
 */
export const formatEuro = (value: number, lang: Lang): string => {
    const grouped = formatInteger(value, lang)

    return lang === 'en' ? `€${grouped}` : `${grouped}${NBSP}€`
}

/**
 * An amount and what is still on its way: "3 000 € + 7 000 € tilittämättä". Just the
 * amount when nothing is pending, so a settled figure reads as plainly as before.
 */
export const withPending = (
    value: number,
    pending: number | undefined,
    suffix: string | undefined,
    lang: Lang
): string =>
    pending && pending > 0
        ? `${formatEuro(value, lang)} + ${formatEuro(pending, lang)}${suffix ? ` ${suffix}` : ''}`
        : formatEuro(value, lang)

/** One decimal, comma in fi/sv with a no-break space before the sign. */
export const formatPercent = (value: number, lang: Lang): string => {
    const rounded = formatDecimal(value, lang)

    return lang === 'en' ? `${rounded}%` : `${rounded}${NBSP}%`
}

/**
 * One benchmark set by id. The pages' prose reads its figures through this, so a
 * missing set fails the build instead of printing "undefined".
 */
export const benchmarkSet = (benchmark: Benchmark, id: Benchmark['sets'][number]['id']): Benchmark['sets'][number] => {
    const set = benchmark.sets.find((candidate) => candidate.id === id)
    if (!set) {
        throw new Error(`campaignFinance: no benchmark set "${id}"`)
    }
    return set
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

/** One field of every funding source, as the plain amounts `mergeParty` takes. */
const incomeField = (raised: Record<FundingSource, Income>, field: keyof Income): Record<FundingSource, number> =>
    Object.fromEntries(Object.entries(raised).map(([source, income]) => [source, income[field]])) as Record<
        FundingSource,
        number
    >

/**
 * Where the budget stands: every funding source in statutory order, banked solid and
 * pending hatched after it, then what is still missing. Zero sources stay in the list
 * — the zero is the disclosure.
 *
 * The total is `max(budget, …)` so an overshooting campaign still renders a bar whose
 * segments sum to the whole.
 */
export const budgetSegments = (finance: CampaignFinance, lang: Lang): { segments: FinanceSegment[]; total: number } => {
    const banked = mergeParty(incomeField(finance.raised, 'banked'))
    const pending = mergeParty(incomeField(finance.raised, 'pending'))
    const raised = totalRaised(finance)
    const labels = financeLabels[lang]
    const segments: FinanceSegment[] = DISPLAY_SOURCE_ORDER.map((source) => ({
        id: source,
        label: labels.sources[source],
        pending: pending[source],
        pendingLabel: labels.pending,
        tone: source,
        value: banked[source],
    }))

    return {
        segments: [...segments, { id: 'needed', label: labels.needed, tone: 'needed', value: gapToBudget(finance) }],
        total: Math.max(finance.budget, raised.banked + raised.pending),
    }
}

/**
 * Where the money goes, one row per statutory expense category: paid solid, committed
 * hatched after it, the budgeted amount as a marker. Zero categories stay listed.
 */
export const categoryRows = (finance: CampaignFinance, lang: Lang): BarRow[] => {
    const labels = financeLabels[lang]

    return EXPENSE_CATEGORY_ORDER.map((category) => ({
        label: labels.categories[category],
        pending: finance.spent[category].committed,
        pendingLabel: labels.committed,
        target: finance.spent[category].budgeted,
        value: finance.spent[category].banked,
    }))
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
 * Spending against the money raised (banked and pending), or undefined while nothing
 * has been paid or committed: the page then prints the pending line instead.
 *
 * Committed spending may run ahead of income, since a contract can come before the
 * money; the total then grows to cover it, so `unspent` never goes negative.
 */
export const spendingSegments = (
    finance: CampaignFinance,
    lang: Lang
): { segments: FinanceSegment[]; total: number } | undefined => {
    const spent = totalSpent(finance)
    if (spent.banked + spent.committed === 0) return undefined

    const income = totalRaised(finance)
    const raised = income.banked + income.pending
    const labels = financeLabels[lang]

    return {
        segments: [
            {
                id: 'spent',
                label: labels.spent,
                pending: spent.committed,
                pendingLabel: labels.committed,
                tone: 'spent',
                value: spent.banked,
            },
            {
                id: 'unspent',
                label: labels.unspent,
                tone: 'unspent',
                value: Math.max(0, raised - spent.banked - spent.committed),
            },
        ],
        total: Math.max(raised, spent.banked + spent.committed),
    }
}

/** "+ 7 000 € tilittämättä", or nothing when no money is on its way. */
const pendingNote = (pending: number, suffix: string, lang: Lang): string | undefined =>
    pending > 0 ? `+ ${formatEuro(pending, lang)} ${suffix}` : undefined

/**
 * The four headline figures, in one place rather than composed in each of the three
 * pages and again in the teaser. Raised and spent show what has moved, with what is
 * bound to move as a note under each.
 */
export const summaryTiles = (
    finance: CampaignFinance,
    lang: Lang
): { label: string; note?: string; value: string }[] => {
    const labels = financeLabels[lang]
    const raised = totalRaised(finance)
    const spent = totalSpent(finance)

    return [
        { label: labels.budget, value: formatEuro(finance.budget, lang) },
        {
            label: labels.raised,
            note: pendingNote(raised.pending, labels.pending, lang),
            value: formatEuro(raised.banked, lang),
        },
        {
            label: labels.spent,
            note: pendingNote(spent.committed, labels.committed, lang),
            value: formatEuro(spent.banked, lang),
        },
        {
            label: labels.gap,
            note: labels.asOf(formatDate(finance.asOf, lang)),
            value: formatEuro(gapToBudget(finance), lang),
        },
    ]
}
