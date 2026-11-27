/**
 * Petitions and candidate pledges signed for the 2027 parliamentary election.
 *
 * The entries live in `pledges.json` (ADR: .agents/adrs/2026-11-27-content-data-json-or-ts.md):
 * adding one means copying the previous entry. Adding or editing an entry also requires an
 * `updatedDate` bump on the three pledges pages; `scripts/checks/updated-date.ts` enforces it.
 */

import type { Lang } from './nav'

// The attribute is for the e2e page objects, which Playwright loads through Node's own ESM loader.
import data from './pledges.json' with { type: 'json' }

export const PLEDGE_KINDS = ['petition', 'pledge'] as const

/** `petition`: a public call the candidate signed. `pledge`: a commitment asked of candidates. */
export type PledgeKind = (typeof PLEDGE_KINDS)[number]

interface PledgeLocale {
    /** Optional: why the candidate signed, in the candidate's own voice. One or two sentences. */
    note?: string
    /** What the petition or pledge asks, one or two factual sentences. */
    summary: string
    /** The official name; other locales add a translation in parentheses when the name has none. */
    title: string
}

interface PledgeOrganizer {
    name: Record<Lang, string>
    url: string
}

export interface Pledge {
    /** Stable key, kebab-case; also the list item's anchor on the page. */
    id: string
    kind: PledgeKind
    locales: Record<Lang, PledgeLocale>
    organizers: PledgeOrganizer[]
    /** ISO date YYYY-MM-DD; the list is sorted on it, newest first. */
    signedDate: string
    /** Topic tag ids from `src/content/tags`; optional. */
    tags?: string[]
    /** The petition's or pledge's own page. */
    url: string
}

/*
 * JSON infers `kind` as `string`, so the cast is unavoidable; `pledges.spec.ts` checks the
 * values against `PLEDGE_KINDS` instead.
 */
export const pledges = data as Pledge[]

/** Newest first; ties keep file order. */
export function sortedPledges(list: readonly Pledge[] = pledges): Pledge[] {
    return [...list].sort((a, b) => b.signedDate.localeCompare(a.signedDate))
}

export const pledgePages: Record<Lang, string> = {
    en: '/en/elections/pledges/',
    fi: '/fi/eduskuntavaalit/sitoumukset/',
    sv: '/sv/riksdagsvalet/ataganden/',
}
