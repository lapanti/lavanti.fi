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

/** A same-site absolute path ("/fi/…"); anything else, such as "//host" or "javascript:", is refused. */
const SAME_SITE_PATH = /^\/(?![/\\])[\w\-./]*$/

/** The thanks page URL; carries only the ref, count and company flag. */
export const thanksHref = (path: string, params: ThanksParams): string => {
    if (!SAME_SITE_PATH.test(path)) throw new Error('lomake')
    // Entries, not an object, so the URL keeps its documented ref, n, y order.
    const query = new URLSearchParams([
        ['ref', params.ref],
        ['n', String(params.quantity)],
        ['y', params.company ? '1' : '0'],
    ])

    return `${path}?${query.toString()}`
}

/** Name width on the sign the SVG text may take before it shrinks (sign width minus padding). */
const NAME_MAX_WIDTH = 520

/**
 * Writes `name` (or the ghost text when empty) into every sign graphic under `root`, with
 * textContent only, and shrinks the font when a long name would overflow the band.
 */
export const setSignName = (root: ParentNode, name: string): void => {
    root.querySelectorAll<HTMLElement>('[data-sign]').forEach((figure) => {
        const text = figure.querySelector<SVGTextElement>('[data-sign-name]')
        if (!text) return
        const value = name.trim()
        text.textContent = value || (figure.dataset.ghost ?? '')
        text.setAttribute('fill', (value ? text.dataset.fillName : text.dataset.fillGhost) ?? '')
        text.setAttribute('font-size', '46')
        const width = typeof text.getComputedTextLength === 'function' ? text.getComputedTextLength() : 0
        if (width > NAME_MAX_WIDTH) text.setAttribute('font-size', String(Math.floor((46 * NAME_MAX_WIDTH) / width)))
    })
}

export interface WallData {
    messages: { message: string; name: string }[]
    municipalities: Record<string, number>
    names: string[]
    signs: null | number
}

const EMPTY_WALL: WallData = { messages: [], municipalities: {}, names: [], signs: null }

let wall: Promise<WallData> | undefined

/**
 * The public wall, fetched once per page however many components ask. A failed fetch reads as
 * an empty wall: the page simply shows no live numbers.
 */
export const loadWall = (fetchFn: typeof fetch = fetch): Promise<WallData> =>
    (wall ??= fetchFn('/api/adoptoi/seina', { headers: { Accept: 'application/json' } })
        .then((res) => (res.ok ? (res.json() as Promise<WallData>) : EMPTY_WALL))
        .catch(() => EMPTY_WALL))

/** Forgets the cached wall (tests). */
export const resetWall = (): void => {
    wall = undefined
}
