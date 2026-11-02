/**
 * Build-time helpers for the post 97 charts. Free of `Intl` for the same reason as
 * `publicFinanceCharts.ts`: these strings land in snapshots.
 */

import type { Lang } from '../content/nav'
import type { CohortChartData } from '../content/pensionFunding'

import { formatDecimal, formatShare } from './publicFinanceCharts'

const NBSP = ' '

const ageUnits: Record<Lang, { months: string; years: string }> = {
    en: { months: 'mo', years: 'y' },
    fi: { months: 'kk', years: 'v' },
    sv: { months: 'mån', years: 'år' },
}

/** Decimal years as years and months, the way ETK prints a retirement age: 65.58 → "65 v 7 kk". */
export const formatAge = (age: number, lang: Lang): string => {
    const total = Math.round(age * 12)
    const years = Math.floor(total / 12)
    const months = total % 12
    const { months: m, years: y } = ageUnits[lang]

    return months === 0 ? `${years}${NBSP}${y}` : `${years}${NBSP}${y} ${months}${NBSP}${m}`
}

/** "4,7×" or "12,4 %" in Finnish and Swedish; "4.7×" or "12.4%" in English. */
export const formatCohortValue = (value: number, suffix: CohortChartData['suffix'], lang: Lang): string =>
    suffix === 'percent' ? formatShare(value, lang, 1) : `${formatDecimal(value, 1, lang)}×`
