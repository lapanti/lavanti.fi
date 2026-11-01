/**
 * Build-time helpers for the post 96 charts: number formatting and the square
 * allocation of the waffle charts.
 *
 * Free of `Intl` for the same reason as `campaignFinance.ts`: ICU output differs
 * between Node versions and browsers, and these strings land in snapshots.
 */

import type { Lang } from '../content/nav'
import type { InterestYear, WaffleData, WaffleFill, WaffleGroup } from '../content/publicFinance2027'

const NBSP = ' '

/** A bare number with a decimal comma in Finnish and Swedish: "4,5". */
export const formatDecimal = (value: number, decimals: number, lang: Lang): string => {
    const fixed = value.toFixed(decimals)

    return lang === 'en' ? fixed : fixed.replace('.', ',')
}

/** Billions of euros: "46 mrd €", "46 md €", "€46bn". */
export const formatBn = (value: number, lang: Lang, decimals = 0): string => {
    const amount = formatDecimal(value, decimals, lang)
    if (lang === 'en') return `€${amount}bn`

    return `${amount}${NBSP}${lang === 'fi' ? 'mrd' : 'md'}${NBSP}€`
}

/** "29 %" in Finnish and Swedish, "29%" in English. */
export const formatShare = (value: number, lang: Lang, decimals = 0): string =>
    `${formatDecimal(value, decimals, lang)}${lang === 'en' ? '' : NBSP}%`

/**
 * One decimal below ten billion and none above, the way the post writes the figures:
 * "7,0 mrd €" for defence but "46 mrd €" for income taxes.
 */
export const decimalsFor = (value: number): number => (value < 9.95 ? 1 : 0)

export const groupValue = (group: WaffleGroup): number =>
    Math.round(group.items.reduce((sum, item) => sum + item.value, 0) * 10) / 10

export interface WaffleCell {
    color: string
    fill: WaffleFill
    group: string
    item: string
}

/**
 * Whole numbers that add up to `total`, each within one of its value: the
 * largest-remainder method. Ties go to the earlier entry.
 */
export const apportion = (values: number[], total: number): number[] => {
    const counts = values.map((value) => Math.floor(value))
    const missing = total - counts.reduce((sum, count) => sum + count, 0)
    const byRemainder = values
        .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
        .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    for (const { index } of byRemainder.slice(0, missing)) counts[index] += 1

    return counts
}

/**
 * One square per billion, in reading order. Groups are rounded first and their items
 * within them, so a group's square count matches the whole-billion figure its legend
 * entry prints wherever the total allows.
 */
export const waffleCells = (data: WaffleData): WaffleCell[] => {
    const groupCounts = apportion(data.groups.map(groupValue), Math.round(data.total))

    return data.groups.flatMap((group, groupIndex) => {
        const itemCounts = apportion(
            group.items.map((item) => item.value),
            groupCounts[groupIndex]
        )

        return group.items.flatMap((item, index) =>
            Array.from({ length: itemCounts[index] }, () => ({
                color: item.color,
                fill: item.fill,
                group: group.key,
                item: item.key,
            }))
        )
    })
}

/** Interest as a share of total spending, in percent. */
export const interestShare = (year: InterestYear): number => (100 * year.interest) / year.spending
