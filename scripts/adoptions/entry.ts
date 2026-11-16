/**
 * Pure helpers for the Adoptoi kyltti owner CLI (scripts/adoptions/cli.ts); tested in entry.spec.ts.
 * Spec: .agents/specs/sign-adoption/spec.md § Owner flow, § Personal pages.
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { AdoptionPage } from '../../src/content/adoptionPages.ts'
import type { Lang } from '../../src/content/nav.ts'

import { adoptionContent } from '../../src/content/signAdoption.ts'
/* eslint-enable import-x/extensions */

/** One row as `GET /api/adoptoi/pending` returns it. */
export interface Adoption {
    approved_at: null | string
    billing_address: null | string
    business_id: null | string
    company_name: null | string
    consent_page_at: null | string
    created_at: string
    email: string
    id: number
    lang: Lang
    message: null | string
    message_approved_at: null | string
    municipality: string
    /** 0: a donation for signs without the donor's name on them (sign_name is null). */
    named: number
    paid_via: null | string
    payer_name: null | string
    printed_at: null | string
    public: number
    quantity: number
    ref_code: string
    sign_name: null | string
    status: string
}

/** The sign name, or a marker that stands out in `list` for a donation without one. */
export const signLabel = (row: Pick<Adoption, 'sign_name'>): string => row.sign_name ?? '[EI NIMEÄ KYLTTIIN]'

/**
 * A private donation without a name on the sign and no payer name: the giver is known only from
 * the MobilePay report or bank statement, so approve needs `--payer` for the 6 000 € cap.
 */
export const needsPayer = (row: Pick<Adoption, 'company_name' | 'payer_name' | 'sign_name'>): boolean =>
    row.sign_name === null && row.company_name === null && row.payer_name === null

const EUROS_PER_SIGN = 30
/** At or above this total per giver the support is disclosed by name; check the other channels too. */
const DISCLOSURE_LIMIT = 2000
/** The most one giver may give across all channels. */
const CAP = 6000

/** Legal-form tokens that mark a company name; MobilePay is for private persons in their own name. */
const COMPANY_FORM = /(?:^|[\s.,])(oyj|oy|ab|ky|tmi|ry|osk)(?=$|[\s.,])/i

export const looksLikeCompany = (name: string): boolean => COMPANY_FORM.test(name)

const norm = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()

/** The same name, ignoring case and spacing. */
export const sameName = (a: string, b: string): boolean => norm(a) === norm(b)

/**
 * The giver: the company when it pays by invoice, else the payer, else the person on the sign.
 * An approved row always has one of them (`needsPayer` makes approve ask for the payer).
 */
export const payerKey = (row: Pick<Adoption, 'company_name' | 'payer_name' | 'sign_name'>): string =>
    norm(row.company_name ?? row.payer_name ?? row.sign_name ?? '')

export const donation = (row: Pick<Adoption, 'quantity'>): number => row.quantity * EUROS_PER_SIGN

/** Euros already approved per giver. */
export const payerTotals = (approved: Adoption[]): Map<string, number> => {
    const totals = new Map<string, number>()
    for (const row of approved) totals.set(payerKey(row), (totals.get(payerKey(row)) ?? 0) + donation(row))

    return totals
}

export type CapCheck = 'ok' | 'stop' | 'warn'

/** `stop` above the cap, `warn` from the disclosure limit up, else `ok`. */
export const capCheck = (total: number): CapCheck => (total > CAP ? 'stop' : total >= DISCLOSURE_LIMIT ? 'warn' : 'ok')

/** Row ids from CLI arguments: a numeric id or a `K-NNNNN` ref. Unknown ones are returned apart. */
export const resolveIds = (args: string[], rows: Adoption[]): { ids: number[]; unknown: string[] } => {
    const ids: number[] = []
    const unknown: string[] = []
    for (const arg of args) {
        const row = /^K-\d{5}$/.test(arg)
            ? rows.find((r) => r.ref_code === arg)
            : rows.find((r) => String(r.id) === arg)
        if (row) ids.push(row.id)
        else unknown.push(arg)
    }

    return { ids, unknown }
}

const RESERVED = new Set(['kiitos', 'tack', 'thanks'])

/** The name lowercased, diacritics stripped, non-alphanumerics collapsed to `-`; unique among `taken`. */
export const adoptionSlug = (name: string, taken: Iterable<string>): string => {
    const base =
        name
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .replace(/ø/gi, 'o')
            .replace(/æ/gi, 'ae')
            .replace(/ß/g, 'ss')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'kummi'
    const used = new Set(taken)
    if (!RESERVED.has(base) && !used.has(base)) return base
    for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`
}

/** A personal page entry from an approved, opted-in row; only an approved message is carried over. */
export const pageEntry = (row: Adoption & { sign_name: string }, taken: Iterable<string>): AdoptionPage => ({
    lang: row.lang,
    ...(row.message && row.message_approved_at ? { message: row.message } : {}),
    name: row.sign_name,
    slug: adoptionSlug(row.sign_name, taken),
})

export const formatPages = (pages: AdoptionPage[]): string => `${JSON.stringify(pages, null, 4)}\n`

/** The confirmation email as a `mailto:` link the owner opens and sends from the campaign address. */
export const mailtoUrl = (row: Adoption): string => {
    const { body, subject } = adoptionContent[row.lang].mail({
        company: row.company_name !== null,
        name: row.sign_name,
        quantity: row.quantity,
        ref: row.ref_code,
    })

    return `mailto:${row.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const csvCell = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value)

    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

const PRINT_COLUMNS = ['id', 'ref_code', 'sign_name', 'quantity', 'municipality', 'company_name'] as const

/** The print list for the sign round: one line per adoption, the name as it goes on the sign. */
export const printCsv = (rows: Adoption[]): string =>
    [PRINT_COLUMNS.join(','), ...rows.map((r) => PRINT_COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n'

export interface PrintRound {
    /** Rows whose name goes on a sticker: the CSV. */
    named: Adoption[]
    /** Signs without a sticker, from donations without a name: counted, never listed. */
    unnamedSigns: number
    unnamed: Adoption[]
}

/** Splits the unprinted rows into the name print list and the signs that need no sticker. */
export const printRound = (rows: Adoption[]): PrintRound => {
    const named = rows.filter((r) => r.sign_name !== null)
    const unnamed = rows.filter((r) => r.sign_name === null)

    return { named, unnamed, unnamedSigns: unnamed.reduce((n, r) => n + r.quantity, 0) }
}
