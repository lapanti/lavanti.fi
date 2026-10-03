/**
 * Server logic for the volunteer sign-up (`POST /api/liity`), the counted donation
 * shortcut (`GET /lahjoita`) and the aggregate stats endpoint (`GET /api/liity/stats`).
 * The Pages Functions in `functions/` are thin wrappers around these handlers so the
 * logic is unit-tested here (spec: lapanti/lavanti-2027 specs/conversion-tracking).
 *
 * Data rules:
 * - Volunteer rows hold only what the form asks for, plus the consent time and the
 *   campaign link the visitor arrived through. No IP, user agent or cookie is stored.
 * - Donation clicks store the hour and the campaign link only.
 * - Stats return counts, never rows; any cell below MIN_CELL is merged into "muu".
 */

/** Minimal D1 surface used here, so no Workers type package is needed. */
export interface D1Statement {
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
    bind(...values: unknown[]): D1Statement
    first<T = Record<string, unknown>>(): Promise<null | T>
    run(): Promise<unknown>
}

export interface D1Like {
    prepare(sql: string): D1Statement
}

export interface VolunteerEnv {
    DB?: D1Like
    DONATE_URL?: string
    LIITY_STATS_TOKEN?: string
    TURNSTILE_SECRET?: string
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export const DONATE_URL =
    'https://www.vihreat.fi/eduskuntavaaliehdokkaat-2027/?kieli=fi&vaali=eduskuntavaalit-2027&alue=vp2&ehdokas=lavanti-lauri-10202&valilehti=donate'

export const MUNICIPALITIES = ['kirkkonummi', 'espoo', 'vantaa', 'muu-uusimaa', 'muu'] as const
export const HELP_OPTIONS = ['jakaminen', 'tapahtumat', 'some', 'muu'] as const
const LANGS = ['fi', 'sv', 'en'] as const

/** Bump when the consent wording on the form or in the privacy notice changes. */
const CONSENT_VERSION = '2026-10'

/** Smallest count a stats cell may show; smaller cells are merged into "muu". */
const MIN_CELL = 3

/** Hostnames the Turnstile widget is registered for; siteverify must report one of them. */
const TURNSTILE_HOSTNAMES = new Set(['lavanti.fi', 'www.lavanti.fi'])

const UTM_SLUG = /^[a-z0-9._-]{1,64}$/
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/
const PHONE = /^\+?[0-9 ()-]{5,20}$/

type Lang = (typeof LANGS)[number]

const FORM_PATH: Record<Lang, string> = { en: '/en/join/', fi: '/fi/liity/', sv: '/sv/bli-med/' }
const THANKS_PATH: Record<Lang, string> = {
    en: '/en/join/thanks/',
    fi: '/fi/liity/kiitos/',
    sv: '/sv/bli-med/tack/',
}

/** Lowercased slug or null; the same rule as the newsletter form's hidden UTM fields. */
export const utmSlug = (value: null | string | undefined): null | string => {
    const v = (value ?? '').trim().toLowerCase()

    return UTM_SLUG.test(v) ? v : null
}

const text = (form: FormData, name: string): string => {
    const v = form.get(name)

    return typeof v === 'string' ? v.trim() : ''
}

interface VolunteerRow {
    consent_at: string
    consent_version: string
    created_at: string
    email: string
    help: string
    lang: Lang
    municipality: string
    name: string
    phone: null | string
    utm_campaign: null | string
    utm_source: null | string
}

export type ParseResult = { error: string; ok: false } | { ok: true; row: VolunteerRow }

/** Validates the posted form. Never echoes input back; the error is a code. */
export const parseVolunteer = (form: FormData, now: Date): ParseResult => {
    const lang = text(form, 'lang') as Lang
    if (!LANGS.includes(lang)) return { error: 'lang', ok: false }
    if (text(form, 'website') !== '') return { error: 'honeypot', ok: false }

    const name = text(form, 'name')
    if (name.length < 2 || name.length > 100) return { error: 'name', ok: false }

    const email = text(form, 'email').toLowerCase()
    if (!EMAIL.test(email)) return { error: 'email', ok: false }

    const phone = text(form, 'phone')
    if (phone !== '' && !PHONE.test(phone)) return { error: 'phone', ok: false }

    const municipality = text(form, 'municipality')
    if (!(MUNICIPALITIES as readonly string[]).includes(municipality)) return { error: 'municipality', ok: false }

    const help = form
        .getAll('help')
        .filter((v): v is string => typeof v === 'string')
        .filter((v) => (HELP_OPTIONS as readonly string[]).includes(v))
    if (help.length === 0) return { error: 'help', ok: false }

    if (text(form, 'consent') !== 'yes') return { error: 'consent', ok: false }

    const iso = now.toISOString()

    return {
        ok: true,
        row: {
            consent_at: iso,
            consent_version: CONSENT_VERSION,
            created_at: iso,
            email,
            help: JSON.stringify([...new Set(help)].sort()),
            lang,
            municipality,
            name,
            phone: phone === '' ? null : phone,
            utm_campaign: utmSlug(text(form, 'utm_campaign')),
            utm_source: utmSlug(text(form, 'utm_source')),
        },
    }
}

const redirect = (location: string, status: 302 | 303): Response =>
    new Response(null, { headers: { 'Cache-Control': 'no-store', Location: location }, status })

const verifyTurnstile = async (
    form: FormData,
    request: Request,
    secret: string,
    fetchFn: FetchLike
): Promise<boolean> => {
    const token = text(form, 'cf-turnstile-response')
    if (token === '') return false
    const body = new FormData()
    body.append('secret', secret)
    body.append('response', token)
    const ip = request.headers.get('CF-Connecting-IP')
    if (ip) body.append('remoteip', ip)
    body.append('idempotency_key', crypto.randomUUID())
    try {
        const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body,
            method: 'POST',
        })
        const data = (await res.json()) as { hostname?: string; success?: boolean }

        // A token solved on another site that embeds the same key must not count.
        return data.success === true && TURNSTILE_HOSTNAMES.has(data.hostname ?? '')
    } catch {
        return false
    }
}

/** POST /api/liity — form post in, 303 to the thank-you page or back to the form. */
export const handleSignup = async (
    request: Request,
    env: VolunteerEnv,
    fetchFn: FetchLike,
    now = new Date()
): Promise<Response> => {
    const origin = new URL(request.url).origin
    let form: FormData
    try {
        form = await request.formData()
    } catch {
        return redirect(`${origin}${FORM_PATH.fi}?virhe=lomake#lomake`, 303)
    }
    const langField = text(form, 'lang') as Lang
    const lang: Lang = LANGS.includes(langField) ? langField : 'fi'
    const back = (code: string) => redirect(`${origin}${FORM_PATH[lang]}?virhe=${code}#lomake`, 303)

    const parsed = parseVolunteer(form, now)
    if (!parsed.ok) {
        // A filled honeypot looks like success to the bot, and nothing is stored.
        return parsed.error === 'honeypot' ? redirect(`${origin}${THANKS_PATH[lang]}`, 303) : back(parsed.error)
    }
    /*
     * Configuration and database failures all show the visitor `palvelu`; the log line names
     * which one (Pages → Deployments → Functions → real-time logs). No form data is logged.
     */
    if (!env.DB || !env.TURNSTILE_SECRET) {
        console.error(`liity: missing ${env.DB ? '' : 'DB binding '}${env.TURNSTILE_SECRET ? '' : 'TURNSTILE_SECRET'}`)
        return back('palvelu')
    }
    if (!(await verifyTurnstile(form, request, env.TURNSTILE_SECRET, fetchFn))) return back('varmistus')

    const r = parsed.row
    try {
        await env.DB.prepare(
            `INSERT INTO volunteers (created_at, lang, name, email, phone, municipality, help, utm_source, utm_campaign, consent_at, consent_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(
                r.created_at,
                r.lang,
                r.name,
                r.email,
                r.phone,
                r.municipality,
                r.help,
                r.utm_source,
                r.utm_campaign,
                r.consent_at,
                r.consent_version
            )
            .run()
    } catch (err) {
        console.error(`liity: insert failed: ${err instanceof Error ? err.message : String(err)}`)
        return back('palvelu')
    }

    return redirect(`${origin}${THANKS_PATH[lang]}`, 303)
}

/** GET /lahjoita — count the click (hour + campaign link only), then 302 to the party form. */
export const handleDonate = async (request: Request, env: VolunteerEnv, now = new Date()): Promise<Response> => {
    const url = new URL(request.url)
    const hour = `${now.toISOString().slice(0, 13)}:00:00Z`
    if (env.DB) {
        try {
            await env.DB.prepare('INSERT INTO donate_clicks (ts, utm_source, utm_campaign) VALUES (?, ?, ?)')
                .bind(hour, utmSlug(url.searchParams.get('utm_source')), utmSlug(url.searchParams.get('utm_campaign')))
                .run()
        } catch {
            // Counting is best-effort; the donor must always reach the form.
        }
    }

    return redirect(env.DONATE_URL || DONATE_URL, 302)
}

const timingSafeEqual = (a: string, b: string): boolean => {
    const enc = new TextEncoder()
    const x = enc.encode(a)
    const y = enc.encode(b)
    let diff = x.length ^ y.length
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)

    return diff === 0
}

/** Merges every cell below MIN_CELL into one "muu" cell; drops "muu" if it is still below. */
export const suppress = (counts: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {}
    let other = 0
    for (const [key, n] of Object.entries(counts)) {
        if (n >= MIN_CELL && key !== 'muu') out[key] = n
        else other += n
    }
    if (other >= MIN_CELL) out.muu = other

    return out
}

const tally = (rows: { key: null | string; n: number }[]): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const { key, n } of rows) out[key ?? '(ei linkkiä)'] = (out[key ?? '(ei linkkiä)'] ?? 0) + n

    return out
}

const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
        status,
    })

/** GET /api/liity/stats — aggregate counts for the analytics fetch and the morning brief. */
export const handleStats = async (request: Request, env: VolunteerEnv): Promise<Response> => {
    const auth = request.headers.get('Authorization') ?? ''
    const token = env.LIITY_STATS_TOKEN
    if (!token || !timingSafeEqual(auth, `Bearer ${token}`)) return json({ error: 'unauthorized' }, 401)
    if (!env.DB) return json({ error: 'unavailable' }, 503)

    const since = new URL(request.url).searchParams.get('since')
    const sinceDate = since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? since : null
    const db = env.DB

    const total = (await db.prepare('SELECT COUNT(*) AS n FROM volunteers').first<{ n: number }>())?.n ?? 0
    const sinceCount = sinceDate
        ? ((
              await db
                  .prepare('SELECT COUNT(*) AS n FROM volunteers WHERE created_at >= ?')
                  .bind(sinceDate)
                  .first<{ n: number }>()
          )?.n ?? 0)
        : null
    const byMunicipality = await db
        .prepare('SELECT municipality AS key, COUNT(*) AS n FROM volunteers GROUP BY municipality')
        .all<{ key: string; n: number }>()
    const helpRows = await db.prepare('SELECT help FROM volunteers').all<{ help: string }>()
    const byHelp: Record<string, number> = {}
    for (const { help } of helpRows.results) {
        for (const h of JSON.parse(help) as string[]) byHelp[h] = (byHelp[h] ?? 0) + 1
    }
    const volunteerLinks = await db
        .prepare(
            "SELECT COALESCE(utm_campaign, '-') || ' / ' || COALESCE(utm_source, '-') AS key, COUNT(*) AS n FROM volunteers GROUP BY key"
        )
        .all<{ key: string; n: number }>()
    const clickLinks = await db
        .prepare(
            "SELECT COALESCE(utm_campaign, '-') || ' / ' || COALESCE(utm_source, '-') AS key, COUNT(*) AS n FROM donate_clicks GROUP BY key"
        )
        .all<{ key: string; n: number }>()
    const clickTotal = (await db.prepare('SELECT COUNT(*) AS n FROM donate_clicks').first<{ n: number }>())?.n ?? 0

    return json({
        donate_clicks: { by_campaign_source: suppress(tally(clickLinks.results)), total: clickTotal },
        volunteers: {
            by_campaign_source: suppress(tally(volunteerLinks.results)),
            by_help: suppress(byHelp),
            by_municipality: suppress(tally(byMunicipality.results)),
            since: sinceDate,
            since_count: sinceCount,
            total,
        },
    })
}
