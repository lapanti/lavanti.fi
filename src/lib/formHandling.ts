/**
 * Helpers shared by the Pages Function handlers behind the site's own forms
 * (`src/lib/volunteers.ts`, `src/lib/recommendationSubmissions.ts`).
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

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** Hostnames the Turnstile widget is registered for; siteverify must report one of them. */
const TURNSTILE_HOSTNAMES = new Set(['lavanti.fi', 'www.lavanti.fi'])

/** A trimmed string field, or '' when it is missing or a file. */
export const text = (form: FormData, name: string): string => {
    const v = form.get(name)

    return typeof v === 'string' ? v.trim() : ''
}

export const redirect = (location: string, status: 302 | 303): Response =>
    new Response(null, { headers: { 'Cache-Control': 'no-store', Location: location }, status })

export const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
        status,
    })

const timingSafeEqual = (a: string, b: string): boolean => {
    const enc = new TextEncoder()
    const x = enc.encode(a)
    const y = enc.encode(b)
    let diff = x.length ^ y.length
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)

    return diff === 0
}

/** True when the request carries `Authorization: Bearer <token>` and the token is set. */
export const hasBearer = (request: Request, token: string | undefined): boolean =>
    !!token && timingSafeEqual(request.headers.get('Authorization') ?? '', `Bearer ${token}`)

export const verifyTurnstile = async (
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
