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
    /**
     * Unique donors in the budget sheet: the candidate excluded, donors whose money is
     * still pending included. Absent until the sheet sends it.
     */
    donors?: number
}

export interface CampaignFinance extends FinanceFigures {
    /** Planned total spend for the whole campaign, whole euros. */
    budget: number
    /**
     * Fewest donors the page will print. Below it the count stays off the page, so an
     * early, small number never reads as a lack of support.
     */
    donorCountMinimum: number
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
    /**
     * MobilePay link to the support association: the short URL, so `functions/mp.ts`
     * counts the click before redirecting to the MobilePay box. Not gated by
     * `donationsOpen`, which covers the party's donation page only.
     */
    mobilePayUrl: string
}

/**
 * The donation methods block on each election page. Every on-site "support the campaign"
 * call to action links here rather than to `donationUrl`, so donors see MobilePay and bank
 * transfer before the party's page. The election and finance pages link their own copy of
 * the block by the bare fragment.
 */
export const donationMethodsHref: Record<Lang, string> = {
    en: '/en/elections/#support',
    fi: '/fi/eduskuntavaalit/#tue',
    sv: '/sv/riksdagsvalet/#stod',
}

/**
 * Where MobilePay and bank transfer donations land: the support association, not the
 * party. The donation terms pages print the same account; change both together.
 */
export const supportAssociation = {
    iban: 'FI61 5780 3820 2478 06',
    mobilePayNumber: '46492',
    name: 'Digitaalisen itsenäisyyden puolesta ry',
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
 * The state on `asOf`. `asOf`, `raised`, `spent` and `donors` come from campaignFinanceFigures.json,
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
    donorCountMinimum: 25,
    mobilePayUrl: 'https://lavanti.fi/mp',
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
    /**
     * The "how can I support" block, in the order it shows the methods: MobilePay and bank
     * transfer to the support association first, the party's donation page last.
     */
    donationMethods: {
        bankTransfer: {
            iban: string
            /** What to write in the payment message. */
            message: string
            messageLabel: string
            recipient: string
            /** Link to the bank transfer section of the donation terms. */
            terms: string
            title: string
        }
        card: { link: string; title: string }
        /** Copy button text; the button's accessible name appends the field label. */
        copy: string
        /** Announced and shown on the button after a successful copy. */
        copied: string
        eyebrow: string
        heading: string
        /** Names the association that receives MobilePay and bank transfer donations. */
        intro: (association: string) => string
        mobilePay: { link: string; number: string; title: string }
    }
    /** Under the raised figure; receives `formatInteger(donors, lang)` output. */
    donors: (count: string) => string
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
        donationMethods: {
            bankTransfer: {
                iban: 'Account number (IBAN)',
                message: 'Your own name. For a company or an association, its name and business ID.',
                messageLabel: 'Message',
                recipient: 'Recipient',
                terms: 'Read the donation terms',
                title: 'By bank transfer',
            },
            card: { link: 'Donation service', title: 'Through the Greens’ donation service' },
            copied: 'Copied',
            copy: 'Copy',
            eyebrow: 'Support',
            heading: 'How can I support the campaign?',
            intro: (association) =>
                `The quickest way to donate is MobilePay or a bank transfer. All donations go to my support association, ${association}.`,
            mobilePay: { link: 'Donate with MobilePay', number: 'MobilePay number', title: 'With MobilePay' },
        },
        donors: (count) => `${count} donors`,
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
        donationMethods: {
            bankTransfer: {
                iban: 'Tilinumero (IBAN)',
                message: 'Oma nimesi. Yrityksen tai yhdistyksen puolesta sen nimi ja Y-tunnus.',
                messageLabel: 'Viesti',
                recipient: 'Saaja',
                terms: 'Lue lahjoitusehdot',
                title: 'Tilisiirrolla',
            },
            card: { link: 'Lahjoituspalvelu', title: 'Vihreiden lahjoituspalvelussa' },
            copied: 'Kopioitu',
            copy: 'Kopioi',
            eyebrow: 'Tue',
            heading: 'Miten voin tukea kampanjaa?',
            intro: (association) =>
                `Nopeimmin lahjoitat MobilePaylla tai tilisiirrolla. Kaikki lahjoitukset ottaa vastaan tukiyhdistykseni ${association}.`,
            mobilePay: { link: 'Lahjoita MobilePaylla', number: 'MobilePay-numero', title: 'MobilePaylla' },
        },
        donors: (count) => `${count} lahjoittajaa`,
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
        donationMethods: {
            bankTransfer: {
                iban: 'Kontonummer (IBAN)',
                message: 'Ditt eget namn. För ett företag eller en förening dess namn och FO-nummer.',
                messageLabel: 'Meddelande',
                recipient: 'Mottagare',
                terms: 'Läs donationsvillkoren',
                title: 'Med banköverföring',
            },
            card: { link: 'Donationstjänst', title: 'I De Grönas donationstjänst' },
            copied: 'Kopierat',
            copy: 'Kopiera',
            eyebrow: 'Stöd',
            heading: 'Hur kan jag stödja kampanjen?',
            intro: (association) =>
                `Snabbast donerar du med MobilePay eller banköverföring. Alla donationer tas emot av min stödförening ${association}.`,
            mobilePay: { link: 'Donera med MobilePay', number: 'MobilePay-nummer', title: 'Med MobilePay' },
        },
        donors: (count) => `${count} donatorer`,
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
