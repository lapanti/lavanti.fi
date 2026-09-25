/**
 * Campaign finance figures for the 2027 parliamentary election campaign.
 *
 * One module, one set of numbers: the page, the summary stats and the teaser on the
 * election pages all read from here, so updating the campaign's finances is a single
 * edit plus an `updatedDate` bump on the pages that show them. Nothing else in the
 * repo may hold a copy of a figure.
 *
 * Categories and their names follow the statutory vaalirahoitusilmoitus — laki
 * ehdokkaan vaalirahoituksesta 273/2009 §6, fields 2.1–2.7 — so a reader can check
 * this page line by line against the disclosure that VTV publishes after the
 * election. A category that is zero stays in the list: "no loans, no party money" is
 * itself the thing being disclosed.
 */

import type { Lang } from './nav'

/** Names follow laki ehdokkaan vaalirahoituksesta 273/2009 §6 (2.1–2.7). */
export type FundingSource = 'companies' | 'loans' | 'other' | 'own' | 'party' | 'partyAssociations' | 'private'

/** What the page shows: `partyAssociations` is folded into `party` by `mergeParty`. */
export type DisplaySource = Exclude<FundingSource, 'partyAssociations'>

/**
 * Reading order on the page, following §6. An object literal cannot carry it:
 * eslint `sort-keys` forces every record here into alphabetical order.
 */
export const DISPLAY_SOURCE_ORDER: readonly DisplaySource[] = ['own', 'loans', 'private', 'companies', 'party', 'other']

export interface CampaignFinance {
    /** ISO date the figures were last confirmed — printed on the page as "tilanne". */
    asOf: string
    /** Planned total spend for the whole campaign, whole euros. */
    budget: number
    /** Received so far per §6 category, whole euros. */
    raised: Record<FundingSource, number>
    /** Paid out so far, whole euros. */
    spent: number
}

export interface BenchmarkSet {
    id: 'all' | 'uusimaa'
    mean: number
    median: number
    n: number
}

export interface Benchmark {
    /** ISO date the CSV below was fetched and the figures computed. */
    retrievedDate: string
    sets: BenchmarkSet[]
    /** Percent of all reported financing, one decimal. */
    shares: Record<FundingSource, number>
    sourceUrl: string
}

/**
 * Placeholders until the campaign account is open. Every figure is a whole euro:
 * cents on a transparency page invite precision the campaign cannot promise.
 */
export const campaignFinance: CampaignFinance = {
    asOf: '2026-09-25',
    budget: 30000,
    raised: {
        companies: 0,
        loans: 0,
        other: 0,
        own: 10000,
        party: 0,
        partyAssociations: 0,
        private: 0,
    },
    spent: 5000,
}

/**
 * What a seat in parliament cost in 2023.
 *
 * Computed from VTV's final disclosures CSV (`E_VI_eduskuntavaalit2023.csv`,
 * retrieved 2026-09-25): 273 filers, i.e. everyone elected as an MP or named as an
 * alternate. The file is semicolon-separated, single-quote quoted, decimal comma,
 * and carries no elected/alternate flag, so both groups are in every figure.
 *
 * - `median`/`mean`: of `Vaalikampanjan kulut yhteensa`.
 * - `uusimaa`: rows whose `Vaalipiiri/Kunta` contains "Uudenmaan".
 * - `shares`: Σ`2.x Rahoitus sisaltaa … yhteensa` / Σ`Vaalikampanjan rahoitus yhteensa`.
 *
 * Field 2.8 (mediated support) is left out on purpose: it marks money that also
 * appears under one of 2.3–2.7, so adding it would double-count.
 */
export const benchmark2023: Benchmark = {
    retrievedDate: '2026-09-25',
    sets: [
        { id: 'all', mean: 37540, median: 32634, n: 273 },
        { id: 'uusimaa', mean: 42517, median: 36355, n: 46 },
    ],
    shares: {
        companies: 20.1,
        loans: 1.1,
        other: 22.9,
        own: 24.7,
        party: 3,
        partyAssociations: 8.3,
        private: 19.9,
    },
    sourceUrl:
        'https://www.vaalirahoitusvalvonta.fi/fi/index/vaalirahoitus/haetietoavaalirahoitusilmoituksista/tutkitietoaineistoja/eduskuntavaalit2023/E_VI_eduskuntavaalit2023.csv',
}

export interface FinanceLabels {
    /** Receives `formatDate(iso, lang)` output, never the raw ISO string. */
    asOf: (formatted: string) => string
    budget: string
    /** Row label for our own budget in the benchmark comparison. */
    budgetRow: string
    gap: string
    mean: string
    median: string
    needed: string
    raised: string
    sets: Record<BenchmarkSet['id'], string>
    /** Receives `formatDate(retrievedDate, lang)` output. */
    source: (retrieved: string) => string
    sources: Record<DisplaySource, string>
    spent: string
    teaser: { cta: string; eyebrow: string; heading: string }
    unspent: string
}

/**
 * Every string the finance components render. Section headings and prose stay in the
 * three MDX pages, where they can be written for each language rather than translated.
 */
export const financeLabels: Record<Lang, FinanceLabels> = {
    en: {
        asOf: (formatted) => `Situation on ${formatted}`,
        budget: 'Campaign budget',
        budgetRow: 'Our budget',
        gap: 'Still to raise',
        mean: 'average',
        median: 'median',
        needed: 'Still to raise',
        raised: 'Raised so far',
        sets: { all: 'All of Finland', uusimaa: 'Uusimaa district' },
        source: (retrieved) =>
            `Source: campaign finance disclosures for the 2023 election, VTV. Retrieved ${retrieved}.`,
        sources: {
            companies: 'Companies',
            loans: 'Loans',
            other: 'Associations and other bodies',
            own: 'My own funds',
            party: 'The party and party associations',
            private: 'Private individuals',
        },
        spent: 'Spent so far',
        teaser: {
            cta: 'See the campaign finances',
            eyebrow: 'Transparency',
            heading: 'Who funds this campaign?',
        },
        unspent: 'Not yet spent',
    },
    fi: {
        asOf: (formatted) => `Tilanne ${formatted}`,
        budget: 'Kampanjabudjetti',
        budgetRow: 'Oma budjettimme',
        gap: 'Vielä kerättävä',
        mean: 'keskiarvo',
        median: 'mediaani',
        needed: 'Vielä kerättävä',
        raised: 'Kerätty tähän asti',
        sets: { all: 'Koko Suomi', uusimaa: 'Uudenmaan vaalipiiri' },
        source: (retrieved) =>
            `Lähde: vuoden 2023 eduskuntavaalien vaalirahoitusilmoitukset, VTV. Haettu ${retrieved}.`,
        sources: {
            companies: 'Yritykset',
            loans: 'Lainat',
            other: 'Yhdistykset ja muut tahot',
            own: 'Omat varat',
            party: 'Puolue ja puolueyhdistykset',
            private: 'Yksityishenkilöt',
        },
        spent: 'Käytetty tähän asti',
        teaser: {
            cta: 'Katso kampanjan rahoitus',
            eyebrow: 'Avoimuus',
            heading: 'Kuka rahoittaa tämän kampanjan?',
        },
        unspent: 'Käyttämättä',
    },
    sv: {
        asOf: (formatted) => `Situationen ${formatted}`,
        budget: 'Kampanjbudget',
        budgetRow: 'Vår egen budget',
        gap: 'Kvar att samla in',
        mean: 'medeltal',
        median: 'median',
        needed: 'Kvar att samla in',
        raised: 'Insamlat hittills',
        sets: { all: 'Hela Finland', uusimaa: 'Nylands valkrets' },
        source: (retrieved) => `Källa: valfinansieringsanmälningarna för riksdagsvalet 2023, VTV. Hämtat ${retrieved}.`,
        sources: {
            companies: 'Företag',
            loans: 'Lån',
            other: 'Föreningar och andra aktörer',
            own: 'Egna medel',
            party: 'Partiet och partiföreningar',
            private: 'Privatpersoner',
        },
        spent: 'Använt hittills',
        teaser: {
            cta: 'Se kampanjens finansiering',
            eyebrow: 'Öppenhet',
            heading: 'Vem finansierar den här kampanjen?',
        },
        unspent: 'Oanvänt',
    },
}
