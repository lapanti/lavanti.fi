/**
 * Server logic for Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md): the adoption form
 * (`POST /api/adoptoi`), the adopter's own message (`POST /api/adoptoi/viesti`), the public wall
 * (`GET /api/adoptoi/seina`), the owner inbox the `npm run adoptions` CLI reads and the stats
 * endpoint. The Pages Functions in `functions/api/adoptoi*` are thin wrappers around these handlers.
 *
 * Data rules:
 * - A row holds what the form asks for, the consent times and the campaign link. No IP, user agent
 *   or Turnstile token.
 * - The edit token is returned once and only its SHA-256 is stored; it never travels in a URL.
 * - The wall returns approved, opted-in names and aggregate counts only, and nothing below the
 *   suppression threshold. Never an email, payer, company detail, ref or id.
 */

import { type Lang, LANGS } from '../content/nav'
import { MAX_SIGNS } from './adoptionClient'
import {
    backToForm,
    type D1Like,
    errorMessage,
    type FetchLike,
    hasBearer,
    json,
    redirect,
    text,
    timingSafeEqual,
    verifyTurnstile,
} from './formHandling'
import { helsinkiDayStartUtc, isCalendarDay } from './publishing'
import { suppress, utmSlug } from './volunteers'

export interface AdoptionEnv {
    ADOPTIONS_TOKEN?: string
    DB?: D1Like
    LIITY_STATS_TOKEN?: string
    TURNSTILE_SECRET?: string
}

/** The 25 municipalities of the Uusimaa electoral district (Uusimaa without Helsinki). */
export const DISTRICT_MUNICIPALITIES = [
    'askola',
    'espoo',
    'hanko',
    'hyvinkaa',
    'inkoo',
    'jarvenpaa',
    'karkkila',
    'kauniainen',
    'kerava',
    'kirkkonummi',
    'lapinjarvi',
    'lohja',
    'loviisa',
    'myrskyla',
    'mantsala',
    'nurmijarvi',
    'pornainen',
    'porvoo',
    'pukkila',
    'raasepori',
    'sipoo',
    'siuntio',
    'tuusula',
    'vantaa',
    'vihti',
] as const

export const NO_PREFERENCE = 'ei-toivetta'
export const ADOPTION_MUNICIPALITIES = [...DISTRICT_MUNICIPALITIES, NO_PREFERENCE] as const
export type AdoptionMunicipality = (typeof ADOPTION_MUNICIPALITIES)[number]

export const MAX_NAME_LENGTH = 24
const MAX_MESSAGE_LENGTH = 140
/** Days after created_at during which an adopter may still change their message. */
const MESSAGE_WINDOW_DAYS = 7
/** Seconds between two writes to the same row through `viesti`. */
const MESSAGE_COOLDOWN_S = 30
/** Smallest number of approved rows (or opted-in names) the wall shows anything for. */
const MIN_WALL = 3
const MAX_WALL_NAMES = 50
const MAX_WALL_MESSAGES = 20

/** Bump when the consent wording on the form or in the privacy notice changes. */
const CONSENT_VERSION = '2026-11'

export const FORM_PATH: Record<Lang, string> = { en: '/en/adopt/', fi: '/fi/adoptoi/', sv: '/sv/adoptera/' }
export const THANKS_PATH: Record<Lang, string> = {
    en: '/en/adopt/thanks/',
    fi: '/fi/adoptoi/kiitos/',
    sv: '/sv/adoptera/tack/',
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/
const REF = /^K-\d{5}$/
const PERSON_NAME = /^\p{L}[\p{L} .'’-]*$/u
const COMPANY_NAME = /^[\p{L}\p{N}][\p{L}\p{N} .'’&-]*$/u

/** NFC, whitespace runs collapsed to one space, trimmed: the form the length rule measures. */
export const normaliseName = (value: string): string => value.normalize('NFC').replace(/\s+/g, ' ').trim()

/**
 * A sign name: 2–24 characters of letters, spaces, hyphens, apostrophes and periods. Digits and
 * "&" only for a company ("3D-Paja Oy"). Measured in code points after NFC, as the visitor sees it.
 */
export const isValidSignName = (name: string, company: boolean): boolean => {
    const length = [...name].length
    if (length < 2 || length > MAX_NAME_LENGTH) return false

    return (company ? COMPANY_NAME : PERSON_NAME).test(name)
}

/** Finnish business ID (Y-tunnus) `NNNNNNN-C` with a valid check digit. */
export const isValidBusinessId = (value: string): boolean => {
    const m = /^(\d{7})-(\d)$/.exec(value)
    if (!m) return false
    const weights = [7, 9, 10, 5, 8, 4, 2]
    const sum = [...m[1]].reduce((acc, d, i) => acc + Number(d) * weights[i], 0)
    const r = sum % 11
    if (r === 1) return false

    return Number(m[2]) === (r === 0 ? 0 : 11 - r)
}

interface AdoptionRow {
    billing_address: null | string
    business_id: null | string
    company_name: null | string
    consent_company_at: null | string
    consent_page_at: null | string
    consent_print_at: string
    consent_public_at: null | string
    consent_version: string
    created_at: string
    email: string
    lang: Lang
    municipality: AdoptionMunicipality
    public: 0 | 1
    quantity: number
    sign_name: string
    utm_campaign: null | string
    utm_source: null | string
}

export type ParseResult = { error: string; ok: false } | { ok: true; row: AdoptionRow }

/** Validates the posted form. Never echoes input back; the error is a code. */
export const parseAdoption = (form: FormData, now: Date): ParseResult => {
    const lang = text(form, 'lang') as Lang
    if (!LANGS.includes(lang)) return { error: 'lang', ok: false }
    if (text(form, 'website') !== '') return { error: 'honeypot', ok: false }

    const companyName = normaliseName(text(form, 'company_name'))
    const company = companyName !== ''

    const signName = normaliseName(text(form, 'sign_name'))
    if (!isValidSignName(signName, company)) return { error: 'sign_name', ok: false }

    // The "other number" chip posts `muu` and the stepper's value as quantity_other.
    const quantityText = text(form, text(form, 'quantity') === 'muu' ? 'quantity_other' : 'quantity')
    const quantity = /^\d{1,2}$/.test(quantityText) ? Number(quantityText) : 0
    if (quantity < 1 || quantity > MAX_SIGNS) return { error: 'quantity', ok: false }

    const municipality = text(form, 'municipality') as AdoptionMunicipality
    if (!ADOPTION_MUNICIPALITIES.includes(municipality)) return { error: 'municipality', ok: false }

    const email = text(form, 'email').toLowerCase()
    if (!EMAIL.test(email)) return { error: 'email', ok: false }

    let businessId: null | string = null
    let billing: null | string = null
    if (company) {
        if (companyName.length > 100) return { error: 'company_name', ok: false }
        businessId = text(form, 'business_id').replace(/\s/g, '')
        if (!isValidBusinessId(businessId)) return { error: 'business_id', ok: false }
        billing = text(form, 'billing_address')
        if (billing.length < 5 || billing.length > 200) return { error: 'billing_address', ok: false }
        if (text(form, 'consent_company') !== 'yes') return { error: 'consent_company', ok: false }
    }

    if (text(form, 'consent_print') !== 'yes') return { error: 'consent_print', ok: false }
    if (text(form, 'consent_person') !== 'yes') return { error: 'consent_person', ok: false }

    const iso = now.toISOString()
    const page = text(form, 'page') === 'yes'
    // A personal page lists the name too, so it implies the list opt-in.
    const listed = page || text(form, 'public') === 'yes'

    return {
        ok: true,
        row: {
            billing_address: billing,
            business_id: businessId,
            company_name: company ? companyName : null,
            consent_company_at: company ? iso : null,
            consent_page_at: page ? iso : null,
            consent_print_at: iso,
            consent_public_at: listed ? iso : null,
            consent_version: CONSENT_VERSION,
            created_at: iso,
            email,
            lang,
            municipality,
            public: listed ? 1 : 0,
            quantity,
            sign_name: signName,
            utm_campaign: utmSlug(text(form, 'utm_campaign')),
            utm_source: utmSlug(text(form, 'utm_source')),
        },
    }
}

const base64url = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

/** 128 random bits, base64url (22 characters). */
export const newEditToken = (): string => base64url(crypto.getRandomValues(new Uint8Array(16)))

/** `K-` and five random digits (10000–99999). */
export const newRefCode = (): string => `K-${10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000)}`

export const hashToken = async (token: string): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))

    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface Generators {
    ref: () => string
    token: () => string
}

const defaultGenerators: Generators = { ref: newRefCode, token: newEditToken }

const wantsJson = (request: Request): boolean => (request.headers.get('Accept') ?? '').includes('application/json')

/** The thanks URL: only the validated ref, count and company flag, never the name or token. */
const thanksUrl = (origin: string, lang: Lang, ref: string, row: { company_name: null | string; quantity: number }) =>
    `${origin}${THANKS_PATH[lang]}?ref=${ref}&n=${row.quantity}&y=${row.company_name ? 1 : 0}`

const INSERT_ATTEMPTS = 5

/**
 * POST /api/adoptoi. A fetch with `Accept: application/json` gets `{ref, token}` (or `{error}`);
 * a plain form post gets a 303 to the thanks page (or back to the form with `?virhe=`).
 */
export const handleSubmit = async (
    request: Request,
    env: AdoptionEnv,
    fetchFn: FetchLike,
    now = new Date(),
    gen: Generators = defaultGenerators
): Promise<Response> => {
    const origin = new URL(request.url).origin
    const asJson = wantsJson(request)
    let form: FormData
    try {
        form = await request.formData()
    } catch {
        return asJson ? json({ error: 'lomake' }, 400) : backToForm(origin, FORM_PATH.fi)('lomake')
    }
    const langField = text(form, 'lang') as Lang
    const lang: Lang = LANGS.includes(langField) ? langField : 'fi'
    const fail = (code: string, status = 400) =>
        asJson ? json({ error: code }, status) : backToForm(origin, FORM_PATH[lang])(code)

    const parsed = parseAdoption(form, now)
    if (!parsed.ok) {
        if (parsed.error !== 'honeypot') return fail(parsed.error)
        // A filled honeypot looks like success to the bot, and nothing is stored.
        const ref = gen.ref()

        return asJson
            ? json({ ref, token: gen.token() })
            : redirect(thanksUrl(origin, lang, ref, { company_name: null, quantity: 1 }), 303)
    }
    /*
     * Configuration and database failures all show the visitor `palvelu`; the log line names
     * which one (Pages → Deployments → Functions → real-time logs). No form data is logged.
     */
    if (!env.DB || !env.TURNSTILE_SECRET) {
        console.error(
            `adoptoi: missing ${env.DB ? '' : 'DB binding '}${env.TURNSTILE_SECRET ? '' : 'TURNSTILE_SECRET'}`
        )
        return fail('palvelu', 503)
    }
    if (!(await verifyTurnstile(form, request, env.TURNSTILE_SECRET, fetchFn))) return fail('varmistus')

    const r = parsed.row
    const token = gen.token()
    const tokenHash = await hashToken(token)
    for (let attempt = 1; ; attempt++) {
        const ref = gen.ref()
        try {
            await env.DB.prepare(
                `INSERT INTO sign_adoptions (created_at, status, lang, sign_name, quantity, municipality, email, company_name, business_id, billing_address, public, ref_code, edit_token_hash, consent_print_at, consent_public_at, consent_page_at, consent_company_at, consent_version, utm_source, utm_campaign)
                 VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
                .bind(
                    r.created_at,
                    r.lang,
                    r.sign_name,
                    r.quantity,
                    r.municipality,
                    r.email,
                    r.company_name,
                    r.business_id,
                    r.billing_address,
                    r.public,
                    ref,
                    tokenHash,
                    r.consent_print_at,
                    r.consent_public_at,
                    r.consent_page_at,
                    r.consent_company_at,
                    r.consent_version,
                    r.utm_source,
                    r.utm_campaign
                )
                .run()

            return asJson ? json({ ref, token }) : redirect(thanksUrl(origin, lang, ref, r), 303)
        } catch (err) {
            const message = errorMessage(err)
            // A ref collision is retried with a fresh ref; anything else is a storage failure.
            if (/UNIQUE/i.test(message) && attempt < INSERT_ATTEMPTS) continue
            console.error(`adoptoi: insert failed: ${message}`)
            return fail('palvelu', 503)
        }
    }
}

interface MessageTarget {
    created_at: string
    edit_token_hash: string
    id: number
    message_at: null | string
    status: string
}

/**
 * POST /api/adoptoi/viesti — `{ref, token, message?, payer_name?}` as JSON. The message
 * (≤ 140, '' clears it) is accepted while pending or within 7 days of the submission and waits
 * for moderation again; the payer name only while pending. One write per row per 30 seconds.
 */
export const handleMessage = async (request: Request, env: AdoptionEnv, now = new Date()): Promise<Response> => {
    if (!env.DB) return json({ error: 'palvelu' }, 503)
    let body: Record<string, unknown>
    try {
        body = (await request.json()) as Record<string, unknown>
    } catch {
        return json({ error: 'lomake' }, 400)
    }
    const str = (key: string) => (typeof body[key] === 'string' ? (body[key] as string) : null)
    const ref = str('ref') ?? ''
    const token = str('token') ?? ''
    if (!REF.test(ref) || token === '') return json({ error: 'not found' }, 404)

    const message = str('message') === null ? null : normaliseName(str('message') ?? '')
    const payer = str('payer_name') === null ? null : normaliseName(str('payer_name') ?? '')
    if (message === null && payer === null) return json({ error: 'lomake' }, 400)
    if (message !== null && [...message].length > MAX_MESSAGE_LENGTH) return json({ error: 'message' }, 400)
    if (payer !== null && payer !== '' && (payer.length < 2 || payer.length > 100)) {
        return json({ error: 'payer_name' }, 400)
    }

    const row = await env.DB.prepare(
        'SELECT id, status, created_at, edit_token_hash, message_at FROM sign_adoptions WHERE ref_code = ?'
    )
        .bind(ref)
        .first<MessageTarget>()
    // A wrong token and an unknown ref look the same, so a ref can't be probed.
    if (!row || !timingSafeEqual(row.edit_token_hash, await hashToken(token))) {
        return json({ error: 'not found' }, 404)
    }
    if (row.message_at && now.getTime() - Date.parse(row.message_at) < MESSAGE_COOLDOWN_S * 1000) {
        return json({ error: 'odota' }, 429)
    }
    const age = now.getTime() - Date.parse(row.created_at)
    if (message !== null && row.status !== 'pending' && age > MESSAGE_WINDOW_DAYS * 86_400_000) {
        return json({ error: 'suljettu' }, 409)
    }
    if (payer !== null && row.status !== 'pending') return json({ error: 'suljettu' }, 409)

    const sets: string[] = ['message_at = ?']
    const args: unknown[] = [now.toISOString()]
    if (message !== null) {
        // A changed message is moderated again before it shows anywhere.
        sets.push('message = ?', 'message_approved_at = NULL')
        args.push(message === '' ? null : message)
    }
    if (payer !== null) {
        sets.push('payer_name = ?')
        args.push(payer === '' ? null : payer)
    }
    await env.DB.prepare(`UPDATE sign_adoptions SET ${sets.join(', ')} WHERE id = ?`)
        .bind(...args, row.id)
        .run()

    return json({ saved: true })
}

/** GET /api/adoptoi/seina — the public wall. Cached for a minute at the edge and in the browser. */
export const handleWall = async (env: AdoptionEnv): Promise<Response> => {
    const wall = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
            headers: {
                'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
                'Content-Type': 'application/json; charset=utf-8',
            },
            status,
        })
    if (!env.DB) return wall({ error: 'unavailable' }, 503)
    const db = env.DB

    const totals = await db
        .prepare(
            "SELECT COUNT(*) AS n, COALESCE(SUM(quantity), 0) AS signs FROM sign_adoptions WHERE status = 'approved'"
        )
        .first<{ n: number; signs: number }>()
    const approved = totals?.n ?? 0
    if (approved < MIN_WALL) return wall({ messages: [], municipalities: {}, names: [], signs: null })

    const byMunicipality = await db
        .prepare(
            "SELECT municipality AS key, SUM(quantity) AS n FROM sign_adoptions WHERE status = 'approved' AND municipality != ? GROUP BY key"
        )
        .bind(NO_PREFERENCE)
        .all<{ key: string; n: number }>()
    const municipalities: Record<string, number> = {}
    for (const { key, n } of byMunicipality.results) municipalities[key] = n

    const names = (
        await db
            .prepare(
                `SELECT sign_name AS name FROM sign_adoptions WHERE status = 'approved' AND public = 1 ORDER BY approved_at DESC LIMIT ${MAX_WALL_NAMES}`
            )
            .all<{ name: string }>()
    ).results.map((r) => r.name)
    const shown = names.length >= MIN_WALL
    const messages = shown
        ? (
              await db
                  .prepare(
                      `SELECT sign_name AS name, message FROM sign_adoptions WHERE status = 'approved' AND public = 1 AND message IS NOT NULL AND message_approved_at IS NOT NULL ORDER BY message_approved_at DESC LIMIT ${MAX_WALL_MESSAGES}`
                  )
                  .all<{ message: string; name: string }>()
          ).results.map(({ message, name }) => ({ message, name }))
        : []

    return wall({
        messages,
        municipalities: suppress(municipalities),
        names: shown ? names : [],
        signs: totals?.signs ?? 0,
    })
}

/** The inbox database once the bearer token checks out, or the response to send instead. */
const inbox = (request: Request, env: AdoptionEnv): D1Like | Response => {
    if (!hasBearer(request, env.ADOPTIONS_TOKEN)) return json({ error: 'unauthorized' }, 401)
    if (!env.DB) return json({ error: 'unavailable' }, 503)

    return env.DB
}

/** Every column the owner needs, without the token hash. */
const INBOX_COLUMNS =
    'id, created_at, status, lang, sign_name, quantity, municipality, email, payer_name, company_name, business_id, billing_address, public, message, message_approved_at, ref_code, consent_page_at, approved_at, paid_via, printed_at'

/**
 * GET /api/adoptoi/pending — pending rows and messages awaiting moderation;
 * `?status=approved` returns the approved rows instead (print list, per-payer totals).
 */
export const handlePending = async (request: Request, env: AdoptionEnv): Promise<Response> => {
    const db = inbox(request, env)
    if (db instanceof Response) return db
    if (new URL(request.url).searchParams.get('status') === 'approved') {
        const { results } = await db
            .prepare(`SELECT ${INBOX_COLUMNS} FROM sign_adoptions WHERE status = 'approved' ORDER BY approved_at`)
            .all()

        return json({ adoptions: results })
    }
    const { results: adoptions } = await db
        .prepare(`SELECT ${INBOX_COLUMNS} FROM sign_adoptions WHERE status = 'pending' ORDER BY created_at`)
        .all()
    const { results: messages } = await db
        .prepare(
            `SELECT ${INBOX_COLUMNS} FROM sign_adoptions WHERE status != 'rejected' AND message IS NOT NULL AND message_approved_at IS NULL ORDER BY message_at`
        )
        .all()

    return json({ adoptions, messages })
}

const ACTIONS = ['approve', 'reject', 'approve-message', 'reject-message', 'printed'] as const
type Action = (typeof ACTIONS)[number]
const PAID_VIA = ['mobilepay', 'lasku'] as const

const ID = /^\d{1,10}$/

/** POST /api/adoptoi/:id — `{action, paid_via?}` from the CLI. */
export const handleAction = async (
    request: Request,
    env: AdoptionEnv,
    id: string,
    now = new Date()
): Promise<Response> => {
    const db = inbox(request, env)
    if (db instanceof Response) return db
    if (!ID.test(id)) return json({ error: 'not found' }, 404)
    let body: { action?: unknown; paid_via?: unknown }
    try {
        body = (await request.json()) as typeof body
    } catch {
        return json({ error: 'bad request' }, 400)
    }
    const action = body.action as Action
    if (!ACTIONS.includes(action)) return json({ error: 'bad action' }, 400)

    const row = await db
        .prepare('SELECT id, status, message FROM sign_adoptions WHERE id = ?')
        .bind(Number(id))
        .first<{ id: number; message: null | string; status: string }>()
    if (!row) return json({ error: 'not found' }, 404)

    const iso = now.toISOString()
    const update = (sql: string, ...args: unknown[]) =>
        db
            .prepare(`UPDATE sign_adoptions SET ${sql} WHERE id = ?`)
            .bind(...args, row.id)
            .run()
    const conflict = () => json({ error: `cannot ${action} a ${row.status} row` }, 409)

    if (action === 'approve') {
        if (row.status !== 'pending') return conflict()
        const via = (PAID_VIA as readonly unknown[]).includes(body.paid_via) ? (body.paid_via as string) : null
        await update("status = 'approved', approved_at = ?, paid_via = ?", iso, via)
    } else if (action === 'reject') {
        if (row.status !== 'pending') return conflict()
        await update("status = 'rejected'")
    } else if (action === 'approve-message') {
        if (row.message === null) return json({ error: 'no message' }, 409)
        await update('message_approved_at = ?', iso)
    } else if (action === 'reject-message') {
        await update('message = NULL, message_approved_at = NULL')
    } else {
        if (row.status !== 'approved') return conflict()
        await update('printed_at = ?', iso)
    }

    return json({ action, id: row.id })
}

/** DELETE /api/adoptoi/:id — revocation: the row is deleted; the CLI handles a printed name. */
export const handleRevoke = async (request: Request, env: AdoptionEnv, id: string): Promise<Response> => {
    const db = inbox(request, env)
    if (db instanceof Response) return db
    if (!ID.test(id)) return json({ error: 'not found' }, 404)
    await db.prepare('DELETE FROM sign_adoptions WHERE id = ?').bind(Number(id)).run()

    return json({ deleted: Number(id) })
}

/**
 * GET /api/adoptoi/stats — counts for the morning brief, shaped like `/api/suosittele/stats`:
 * pending and approved rows, approved signs, and rows created since a Helsinki calendar day.
 */
export const handleStats = async (request: Request, env: AdoptionEnv): Promise<Response> => {
    if (!hasBearer(request, env.LIITY_STATS_TOKEN)) return json({ error: 'unauthorized' }, 401)
    if (!env.DB) return json({ error: 'unavailable' }, 503)
    const db = env.DB
    const sinceParam = new URL(request.url).searchParams.get('since')
    const since = sinceParam && isCalendarDay(sinceParam) ? sinceParam : null
    const count = async (where: string, ...args: string[]) =>
        (
            await db
                .prepare(`SELECT COUNT(*) AS n FROM sign_adoptions WHERE ${where}`)
                .bind(...args)
                .first<{ n: number }>()
        )?.n ?? 0

    const pending = await count('status = ?', 'pending')
    const approved = await count('status = ?', 'approved')
    const signs =
        (
            await db
                .prepare("SELECT COALESCE(SUM(quantity), 0) AS n FROM sign_adoptions WHERE status = 'approved'")
                .first<{ n: number }>()
        )?.n ?? 0
    // `since` is a Helsinki calendar day; rows store UTC instants, so compare from its local midnight.
    const sinceCount = since
        ? await count("status != 'rejected' AND created_at >= ?", helsinkiDayStartUtc(since))
        : null

    return json({ approved, pending, signs, since, since_count: sinceCount })
}
