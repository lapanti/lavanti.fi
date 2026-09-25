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
 * election. A category that is zero stays in the list rather than being hidden: a
 * source that has given nothing is part of what the page discloses.
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
    /**
     * Public donation channel. Undefined until the account is open: the page then
     * says the link is coming instead of rendering a dead button. The finance page
     * is not meant to go live without it.
     */
    donationUrl?: string
    /**
     * Money the candidate has undertaken to put in but has not paid in yet. It is a
     * backstop rather than a receipt: it shrinks if donations cover the budget
     * instead, so it is counted separately from `raised` and never added to it.
     */
    ownCommitment: number
    /** Received so far per §6 category, whole euros. Nothing pledged, only banked. */
    raised: Record<FundingSource, number>
    /**
     * Paid out so far, whole euros. Undefined while no spending has been confirmed —
     * the page then says so instead of printing a zero it cannot stand behind.
     */
    spent?: number
}

interface BenchmarkSet {
    id: 'all' | 'uusimaa'
    mean: number
    median: number
    n: number
    /** Lower quartile: a quarter of the campaigns cost less than this. */
    q1: number
    /** Upper quartile: a quarter cost more. */
    q3: number
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
 * The state on `asOf`. No donations have come in: the campaign account is not open, so
 * every outside source is zero. The 2 000 € already spent came from the candidate's own
 * pocket, which is why it appears under `own` — money paid in, not pledged — while the
 * remaining 8 000 € of his 10 000 € undertaking stays in `ownCommitment`. The spending
 * figure is provisional and is to be replaced with the exact one before launch.
 *
 * Every figure is a whole euro; cents on a transparency page invite precision the
 * campaign cannot promise.
 */
export const campaignFinance: CampaignFinance = {
    asOf: '2026-09-25',
    budget: 30000,
    // TODO: set donationUrl before this page is published.
    ownCommitment: 8000,
    raised: {
        companies: 0,
        loans: 0,
        other: 0,
        own: 2000,
        party: 0,
        partyAssociations: 0,
        private: 0,
    },
    // TODO: replace with the exact figure before launch.
    spent: 2000,
}

/**
 * What a seat in parliament cost in 2023.
 *
 * Computed from VTV's final disclosures CSV (`E_VI_eduskuntavaalit2023.csv`,
 * retrieved 2026-09-25): 273 filers, i.e. everyone elected as an MP or named as an
 * alternate. The file is semicolon-separated, single-quote quoted, decimal comma,
 * and carries no elected/alternate flag, so both groups are in every figure.
 *
 * - `median`/`mean`/`q1`/`q3`: of `Vaalikampanjan kulut yhteensa`. The distribution is
 *   right-skewed — nationally the mean sits about 15 % above the median, and the range
 *   runs from 0 € to 136 739 € — so the quartiles, not the mean, carry the spread.
 * - `uusimaa`: rows whose `Vaalipiiri/Kunta` contains "Uudenmaan".
 * - `shares`: Σ`2.x Rahoitus sisaltaa … yhteensa` / Σ`Vaalikampanjan rahoitus yhteensa`.
 *
 * Field 2.8 (mediated support) is left out on purpose: it marks money that also
 * appears under one of 2.3–2.7, so adding it would double-count.
 */
export const benchmark2023: Benchmark = {
    retrievedDate: '2026-09-25',
    sets: [
        { id: 'all', mean: 37540, median: 32634, n: 273, q1: 19801, q3: 48986 },
        { id: 'uusimaa', mean: 42517, median: 36355, n: 46, q1: 25566, q3: 59106 },
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
    /** Money undertaken but not yet paid in. */
    committed: string
    /** Donation call to action, and what to say while the channel is still closed. */
    donate: { cta: string; pending: string }
    gap: string
    mean: string
    median: string
    needed: string
    raised: string
    sets: Record<BenchmarkSet['id'], string>
    /** Receives `formatDate(retrievedDate, lang)` output. */
    source: (retrieved: string) => string
    /** Link text for the CSV itself, so the anchor is short and readable. */
    sourceLinkText: string
    sources: Record<DisplaySource, string>
    spent: string
    /** Stands in for the spending figure while none is confirmed. */
    spentPending: string
    teaser: { cta: string; eyebrow: string; heading: string }
    unspent: string
}

/**
 * Every string the finance components render. Section headings and prose stay in the
 * three MDX pages, where they can be written for each language rather than translated.
 */
export const financeLabels: Record<Lang, FinanceLabels> = {
    en: {
        asOf: (formatted) => `As of ${formatted}`,
        budget: 'Campaign budget',
        budgetRow: 'Our budget',
        committed: 'My own commitment',
        donate: {
            cta: 'Support the campaign',
            pending: 'The donation link is published here as soon as the campaign account is open.',
        },
        gap: 'Still to raise',
        mean: 'average',
        median: 'median',
        needed: 'Still to raise',
        raised: 'Raised so far',
        sets: { all: 'All of Finland', uusimaa: 'Uusimaa district' },
        source: (retrieved) =>
            `Source: campaign finance disclosures for the 2023 election, National Audit Office of Finland. Retrieved ${retrieved}.`,
        sourceLinkText: 'Open the disclosure data',
        sources: {
            companies: 'Companies',
            loans: 'Loans',
            other: 'Associations and other bodies',
            own: 'My own funds',
            party: 'The party and party associations',
            private: 'Private individuals',
        },
        spent: 'Spent so far',
        spentPending:
            'No spending figure is confirmed yet. It appears here, itemised, once the campaign account is open.',
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
        budgetRow: 'Oma budjettini',
        committed: 'Oma sitoumukseni',
        donate: {
            cta: 'Tue kampanjaa',
            pending: 'Lahjoituslinkki tulee tälle sivulle heti, kun kampanjatili on auki.',
        },
        gap: 'Vielä kerättävä',
        mean: 'keskiarvo',
        median: 'mediaani',
        needed: 'Vielä kerättävä',
        raised: 'Kerätty',
        sets: { all: 'Koko Suomi', uusimaa: 'Uudenmaan vaalipiiri' },
        source: (retrieved) =>
            `Lähde: vuoden 2023 eduskuntavaalien vaalirahoitusilmoitukset, VTV. Haettu ${retrieved}.`,
        sourceLinkText: 'Avaa ilmoitusaineisto',
        sources: {
            companies: 'Yritykset',
            loans: 'Lainat',
            other: 'Yhdistykset ja muut tahot',
            own: 'Omat varat',
            party: 'Puolue ja puolueyhdistykset',
            private: 'Yksityishenkilöt',
        },
        spent: 'Käytetty',
        spentPending: 'Kuluja ei ole vielä vahvistettu. Ne tulevat tähän eriteltyinä heti, kun kampanjatili on auki.',
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
        committed: 'Mitt eget åtagande',
        donate: {
            cta: 'Stöd kampanjen',
            pending: 'Donationslänken publiceras här så snart kampanjkontot är öppet.',
        },
        gap: 'Kvar att samla in',
        mean: 'medeltal',
        median: 'median',
        needed: 'Kvar att samla in',
        raised: 'Insamlat hittills',
        sets: { all: 'Hela Finland', uusimaa: 'Nylands valkrets' },
        source: (retrieved) =>
            `Källa: redovisningarna av valfinansieringen för riksdagsvalet 2023, Statens revisionsverk. Hämtat ${retrieved}.`,
        sourceLinkText: 'Öppna redovisningsuppgifterna',
        sources: {
            companies: 'Företag',
            loans: 'Lån',
            other: 'Föreningar och andra aktörer',
            own: 'Egna medel',
            party: 'Partiet och partiföreningar',
            private: 'Privatpersoner',
        },
        spent: 'Använt hittills',
        spentPending:
            'Ingen kostnadssiffra är bekräftad än. Den kommer hit, specificerad, så snart kampanjkontot är öppet.',
        teaser: {
            cta: 'Se kampanjens finansiering',
            eyebrow: 'Öppenhet',
            heading: 'Vem finansierar den här kampanjen?',
        },
        unspent: 'Oanvänt',
    },
}
