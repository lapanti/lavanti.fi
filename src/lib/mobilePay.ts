/**
 * Vipps MobilePay ePayment API client for Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md
 * § MobilePay online): access token, create, read and capture a payment, register the webhook and
 * check a webhook's HMAC signature. API: https://developer.vippsmobilepay.com/api/epayment/
 *
 * Plain fetch and Web Crypto, so it runs in a Pages Function and in Node. No imports, so the CLI
 * under scripts/ can load it directly.
 */

export interface MobilePayEnv {
    /** `https://apitest.vipps.no` for the test environment; production when unset. */
    MOBILEPAY_API?: string
    MOBILEPAY_CLIENT_ID?: string
    MOBILEPAY_CLIENT_SECRET?: string
    /** Merchant serial number of the sales unit. */
    MOBILEPAY_MSN?: string
    MOBILEPAY_SUBSCRIPTION_KEY?: string
}

export interface MobilePayConfig {
    api: string
    clientId: string
    clientSecret: string
    msn: string
    subscriptionKey: string
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const PRODUCTION_API = 'https://api.vipps.no'

/** The API settings, or null while any key is missing: the payment step then shows only the number. */
export const mobilePayConfig = (env: MobilePayEnv): MobilePayConfig | null => {
    const clientId = env.MOBILEPAY_CLIENT_ID
    const clientSecret = env.MOBILEPAY_CLIENT_SECRET
    const msn = env.MOBILEPAY_MSN
    const subscriptionKey = env.MOBILEPAY_SUBSCRIPTION_KEY
    if (!clientId || !clientSecret || !msn || !subscriptionKey) return null

    return { api: env.MOBILEPAY_API || PRODUCTION_API, clientId, clientSecret, msn, subscriptionKey }
}

let cachedToken: undefined | { expires: number; key: string; token: string }

/** Forgets the cached access token (tests). */
export const resetTokenCache = (): void => {
    cachedToken = undefined
}

/** A token lives 1 hour in test and 24 hours in production; it is reused until 5 minutes before it ends. */
const accessToken = async (config: MobilePayConfig, fetchFn: Fetch): Promise<string> => {
    const key = `${config.api} ${config.clientId} ${config.msn}`
    if (cachedToken?.key === key && cachedToken.expires > Date.now()) return cachedToken.token
    const res = await fetchFn(`${config.api}/accesstoken/get`, {
        headers: {
            'Merchant-Serial-Number': config.msn,
            'Ocp-Apim-Subscription-Key': config.subscriptionKey,
            client_id: config.clientId,
            client_secret: config.clientSecret,
        },
        method: 'POST',
    })
    if (!res.ok) throw new Error(`MobilePay access token: ${res.status}`)
    const body = (await res.json()) as { access_token?: string; expires_in?: number | string }
    if (!body.access_token) throw new Error('MobilePay access token: no token in the response')
    // expires_in comes as a string in the documented example.
    const seconds = Number(body.expires_in) || 3600
    cachedToken = { expires: Date.now() + (seconds - 300) * 1000, key, token: body.access_token }

    return body.access_token
}

const call = async <T>(
    config: MobilePayConfig,
    fetchFn: Fetch,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    idempotencyKey?: string
): Promise<T> => {
    const res = await fetchFn(`${config.api}${path}`, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
            Authorization: `Bearer ${await accessToken(config, fetchFn)}`,
            'Content-Type': 'application/json',
            'Merchant-Serial-Number': config.msn,
            'Ocp-Apim-Subscription-Key': config.subscriptionKey,
            'Vipps-System-Name': 'lavanti-fi',
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        method,
    })
    if (!res.ok) throw new Error(`MobilePay ${method} ${path}: ${res.status}`)

    return (await res.json()) as T
}

/**
 * A new payment reference for an adoption ref: `adoptoi-K-12345-<time>`. Each attempt needs its
 * own, because an aborted or expired reference can't be used again. The API allows
 * `^[a-zA-Z0-9-]{8,64}$`, so "K-12345" alone is too short.
 */
export const paymentReference = (ref: string, now: Date): string => `adoptoi-${ref}-${now.getTime().toString(36)}`

/** The adoption ref inside a payment reference, or null for anything this site didn't create. */
export const refOfPayment = (reference: string): null | string =>
    /^adoptoi-(K-\d{5})-[a-z0-9]{1,12}$/.exec(reference)?.[1] ?? null

export interface NewPayment {
    cents: number
    /** Shown in the MobilePay app; 3–100 characters. */
    description: string
    reference: string
    returnUrl: string
    /** Profile data to ask for, space-separated ("name"); the donor approves sharing it in the app. */
    scope?: string
}

/** Creates a payment and returns the MobilePay URL to send the donor to. */
export const createPayment = async (config: MobilePayConfig, fetchFn: Fetch, p: NewPayment): Promise<string> => {
    const body = await call<{ redirectUrl?: string }>(
        config,
        fetchFn,
        'POST',
        '/epayment/v1/payments',
        {
            amount: { currency: 'EUR', value: p.cents },
            paymentDescription: p.description,
            paymentMethod: { type: 'WALLET' },
            ...(p.scope ? { profile: { scope: p.scope } } : {}),
            reference: p.reference,
            returnUrl: p.returnUrl,
            userFlow: 'WEB_REDIRECT',
        },
        p.reference
    )
    if (!body.redirectUrl?.startsWith('https://')) throw new Error('MobilePay create: no redirectUrl')

    return body.redirectUrl
}

interface Money {
    value?: number
}

export interface Payment {
    /** Cents reserved on the donor's account. */
    authorized: number
    captured: number
    /** First and last name from MobilePay when the donor shared them. */
    payerName: null | string
    /** CREATED, AUTHORIZED, ABORTED, EXPIRED or TERMINATED. */
    state: string
}

export const getPayment = async (config: MobilePayConfig, fetchFn: Fetch, reference: string): Promise<Payment> => {
    const body = await call<{
        aggregate?: { authorizedAmount?: Money; capturedAmount?: Money }
        state?: string | string[]
        userDetails?: { firstName?: string; lastName?: string }
    }>(config, fetchFn, 'GET', `/epayment/v1/payments/${reference}`)
    // The schema says a string; the documented example shows an array.
    const state = (Array.isArray(body.state) ? body.state[0] : body.state) ?? 'UNKNOWN'
    const name = [body.userDetails?.firstName, body.userDetails?.lastName]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' ')

    return {
        authorized: body.aggregate?.authorizedAmount?.value ?? 0,
        captured: body.aggregate?.capturedAmount?.value ?? 0,
        payerName: name || null,
        state,
    }
}

/** Captures `cents` of a reserved payment; returns the total captured so far. */
export const capturePayment = async (
    config: MobilePayConfig,
    fetchFn: Fetch,
    reference: string,
    cents: number
): Promise<number> => {
    const body = await call<{ aggregate?: { capturedAmount?: Money } }>(
        config,
        fetchFn,
        'POST',
        `/epayment/v1/payments/${reference}/capture`,
        { modificationAmount: { currency: 'EUR', value: cents } },
        `capture-${reference}`
    )

    return body.aggregate?.capturedAmount?.value ?? 0
}

/** Only the authorized event is needed: the page polls for the rest. */
const WEBHOOK_EVENTS = ['epayments.payment.authorized.v1']

/** Registers the webhook once; the returned secret goes into MOBILEPAY_WEBHOOK_SECRET. */
export const registerWebhook = (
    config: MobilePayConfig,
    fetchFn: Fetch,
    url: string
): Promise<{ id: string; secret: string }> =>
    call(config, fetchFn, 'POST', '/webhooks/v1/webhooks', { events: WEBHOOK_EVENTS, url })

const base64 = (bytes: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(bytes)))

const SIGNATURE = /^HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=([A-Za-z0-9+/=]+)$/

/**
 * Checks a webhook against its registration secret: the body hash in `x-ms-content-sha256` and an
 * HMAC-SHA256 over `POST\n<path and query>\n<x-ms-date>;<host>;<content hash>`, as documented in
 * https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
 */
export const verifyWebhook = async (request: Request, body: string, secret: string): Promise<boolean> => {
    const date = request.headers.get('x-ms-date')
    const hash = request.headers.get('x-ms-content-sha256')
    const signature = SIGNATURE.exec(request.headers.get('Authorization') ?? '')?.[1]
    if (!date || !hash || !signature) return false
    const enc = new TextEncoder()
    if (base64(await crypto.subtle.digest('SHA-256', enc.encode(body))) !== hash) return false

    const url = new URL(request.url)
    const host = request.headers.get('host') ?? url.host
    const signed = `POST\n${url.pathname}${url.search}\n${date};${host};${hash}`
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { hash: 'SHA-256', name: 'HMAC' }, false, [
        'verify',
    ])
    let given: Uint8Array<ArrayBuffer>
    try {
        given = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0))
    } catch {
        return false
    }

    // verify() compares in constant time.
    return crypto.subtle.verify('HMAC', key, given, enc.encode(signed))
}
