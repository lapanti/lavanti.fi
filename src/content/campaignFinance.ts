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

// The attribute is for the e2e page objects, which Playwright loads through Node's own ESM loader.
import figures from './campaignFinanceFigures.json' with { type: 'json' }

/** Names follow laki ehdokkaan vaalirahoituksesta 273/2009 §6 (2.1–2.7). */
export type FundingSource = 'companies' | 'loans' | 'other' | 'own' | 'party' | 'partyAssociations' | 'private'

/** What the page shows: `partyAssociations` is folded into `party` by `mergeParty`. */
export type DisplaySource = Exclude<FundingSource, 'partyAssociations'>

/**
 * Reading order on the page, following §6. An object literal cannot carry it:
 * eslint `sort-keys` forces every record here into alphabetical order.
 */
export const DISPLAY_SOURCE_ORDER: readonly DisplaySource[] = ['own', 'loans', 'private', 'companies', 'party', 'other']

/** The expense categories of the statutory disclosure (Vaalimainonta medioissa … Muut kulut). */
export type ExpenseCategory = 'design' | 'events' | 'media' | 'other' | 'outdoor' | 'print' | 'supportCosts'

/** Reading order of the expense categories, following the disclosure form. */
export const EXPENSE_CATEGORY_ORDER: readonly ExpenseCategory[] = [
    'media',
    'outdoor',
    'print',
    'design',
    'events',
    'supportCosts',
    'other',
]

/** One funding source. Hatched on the page while pending, solid once banked. */
export interface Income {
    /** On the campaign account (the budget sheet's Toteutunut). */
    banked: number
    /** Contractually coming but not yet remitted (Tilittämättä). A promise is neither. */
    pending: number
}

/** One expense category: the plan, and what has gone out or is bound to. */
export interface Expense {
    /** Paid out (Toteutunut). */
    banked: number
    /** Planned (Budjetoitu). */
    budgeted: number
    /** Bound to be paid: an accepted offer or invoice (Sitouduttu). */
    committed: number
}

/** The figures the weekly automated update owns: `campaignFinanceFigures.json`. */
interface FinanceFigures {
    /** ISO date the figures were last confirmed — printed on the page as "tilanne". */
    asOf: string
    raised: Record<FundingSource, Income>
    spent: Record<ExpenseCategory, Expense>
}

export interface CampaignFinance extends FinanceFigures {
    /** Planned total spend for the whole campaign, whole euros. */
    budget: number
    /**
     * Whether the donation page behind `donationUrl` exists yet. While false the pages
     * say the link is coming instead of rendering a button that leads nowhere useful.
     * Flip it in the same change that points the Cloudflare rule at the donation page.
     */
    donationsOpen: boolean
    /**
     * Public donation link: always the short URL, never the party's donation page
     * itself. A Cloudflare redirect rule on the lavanti.fi zone (outside this repo)
     * holds the real destination, so the page, print and social share one address
     * that stays the same when the destination moves.
     */
    donationUrl: string
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
    /** Cheapest and most expensive campaign nationally, whole euros. */
    range: { max: number; min: number }
    /** ISO date the CSV below was fetched and the figures computed. */
    retrievedDate: string
    sets: BenchmarkSet[]
    /** Percent of all reported financing, one decimal. */
    shares: Record<FundingSource, number>
    sourceUrl: string
}

/**
 * The state on `asOf`. `asOf`, `raised` and `spent` come from campaignFinanceFigures.json,
 * which the weekly automated update (scripts/ci/update-campaign-finance.ts) rewrites
 * whole; the rest are manual edits here. Keep comments free of figures that would go stale.
 *
 * Every figure is a whole euro; cents on a transparency page invite precision the
 * campaign cannot promise.
 */
export const campaignFinance: CampaignFinance = {
    ...figures,
    budget: 45000,
    donationUrl: 'https://lavanti.fi/lahjoita',
    donationsOpen: true,
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
 *   runs from `range.min` to `range.max` — so the quartiles, not the mean, carry the spread.
 * - `uusimaa`: rows whose `Vaalipiiri/Kunta` contains "Uudenmaan".
 * - `shares`: Σ`2.x Rahoitus sisaltaa … yhteensa` / Σ`Vaalikampanjan rahoitus yhteensa`.
 *
 * Field 2.8 (mediated support) is left out on purpose: it marks money that also
 * appears under one of 2.3–2.7, so adding it would double-count.
 */
export const benchmark2023: Benchmark = {
    range: { max: 136739, min: 0 },
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
    categories: Record<ExpenseCategory, string>
    /** Follows a committed amount: "+ 4 000 € sitouduttu". */
    committed: string
    /** Donation call to action, and what to say while `donationsOpen` is false. */
    donate: { cta: string; pending: string }
    gap: string
    mean: string
    median: string
    needed: string
    /** Follows a pending amount: "+ 7 000 € tilittämättä". */
    pending: string
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
        budgetRow: 'My budget',
        categories: {
            design: 'Advertising design',
            events: 'Campaign events',
            media: 'Advertising in the media',
            other: 'Other costs',
            outdoor: 'Outdoor advertising',
            print: 'Campaign newsletters, brochures and other printed matter',
            supportCosts: 'Costs of fundraising that gives something in return',
        },
        committed: 'committed',
        donate: {
            cta: 'Support the campaign',
            pending: 'The donation link will be published here as soon as the donation page opens.',
        },
        gap: 'Still to raise',
        mean: 'average',
        median: 'median',
        needed: 'Still to raise',
        pending: 'pending',
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
        categories: {
            design: 'Mainonnan suunnittelu',
            events: 'Vaalitilaisuudet',
            media: 'Vaalimainonta medioissa',
            other: 'Muut kulut',
            outdoor: 'Ulkomainonta',
            print: 'Vaalilehdet, esitteet ja muu painettu materiaali',
            supportCosts: 'Vastikkeellisen tuen hankintakulut',
        },
        committed: 'sitouduttu',
        donate: {
            cta: 'Tue kampanjaa',
            pending: 'Lahjoituslinkki julkaistaan tällä sivulla heti, kun lahjoitussivu avautuu.',
        },
        gap: 'Vielä kerättävä',
        mean: 'keskiarvo',
        median: 'mediaani',
        needed: 'Vielä kerättävä',
        pending: 'tilittämättä',
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
        asOf: (formatted) => `Läget ${formatted}`,
        budget: 'Kampanjbudget',
        budgetRow: 'Min budget',
        categories: {
            design: 'Planering av reklam',
            events: 'Valmöten',
            media: 'Valreklam i medier',
            other: 'Övriga kostnader',
            outdoor: 'Utomhusreklam',
            print: 'Valtidningar, broschyrer och andra tryckalster',
            supportCosts: 'Kostnader för anskaffning av bidrag mot vederlag',
        },
        committed: 'bundet',
        donate: {
            cta: 'Stöd kampanjen',
            pending: 'Donationslänken publiceras här så snart donationssidan öppnas.',
        },
        gap: 'Kvar att samla in',
        mean: 'medeltal',
        median: 'median',
        needed: 'Kvar att samla in',
        pending: 'ej inbetalt',
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
