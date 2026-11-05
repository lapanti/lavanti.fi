import type { AstroIntegration } from 'astro'

import { readdir, writeFile } from 'node:fs/promises'

import { CATEGORY_SEGMENTS, tags } from '../content/tags'
import { redirects, shortLinks } from './redirects'

/*
 * Old English-id category URLs → localised segment + slug (FI/SV only; the EN
 * path is unchanged because its segment stays `category` and its slug is the
 * tag id). Generated from the tag registry so new tags are covered
 * automatically. These exist only in `_redirects` (no meta-refresh stubs), so
 * under `astro preview` the old URLs 404 — production serves true 301s.
 */
const categoryRenames: Record<string, string> = Object.fromEntries(
    tags.flatMap((tag) =>
        (['fi', 'sv'] as const).map((lang) => [
            `/${lang}/category/${tag.id}/`,
            `/${lang}/${CATEGORY_SEGMENTS[lang]}/${tag.slugs[lang]}/`,
        ])
    )
)

/*
 * File-route redirects. These live only in `_redirects`: an Astro redirect would
 * build a meta-refresh HTML stub at an `.xml` path. `@astrojs/sitemap` writes
 * `sitemap-index.xml`, but crawlers and SEO tools probe `/sitemap.xml` first.
 */
export const fileRedirects: Record<string, string> = {
    '/sitemap.xml': '/sitemap-index.xml',
}

/*
 * Canonical blog-post path: /{lang}/blog/{id}/{slug}/ — the slug segment is what
 * distinguishes it from the bare /{lang}/blog/{id}/ redirect source.
 */
const CANONICAL_POST_PATTERN = /^\/(en|fi|sv)\/blog\/(\d+)\/[^/]+\/$/

/* Any Finnish canonical page: /fi/{rest}/ — {rest} is the locale-less alias body. */
const FINNISH_PAGE_PATTERN = /^\/fi\/(.+)\/$/

/* Bare blog-post source /{lang}/blog/{id}/ — already a redirect, so never alias it. */
const BARE_POST_PATTERN = /^\/(en|fi|sv)\/blog\/\d+\/$/

/* File routes such as /fi/rss.xml — the last segment has an extension, not a page. */
const FILE_ROUTE_PATTERN = /\/[^/]+\.[^/]+\/$/

/** A built OG card endpoint, `/og/<id>.jpg`, with or without Astro's leading slash. */
const OG_CARD_PATTERN = /^\/?og\/([^/]+)\.jpg\/?$/

const normalise = (pathname: string): string => {
    const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`

    return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

/**
 * Build the Cloudflare Pages `_redirects` lines (`<from> <to> 301`) from the
 * static redirect map plus, derived from the built pages, bare-id → slug pairs
 * and locale-less aliases of every canonical Finnish page.
 *
 * Locale-less aliases: Finnish is the default language, so `/fi/{x}/` also
 * answers at `/{x}` and `/{x}/`. Cloudflare Pages forwards the request query
 * string to the destination, so no per-rule query handling is needed. Aliases
 * skip the Finnish root, bare-post sources, file routes, and any path already
 * defined as a static redirect source (never shadow a legacy redirect).
 *
 * Short links (keyed by their trailing-slash form) are written in both
 * spellings, `/x` and `/x/`, like the aliases.
 *
 * Pure and deterministic (sorted, de-duplicated) so it can be unit-tested
 * without running a full Astro build.
 */
export const buildRedirectLines = (
    map: Record<string, string>,
    pagePathnames: readonly string[],
    short: Record<string, string> = {}
): string[] => {
    const lines = new Set<string>()
    const mapSources = new Set([...Object.keys(map), ...Object.keys(short)].map(normalise))

    for (const [from, to] of Object.entries(map)) {
        lines.add(`${from} ${to} 301`)
    }
    for (const [from, to] of Object.entries(short)) {
        lines.add(`${from.replace(/\/$/, '')} ${to} 301`)
        lines.add(`${normalise(from)} ${to} 301`)
    }

    for (const pathname of pagePathnames) {
        /*
         * OG cards moved from PNG to JPEG; keep share images cached by Facebook, LinkedIn
         * and Slack under the old `/og/<id>.png` URL resolving until they re-scrape.
         */
        const ogCard = OG_CARD_PATTERN.exec(pathname)
        if (ogCard) {
            lines.add(`/og/${ogCard[1]}.png /og/${ogCard[1]}.jpg 301`)
            continue
        }

        const path = normalise(pathname)

        const post = CANONICAL_POST_PATTERN.exec(path)
        if (post) {
            const [, lang, id] = post
            lines.add(`/${lang}/blog/${id}/ ${path} 301`)
        }

        const finnishPage = FINNISH_PAGE_PATTERN.exec(path)
        if (!finnishPage || path === '/fi/' || BARE_POST_PATTERN.test(path) || FILE_ROUTE_PATTERN.test(path)) {
            continue
        }

        const alias = `/${finnishPage[1]}`
        if (mapSources.has(alias) || mapSources.has(`${alias}/`)) continue
        lines.add(`${alias} ${path} 301`)
        lines.add(`${alias}/ ${path} 301`)
    }

    return [...lines].sort()
}

/**
 * Astro integration that writes `dist/_redirects` after the static build.
 *
 * Under `output: 'static'` Astro compiles every redirect into a client-side
 * meta-refresh HTML stub (HTTP 200), not an HTTP 301. This layers a Cloudflare
 * Pages `_redirects` file on top so the same paths return a true 301 in
 * production — Pages always follows a `_redirects` rule even when a static asset
 * exists at that path, so the stubs remain only as an `astro preview` fallback.
 */
export const redirectsFile = (): AstroIntegration => ({
    hooks: {
        'astro:build:done': async ({ pages, dir, logger }) => {
            // `pages` lists HTML routes only, not endpoint files, so the OG cards are read from disk.
            const ogCards = (await readdir(new URL('og/', dir))).map((file) => `og/${file}`)
            const lines = buildRedirectLines(
                { ...categoryRenames, ...fileRedirects, ...redirects },
                [...pages.map((page) => page.pathname), ...ogCards],
                shortLinks
            )
            await writeFile(new URL('_redirects', dir), `${lines.join('\n')}\n`, 'utf-8')
            logger.info(`wrote _redirects (${lines.length} rules)`)
        },
    },
    name: 'redirects-file',
})
