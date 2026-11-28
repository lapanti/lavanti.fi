/**
 * Browser-side helpers for the Adoptoi kyltti pages (spec: .agents/specs/sign-adoption/spec.md),
 * kept free of server imports so the page scripts bundle only what they use.
 */

import type { Lang } from '../content/nav'

import { isPackage } from './signPackages'
import { estimateWidth, fitStickerName, type Measure, STICKER } from './signSticker'

/** sessionStorage key for the adopter's own sign name, ref and edit token (never in a URL). */
export const STORAGE_KEY = 'adoptoi'

export interface ThanksParams {
    company: boolean
    quantity: number
    ref: string
    /** Back on the payment step from the MobilePay app (`mp=1`). */
    returned?: boolean
    /** A donation for signs without the donor's name on them (`u=1`). */
    unnamed?: boolean
}

/**
 * The thanks page query: `?ref=K-NNNNN&n=<package count>&y=0|1`, plus `&u=1` for a donation without a name
 * on the sign and `&mp=1` when MobilePay sends the donor back to the payment step. Anything else,
 * extra keys included, is rejected as a whole so nothing unvalidated reaches the page.
 */
export const parseThanksParams = (search: string): null | ThanksParams => {
    const params = new URLSearchParams(search)
    const keys = [...params.keys()]
    if (keys.some((k) => !['mp', 'n', 'ref', 'u', 'y'].includes(k))) return null
    const ref = params.get('ref') ?? ''
    const n = params.get('n') ?? ''
    const y = params.get('y') ?? ''
    const u = params.get('u') ?? '0'
    const mp = params.get('mp') ?? '0'
    if (
        !/^K-\d{5}$/.test(ref) ||
        !/^\d{1,2}$/.test(n) ||
        !/^[01]$/.test(y) ||
        !/^[01]$/.test(u) ||
        !/^[01]$/.test(mp)
    ) {
        return null
    }
    const quantity = Number(n)
    if (!isPackage(quantity)) return null

    return { company: y === '1', quantity, ref, unnamed: u === '1', ...(mp === '1' ? { returned: true } : {}) }
}

export type PaymentState = 'failed' | 'paid' | 'pending'

/**
 * Asks `/api/adoptoi/maksu?ref=` until MobilePay has an answer: `paid` or `failed`, or `pending`
 * when `tries` run out or the check doesn't respond.
 */
export const pollPayment = async (
    ref: string,
    fetchFn: typeof fetch = fetch,
    tries = 15,
    wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
): Promise<PaymentState> => {
    for (let i = 0; i < tries; i++) {
        if (i > 0) await wait(2000)
        try {
            const res = await fetchFn(`/api/adoptoi/maksu?ref=${encodeURIComponent(ref)}`)
            const state = res.ok ? ((await res.json()) as { state?: string }).state : undefined
            if (state === 'paid' || state === 'failed') return state
        } catch {
            // Offline for a moment: try again.
        }
    }

    return 'pending'
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

/** Instagram's and Facebook's in-app browsers can't save a generated image or share files. */
export const isInAppBrowser = (userAgent: string): boolean => /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent)

/** A same-site absolute path ("/fi/…"); anything else, such as "//host" or "javascript:", is refused. */
const SAME_SITE_PATH = /^\/(?![/\\])[\w\-./]*$/

/** The thanks page URL; carries only the ref, count, company flag and the no-name flag. */
export const thanksHref = (path: string, params: ThanksParams): string => {
    if (!SAME_SITE_PATH.test(path)) throw new Error('lomake')
    // Entries, not an object, so the URL keeps its documented ref, n, y (u) order.
    const query = new URLSearchParams([
        ['ref', params.ref],
        ['n', String(params.quantity)],
        ['y', params.company ? '1' : '0'],
        ...(params.unnamed ? [['u', '1']] : []),
    ])

    return `${path}?${query.toString()}`
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** measureText on a scratch canvas, or the server estimate where there is no 2D canvas. */
const browserMeasure = (doc: Document | null): Measure => {
    const ctx = doc?.createElement('canvas').getContext?.('2d')
    if (!ctx) return estimateWidth

    return (text, font) => {
        ctx.font = font
        return ctx.measureText(text).width
    }
}

/**
 * Writes `name` (or the ghost text when empty) into the sticker of every sign graphic under
 * `root`, one `<tspan>` per line with textContent only, wrapped and sized by `fitStickerName`.
 */
export const setSignName = (root: ParentNode, name: string, measure?: Measure): void => {
    const doc = 'ownerDocument' in root && root.ownerDocument ? root.ownerDocument : (root as Document)
    const fit = (text: string) => fitStickerName(text, (measure ??= browserMeasure(doc)))
    root.querySelectorAll<HTMLElement>('[data-sign]').forEach((figure) => {
        const text = figure.querySelector<SVGTextElement>('[data-sign-name]')
        if (!text) return
        const value = name.trim()
        const { lines, size, ys } = fit(value || (figure.dataset.ghost ?? ''))
        text.replaceChildren(
            ...lines.map((line, i) => {
                const span = doc.createElementNS(SVG_NS, 'tspan')
                span.setAttribute('x', String(STICKER.cx))
                span.setAttribute('y', String(STICKER.cy + ys[i]))
                span.textContent = line
                return span
            })
        )
        text.setAttribute('fill', (value ? text.dataset.fillName : text.dataset.fillGhost) ?? '')
        text.setAttribute('font-size', String(size))
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
