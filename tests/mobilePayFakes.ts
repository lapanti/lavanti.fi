/** Fakes for the MobilePay online client (src/lib/mobilePay.ts) and the handlers that use it. */

export const MOBILEPAY_ENV = {
    MOBILEPAY_API: 'https://apitest.vipps.no',
    MOBILEPAY_CLIENT_ID: 'id',
    MOBILEPAY_CLIENT_SECRET: 'secret',
    MOBILEPAY_MSN: '123456',
    MOBILEPAY_SUBSCRIPTION_KEY: 'sub',
}

/**
 * A fake MobilePay API: the token endpoint answers a token; every other call gets `answer` (or,
 * when it is a function, its result for the URL) with `status`.
 */
export const fakeMobilePay = (answer: ((url: string) => unknown) | Record<string, unknown> = {}, status = 200) => {
    const calls: { init: RequestInit; url: string }[] = []
    const fetchFn = async (url: string, init: RequestInit = {}) => {
        calls.push({ init, url })
        if (url.endsWith('/accesstoken/get')) return Response.json({ access_token: 'at', expires_in: '86398' })

        return Response.json(typeof answer === 'function' ? answer(url) : answer, { status })
    }

    return { calls, fetchFn }
}

const b64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)))

/** A webhook request signed the way the MobilePay webhook docs describe. */
export const signedWebhook = async (body: string, secret: string, url = 'https://lavanti.fi/api/adoptoi/mobilepay') => {
    const enc = new TextEncoder()
    const hash = b64(await crypto.subtle.digest('SHA-256', enc.encode(body)))
    const date = 'Sat, 28 Nov 2026 10:00:00 GMT'
    const { host, pathname, search } = new URL(url)
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { hash: 'SHA-256', name: 'HMAC' }, false, [
        'sign',
    ])
    const signed = `POST\n${pathname}${search}\n${date};${host};${hash}`
    const signature = b64(await crypto.subtle.sign('HMAC', key, enc.encode(signed)))

    return new Request(url, {
        body,
        headers: {
            Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
            'x-ms-content-sha256': hash,
            'x-ms-date': date,
        },
        method: 'POST',
    })
}
