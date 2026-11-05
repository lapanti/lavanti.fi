/*
 * GET / — server-side language redirect (#1666). Swedish browsers go to /sv/, everyone else to
 * the Finnish default. 302, not 301: the target depends on the request, so neither browsers nor
 * crawlers may pin one answer. `Vary: Accept-Language` keeps shared caches from doing the same.
 *
 * Kept free of imports so scripts/checks/dist-crawl.ts can load it under --experimental-strip-types.
 */

/** Every path `/` can answer with; dist-crawl checks each is a built page and not a redirect source. */
export const ROOT_TARGETS = ['/fi/', '/sv/'] as const

type RootTarget = (typeof ROOT_TARGETS)[number]

/**
 * Pick the root target from an `Accept-Language` header: the primary subtag of the highest-weighted
 * language, `sv` → /sv/, anything else (or no header) → /fi/. Ties keep header order.
 */
export const rootTarget = (acceptLanguage: string | null): RootTarget => {
    let best = { lang: 'fi', q: -1 }
    for (const part of (acceptLanguage ?? '').split(',')) {
        const [tag, ...params] = part.trim().split(';')
        if (!tag) continue
        const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
        const q = qParam ? Number(qParam.slice(2)) : 1
        if (Number.isNaN(q) || q <= best.q) continue
        best = { lang: tag.toLowerCase().split('-')[0], q }
    }

    return best.lang === 'sv' ? '/sv/' : '/fi/'
}

/** One-hop redirect from `/` to the language root, query string preserved. */
export const handleRoot = (request: Request): Response => {
    const url = new URL(request.url)
    const location = `${rootTarget(request.headers.get('Accept-Language'))}${url.search}`

    return new Response(null, {
        headers: {
            'Cache-Control': 'private, max-age=0',
            Location: location,
            Vary: 'Accept-Language',
        },
        status: 302,
    })
}
