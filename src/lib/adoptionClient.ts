/**
 * Browser-side helpers for the Adoptoi kyltti pages (spec: .agents/specs/sign-adoption/spec.md),
 * kept free of server imports so the page scripts bundle only what they use.
 */

import type { Lang } from '../content/nav'

export const EUROS_PER_SIGN = 30
export const MAX_SIGNS = 20
/** sessionStorage key for the adopter's own sign name, ref and edit token (never in a URL). */
export const STORAGE_KEY = 'adoptoi'

export interface ThanksParams {
    company: boolean
    quantity: number
    ref: string
}

/**
 * The thanks page query: `?ref=K-NNNNN&n=1..20&y=0|1`. Anything else, extra keys included, is
 * rejected as a whole so nothing unvalidated reaches the page.
 */
export const parseThanksParams = (search: string): null | ThanksParams => {
    const params = new URLSearchParams(search)
    const keys = [...params.keys()]
    if (keys.some((k) => !['n', 'ref', 'y'].includes(k))) return null
    const ref = params.get('ref') ?? ''
    const n = params.get('n') ?? ''
    const y = params.get('y') ?? ''
    if (!/^K-\d{5}$/.test(ref) || !/^\d{1,2}$/.test(n) || !/^[01]$/.test(y)) return null
    const quantity = Number(n)
    if (quantity < 1 || quantity > MAX_SIGNS) return null

    return { company: y === '1', quantity, ref }
}

export interface StoredAdoption {
    name: string
    quantity: number
    ref: string
    token: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** The adopter's own submission, or null when storage is empty, blocked or holds something else. */
export const readStoredAdoption = (storage: () => StorageLike): null | StoredAdoption => {
    try {
        const raw = storage().getItem(STORAGE_KEY)
        if (!raw) return null
        const v = JSON.parse(raw) as Partial<StoredAdoption>
        if (typeof v.name !== 'string' || typeof v.ref !== 'string' || typeof v.token !== 'string') return null

        return { name: v.name, quantity: Number(v.quantity) || 1, ref: v.ref, token: v.token }
    } catch {
        return null
    }
}

export const writeStoredAdoption = (storage: () => StorageLike, value: StoredAdoption): boolean => {
    try {
        storage().setItem(STORAGE_KEY, JSON.stringify(value))

        return true
    } catch {
        return false
    }
}

const LIST_LOCALE: Record<Lang, string> = { en: 'en-GB', fi: 'fi-FI', sv: 'sv-FI' }

/** "Sjoerd, Anna ja Mikko" in the page language. */
export const joinNames = (names: string[], lang: Lang): string =>
    new Intl.ListFormat(LIST_LOCALE[lang], { style: 'long', type: 'conjunction' }).format(names)

/** The share URL with campaign tags, so the link sticker's visits are attributable. */
export const shareUrl = (origin: string, path: string, medium: 'copy' | 'story'): string =>
    `${origin}${path}?utm_source=adoptoi&utm_medium=${medium}&utm_campaign=adoptoi-kyltti`

/** Instagram's and Facebook's in-app browsers can't save a generated image or share files. */
export const isInAppBrowser = (userAgent: string): boolean => /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent)
