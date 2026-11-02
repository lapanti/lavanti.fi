/**
 * Chart data for post 97 (earnings-related pension funding and the index freeze).
 *
 * One module for all three locales, so the fi, sv and en charts cannot drift apart.
 * The post's prose states the same figures in words; a change here needs the matching
 * change in all three MDX files and an `updatedDate` bump.
 *
 * Sources, as named in each chart's caption:
 * - Contribution 1963–2025: ETK statistical database, aikas02 contribution income ÷
 *   aikas04 wage sum, TEL/LEL/TaEL/TyEL, employer + employee (updated 15.5.2026). A
 *   derived series, not the official rate. 2025 preliminary; 2020 dip = temporary
 *   COVID-era reduction.
 * - Pensioners per 100 employed: three series with three definitions, never joined.
 *   1962–1970 kansaneläkkeet in force (Suomen tilastollinen vuosikirja 1964 table 181,
 *   1971 table 185); 1981–2025 all työ- or kansaneläke recipients (ETK statistical
 *   database); employed from Statistics Finland StatFin 15ai. 2025–2100: ETK long-term
 *   projection PAL 2026, tables 3.2.3 and 4.4.3, baseline.
 * - Return by cohort: ETK PAL 2026, figure 5.17, private-sector employees, lifetime real
 *   benefits ÷ contributions. Cohorts after 1960 are projections.
 * - Life expectancy coefficient: ETK PAL 2026, tables 4.2 (retirement age), 7.2 and 6.1
 *   (coefficient); the cut is 1 − coefficient.
 */

import type { Lang } from './nav'

type Localised = Record<Lang, string>

interface LineSeries {
    /** Dashed for a projection. */
    dashed?: boolean
    key: string
    label: Localised
    /** Muted for a series of another definition drawn for context. */
    muted?: boolean
    /** [year, value] pairs, ascending by year. */
    points: [number, number][]
}

export interface LineChartData {
    /** Values are percentages: "24,7 %". */
    percent?: boolean
    series: LineSeries[]
    /** Axis unit line above the plot. */
    unit: Localised
    /** Years that get an x-axis label. */
    xTicks: number[]
    yMax: number
    yTicks: number[]
}

interface CohortBar {
    /** Lowest old-age retirement age in decimal years (65.58 = 65 years 7 months). */
    age?: number
    /** Drawn in the strong colour; the rest are muted. */
    highlight?: boolean
    /** Value printed over the bar. */
    tag?: boolean
    value: number
    year: number
}

export interface CohortChartData {
    bars: CohortBar[]
    /** Key entries for the strong and the muted bars; omit when every bar is the same. */
    key?: { highlight: Localised; muted: Localised }
    /** Readout line under the value. */
    measure: Localised
    /** Number format of a value. */
    suffix: 'percent' | 'times'
    unit: Localised
    yMax: number
    yTicks: number[]
}

/** ETK aikas02 ÷ aikas04, fetched 2026-10-30. */
export const pensionContribution: LineChartData = {
    percent: true,
    series: [
        {
            key: 'tyel',
            label: { en: 'Contribution', fi: 'Maksu', sv: 'Avgift' },
            points: [
                [1963, 4.4],
                [1964, 4.7],
                [1965, 4.5],
                [1966, 4.4],
                [1967, 4.3],
                [1968, 4.7],
                [1969, 5.1],
                [1970, 5],
                [1971, 5.3],
                [1972, 6.3],
                [1973, 7.5],
                [1974, 7.3],
                [1975, 8.2],
                [1976, 9.7],
                [1977, 12.1],
                [1978, 10.5],
                [1979, 12.1],
                [1980, 13.9],
                [1981, 13.6],
                [1982, 12.3],
                [1983, 11.5],
                [1984, 11.3],
                [1985, 12.3],
                [1986, 13.2],
                [1987, 13.8],
                [1988, 14.6],
                [1989, 15.2],
                [1990, 18],
                [1991, 17.5],
                [1992, 14.9],
                [1993, 18.2],
                [1994, 18.7],
                [1995, 19.8],
                [1996, 20.2],
                [1997, 20],
                [1998, 20.6],
                [1999, 20.8],
                [2000, 20],
                [2001, 21],
                [2002, 21.6],
                [2003, 21.1],
                [2004, 21.1],
                [2005, 20.8],
                [2006, 21.1],
                [2007, 20.9],
                [2008, 21.1],
                [2009, 21.1],
                [2010, 21.2],
                [2011, 21.9],
                [2012, 22.7],
                [2013, 22.8],
                [2014, 23.2],
                [2015, 23.9],
                [2016, 24.1],
                [2017, 24.1],
                [2018, 24.1],
                [2019, 24.5],
                [2020, 22.6],
                [2021, 24.2],
                [2022, 24.5],
                [2023, 24.6],
                [2024, 24.6],
                [2025, 24.7],
            ],
        },
    ],
    unit: { en: '% of payroll', fi: '% palkkasummasta', sv: '% av lönesumman' },
    xTicks: [1963, 1980, 2000, 2025],
    yMax: 30,
    yTicks: [0, 10, 20, 30],
}

/** Statistical Yearbook, ETK and Statistics Finland fetched 2026-10-30; ETK PAL 2026 (15.6.2026). */
export const pensionersPerEmployed: LineChartData = {
    series: [
        {
            key: 'kela',
            label: { en: 'National pensions', fi: 'Kansaneläkkeet', sv: 'Folkpensioner' },
            muted: true,
            points: [
                [1962, 22.9],
                [1963, 23.5],
                [1965, 24],
                [1970, 28.5],
            ],
        },
        {
            key: 'etk',
            label: { en: 'Pension recipients', fi: 'Eläkkeensaajat', sv: 'Pensionstagare' },
            points: [
                [1981, 42.4],
                [1982, 42.4],
                [1983, 43.3],
                [1984, 43.7],
                [1985, 44],
                [1986, 45.6],
                [1987, 46],
                [1988, 46.4],
                [1989, 46.4],
                [1990, 47],
                [1991, 50.2],
                [1992, 54.4],
                [1993, 58.4],
                [1994, 60],
                [1995, 59.2],
                [1996, 58.9],
                [1997, 57.5],
                [1998, 56.8],
                [1999, 56.4],
                [2000, 55.8],
                [2001, 55.5],
                [2002, 55.7],
                [2003, 56.1],
                [2004, 56.1],
                [2005, 56.1],
                [2006, 55.7],
                [2007, 55.2],
                [2008, 54.9],
                [2009, 57.5],
                [2010, 58.8],
                [2011, 58.6],
                [2012, 58.7],
                [2013, 59.9],
                [2014, 60.8],
                [2015, 61.2],
                [2016, 61.6],
                [2017, 62.3],
                [2018, 61.2],
                [2019, 60.8],
                [2020, 62.5],
                [2021, 61.2],
                [2022, 60.1],
                [2023, 59.6],
                [2024, 60.4],
                [2025, 60.2],
            ],
        },
        {
            dashed: true,
            key: 'pal',
            label: { en: 'ETK projection', fi: 'ETK:n laskelma', sv: 'PSC:s beräkning' },
            points: [
                [2025, 63.2],
                [2030, 62.5],
                [2035, 61.1],
                [2040, 58.7],
                [2060, 64.6],
                [2080, 76.7],
                [2100, 81.8],
            ],
        },
    ],
    unit: {
        en: 'Pension recipients per 100 employed',
        fi: 'Eläkkeensaajia 100 työllistä kohden',
        sv: 'Pensionstagare per 100 sysselsatta',
    },
    xTicks: [1962, 2000, 2050, 2100],
    yMax: 100,
    yTicks: [0, 25, 50, 75, 100],
}

/** ETK PAL 2026, figure 5.17 workbook (% → ×, one decimal). */
export const pensionReturnByCohort: CohortChartData = {
    bars: [
        { highlight: true, tag: true, value: 4.7, year: 1940 },
        { highlight: true, value: 3.4, year: 1945 },
        { highlight: true, value: 2.8, year: 1950 },
        { highlight: true, value: 2.3, year: 1955 },
        { highlight: true, tag: true, value: 2, year: 1960 },
        { value: 1.8, year: 1965 },
        { value: 1.8, year: 1970 },
        { tag: true, value: 1.7, year: 1975 },
        { value: 1.7, year: 1980 },
        { value: 1.8, year: 1985 },
        { value: 1.8, year: 1990 },
        { value: 1.8, year: 1995 },
        { value: 1.8, year: 2000 },
        { value: 1.8, year: 2005 },
        { tag: true, value: 1.8, year: 2010 },
    ],
    key: {
        highlight: { en: 'Now of retirement age', fi: 'Nyt eläkeiässä', sv: 'Nu i pensionsåldern' },
        muted: { en: 'Younger cohorts (projection)', fi: 'Nuoremmat (laskelma)', sv: 'Yngre (beräkning)' },
    },
    measure: {
        en: 'pensions relative to contributions',
        fi: 'eläkkeitä maksuihin nähden',
        sv: 'pension i förhållande till avgifterna',
    },
    suffix: 'times',
    unit: { en: 'Pensions ÷ contributions', fi: 'Eläkkeet ÷ maksut', sv: 'Pension ÷ avgifter' },
    yMax: 5,
    yTicks: [0, 1, 2, 3, 4, 5],
}

/** ETK PAL 2026, tables 4.2, 6.1 and 7.2; cut = 1 − coefficient. */
export const lifeExpectancyCut: CohortChartData = {
    bars: [
        { age: 65, highlight: true, tag: true, value: 5.5, year: 1965 },
        { age: 65.58, highlight: true, value: 6.2, year: 1970 },
        { age: 66.08, highlight: true, value: 7.1, year: 1975 },
        { age: 66.5, highlight: true, value: 8.2, year: 1980 },
        { age: 67, highlight: true, value: 8.9, year: 1985 },
        { age: 67.42, highlight: true, tag: true, value: 9.7, year: 1990 },
        { age: 67.92, highlight: true, value: 10.2, year: 1995 },
        { age: 68.25, highlight: true, value: 11.1, year: 2000 },
        { age: 68.67, highlight: true, value: 11.7, year: 2005 },
        { age: 69, highlight: true, tag: true, value: 12.4, year: 2010 },
    ],
    measure: {
        en: 'cut to the monthly pension',
        fi: 'leikkaus kuukausieläkkeeseen',
        sv: 'nedskärning av månadspensionen',
    },
    suffix: 'percent',
    unit: { en: 'Cut, %', fi: 'Leikkaus, %', sv: 'Nedskärning, %' },
    yMax: 15,
    yTicks: [0, 5, 10, 15],
}
