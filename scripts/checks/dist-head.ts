/**
 * dist-head.ts
 *
 * Built-HTML head guardrail. Scans every page in the build output (dist/ by
 * default) and asserts the SEO-critical head tags survived the layout → Head
 * prop wiring. Unit tests cover Head.astro's own logic; this check catches a
 * layout silently dropping a prop, which no unit test can see.
 *
 * Checks per indexable page (redirect stubs and noindex pages are skipped):
 *   - exactly one non-empty <title>
 *   - non-empty meta description
 *   - canonical present, absolute on the site origin, trailing slash, and
 *     pointing at the page's own path
 *   - hreflang links for exactly fi+sv+en plus x-default equal to the fi URL
 *   - every hreflang target exists as a built page (guards the locale-swap
 *     fallback in Head.astro against pages shipped in fewer than 3 locales)
 *   - og:title, og:description and og:url present; og:url equals canonical
 *   - og:image present on blog post pages
 *   - RSS autodiscovery link matching the page locale
 *   - every JSON-LD block parses, declares schema.org and a known @type;
 *     blog post pages carry a BlogPosting with datePublished
 *   - LCP hero preload drift guard (.agents/specs/lcp-delivery.md): every
 *     fetchpriority=high hero has an image preload whose imagesrcset/imagesizes
 *     are byte-equal to the hero <img>/<source> markup, with no crossorigin and
 *     no href; post pages carry exactly one image preload
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import process from 'node:process'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { NEWSLETTER_SEGMENTS } from '../../src/lib/newsletterRoutes.ts'
/* eslint-enable import-x/extensions */

const SITE = 'https://lavanti.fi'
const LANGS = ['fi', 'sv', 'en']
const KNOWN_JSONLD_TYPES = new Set([
    'BlogPosting',
    'BreadcrumbList',
    'CollectionPage',
    'Event',
    'FAQPage',
    'Person',
    'ProfilePage',
    'WebPage',
    'WebSite',
])
const POST_PATH_RE = /^\/(fi|sv|en)\/blog\/\d+\/.+\/$/
/* Newsletter archive issues: /{lang}/{uutiskirje|newsletter|nyhetsbrev}/{id}/{slug}/ — article rules apply. */
const NEWSLETTER_PATH_RE = new RegExp(`^/(fi|sv|en)/(${Object.values(NEWSLETTER_SEGMENTS).join('|')})/\\d+/.+/$`)

type TagAttrs = Record<string, string>

/** URL pathname with percent-encoding decoded, so it compares against raw dist dir names. */
const urlPath = (href: string): string => decodeURIComponent(new URL(href).pathname)

/** Parse the attributes of a single HTML tag into an object (order-agnostic). */
export function parseAttrs(tag: string): TagAttrs {
    const attrs: TagAttrs = {}
    for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
        attrs[m[1]] = m[2]
    }
    return attrs
}

/** Collect all tags with the given name from an HTML document. */
export function findTags(html: string, tagName: string): TagAttrs[] {
    return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'g'))].map((m) => parseAttrs(m[0]))
}

/** True for redirect stubs and noindex pages, which carry no SEO head. */
export function isSkippablePage(html: string): boolean {
    if (/http-equiv="refresh"/.test(html)) return true
    return findTags(html, 'meta').some((t) => t.name === 'robots' && /noindex/.test(t.content ?? ''))
}

/** Recursively collect built pages as { pagePath: html } (dist-relative URL paths). */
export function collectPages(distDir: string): Map<string, string> {
    const pages = new Map<string, string>()
    const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) walk(full)
            else if (entry.name === 'index.html') {
                const rel = full.slice(distDir.length).split(sep).join('/')
                pages.set(rel.replace(/index\.html$/, ''), readFileSync(full, 'utf8'))
            }
        }
    }
    walk(distDir)
    return pages
}

/** Check one page; returns a list of problem descriptions (empty = ok). */
export function checkPage(html: string, pagePath: string, builtPaths: Set<string>): string[] {
    const problems: string[] = []
    const isPost = POST_PATH_RE.test(pagePath) || NEWSLETTER_PATH_RE.test(pagePath)
    const lang = pagePath.split('/')[1]

    const titles = [...html.matchAll(/<title[^>]*>([^<]*)<\/title>/g)].map((m) => m[1].trim())
    if (titles.length !== 1) problems.push(`expected exactly one <title>, found ${titles.length}`)
    else if (!titles[0]) problems.push('empty <title>')

    const metas = findTags(html, 'meta')
    const meta = (name: string, key = 'name') => metas.filter((t) => t[key] === name)

    if (!meta('description').some((t) => (t.content ?? '').trim())) problems.push('missing or empty meta description')

    const links = findTags(html, 'link')
    const canonicals = links.filter((t) => t.rel === 'canonical')
    if (canonicals.length !== 1) {
        problems.push(`expected exactly one canonical link, found ${canonicals.length}`)
    } else {
        const href = canonicals[0].href ?? ''
        if (!href.startsWith(`${SITE}/`)) problems.push(`canonical is not absolute on ${SITE}: "${href}"`)
        else if (!href.endsWith('/')) problems.push(`canonical lacks trailing slash: "${href}"`)
        else if (urlPath(href) !== pagePath)
            problems.push(`canonical path "${urlPath(href)}" differs from page path "${pagePath}"`)
    }

    const hreflangs = links.filter((t) => t.rel === 'alternate' && t.hreflang)
    const byLang = new Map(hreflangs.map((t) => [t.hreflang, t.href]))
    const expected = [...LANGS, 'x-default']
    if (hreflangs.length !== expected.length || !expected.every((l) => byLang.has(l))) {
        problems.push(
            `expected hreflang set ${expected.join(',')}, found ${hreflangs.map((t) => t.hreflang).join(',') || 'none'}`
        )
    } else {
        if (byLang.get('x-default') !== byLang.get('fi'))
            problems.push(`x-default "${byLang.get('x-default')}" differs from fi "${byLang.get('fi')}"`)
        for (const [hl, href] of byLang) {
            if (!href?.startsWith(`${SITE}/`)) {
                problems.push(`hreflang ${hl} is not absolute on ${SITE}: "${href}"`)
            } else if (!builtPaths.has(urlPath(href))) {
                problems.push(`hreflang ${hl} points at "${urlPath(href)}" which is not a built page`)
            }
        }
    }

    for (const prop of ['og:title', 'og:description', 'og:url']) {
        if (!meta(prop, 'property').some((t) => (t.content ?? '').trim())) problems.push(`missing ${prop}`)
    }
    const ogUrl = meta('og:url', 'property')[0]?.content
    if (ogUrl && canonicals[0]?.href && ogUrl !== canonicals[0].href)
        problems.push(`og:url "${ogUrl}" differs from canonical "${canonicals[0].href}"`)
    if (isPost && !meta('og:image', 'property').some((t) => (t.content ?? '').trim()))
        problems.push('post page missing og:image')

    if (LANGS.includes(lang)) {
        const rss = links.filter((t) => t.rel === 'alternate' && t.type === 'application/rss+xml')
        if (!rss.some((t) => t.href === `/${lang}/rss.xml`))
            problems.push(`missing RSS autodiscovery link for /${lang}/rss.xml`)
    }

    const preloads = links.filter((t) => t.rel === 'preload' && t.as === 'image')
    const heroImgs = findTags(html, 'img').filter((t) => t.fetchpriority === 'high')
    const heroSrcsets = new Map<string, string>()
    for (const el of [...heroImgs, ...findTags(html, 'source')]) {
        if (el.srcset) heroSrcsets.set(el.srcset, el.sizes ?? '')
    }

    if (heroImgs.length > 0 && preloads.length === 0)
        problems.push('hero image (fetchpriority=high) has no preload link')
    if (isPost && heroImgs.length > 0 && preloads.length !== 1)
        problems.push(`post page expected exactly one image preload, found ${preloads.length}`)
    for (const p of preloads) {
        if (p.crossorigin !== undefined) problems.push('image preload carries crossorigin (double-download hazard)')
        if (p.href !== undefined) problems.push('image preload carries an href fallback (double-download hazard)')
        if (!p.imagesrcset) {
            problems.push('image preload missing imagesrcset')
        } else if (!heroSrcsets.has(p.imagesrcset)) {
            problems.push('image preload imagesrcset does not match any hero img/source srcset')
        } else if ((p.imagesizes ?? '') !== heroSrcsets.get(p.imagesrcset)) {
            problems.push('image preload imagesizes differs from its hero element sizes')
        }
    }

    const jsonldBlocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1])
    if (jsonldBlocks.length === 0) problems.push('no JSON-LD blocks')
    const parsedTypes: Array<Record<string, unknown>> = []
    for (const block of jsonldBlocks) {
        try {
            const data = JSON.parse(block)
            if (data['@context'] !== 'https://schema.org')
                problems.push(`JSON-LD @context is "${data['@context']}", expected "https://schema.org"`)
            if (!KNOWN_JSONLD_TYPES.has(data['@type'])) problems.push(`unknown JSON-LD @type "${data['@type']}"`)
            parsedTypes.push(data)
        } catch {
            problems.push('JSON-LD block does not parse as JSON')
        }
    }
    if (isPost) {
        const posting = parsedTypes.find((d) => d['@type'] === 'BlogPosting')
        if (!posting) problems.push('post page missing BlogPosting JSON-LD')
        else if (!posting.datePublished) problems.push('BlogPosting JSON-LD missing datePublished')
    }

    /*
     * Google's structured-data policy: marked-up FAQ content must be visible on
     * the page. The layouts gate both on hasFaqSection(), but a PageLayout page
     * composes its own body — it can carry faq frontmatter (which reaches Head
     * unconditionally) while forgetting to render the plate. That mismatch is
     * invisible in review, so catch it in the built HTML instead.
     */
    if (parsedTypes.some((d) => d['@type'] === 'FAQPage') && !/class="faq section"/.test(html))
        problems.push('FAQPage JSON-LD with no visible FAQ section')

    return problems
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).join('/'))

if (isMain) {
    const distDir = process.argv[2] ?? 'dist'
    const pages = collectPages(distDir)
    if (pages.size === 0) {
        process.stderr.write(`\x1b[31mERROR\x1b[0m [dist-head] no index.html files found under "${distDir}"\n`)
        process.exit(1)
    }

    const builtPaths = new Set(pages.keys())
    let checked = 0
    let hasError = false
    for (const [pagePath, html] of pages) {
        if (isSkippablePage(html)) continue
        checked += 1
        for (const problem of checkPage(html, pagePath, builtPaths)) {
            process.stderr.write(`\x1b[31mERROR\x1b[0m [dist-head] ${pagePath}: ${problem}\n`)
            hasError = true
        }
    }

    if (checked === 0) {
        process.stderr.write(`\x1b[31mERROR\x1b[0m [dist-head] every page was skipped — check the skip heuristics\n`)
        process.exit(1)
    }
    if (!hasError) console.log(`OK: ${checked} indexable pages verified (${pages.size} built pages scanned)`)
    process.exit(hasError ? 1 : 0)
}
