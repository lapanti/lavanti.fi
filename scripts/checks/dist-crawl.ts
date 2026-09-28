/**
 * dist-crawl.ts
 *
 * Built-output crawl-artifact guardrail. Validates the site-level delivery
 * files that the per-page head check (dist-head.ts) and @astrojs/sitemap do not
 * cover:
 *
 *   - llms.txt: every internal link resolves to a built page. The file is
 *     hand-curated and has shipped broken links before (#1380); nothing else
 *     validates it. A link to a redirect source (rather than the canonical
 *     target) is also flagged.
 *   - _redirects: every rule target resolves to a built page or asset, with no
 *     chain (a target that is itself a redirect source) and no dead-end. This
 *     covers the derived locale-less aliases and bare-id post redirects, which
 *     are generated at build time and never see a source-map audit.
 *
 * Unit tests cover the pure checks; the CLI runs them against dist/.
 *
 * Run: node --experimental-strip-types scripts/checks/dist-crawl.ts dist
 * Exit 0 = clean. Exit 1 = broken links, chains, or dead-ends.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import process from 'node:process'

const SITE = 'https://lavanti.fi'

/** Percent-decode a path so encoded links (e.g. %C3%A4) match the UTF-8 filesystem. */
function decode(path: string): string {
    try {
        return decodeURIComponent(path)
    } catch {
        return path
    }
}

/**
 * Normalise a URL path for comparison against the built-output set: strip any
 * fragment and query, percent-decode, ensure a leading slash, and add a
 * trailing slash to page routes (file routes with an extension are left as-is).
 */
export function normalizePath(path: string): string {
    const withoutFragment = path.split('#')[0]
    const withoutQuery = decode(withoutFragment.split('?')[0])
    if (withoutQuery === '' || withoutQuery === '/') return '/'
    const withLeading = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
    if (withLeading.endsWith('/')) return withLeading
    const lastSegment = withLeading.split('/').pop() ?? ''

    return /\.[^/]+$/.test(lastSegment) ? withLeading : `${withLeading}/`
}

/**
 * Collect the built output as two sets: `pages` (paths backed by an index.html)
 * and `servable` (every asset path plus those page paths).
 */
export function collectServable(distDir: string): { pages: Set<string>; servable: Set<string> } {
    const pages = new Set<string>()
    const servable = new Set<string>()
    const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(full)
                continue
            }
            const rel = full.slice(distDir.length).split(sep).join('/')
            servable.add(rel)
            if (entry.name === 'index.html') {
                const pagePath = rel.replace(/index\.html$/, '')
                pages.add(pagePath)
                servable.add(pagePath)
            }
        }
    }
    walk(distDir)

    return { pages, servable }
}

/** Extract internal (site-origin or root-relative) link targets from markdown. */
export function extractLlmsLinks(markdown: string): string[] {
    const links: string[] = []
    for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const url = match[1].trim()
        if (url.startsWith(`${SITE}/`)) links.push(url.slice(SITE.length))
        else if (url.startsWith('/')) links.push(url)
    }

    return links
}

/** Problem descriptions for llms.txt (empty = ok). */
export function checkLlmsTxt(markdown: string, servable: Set<string>, redirectSources: Set<string>): string[] {
    const problems: string[] = []
    for (const raw of extractLlmsLinks(markdown)) {
        const path = normalizePath(raw)
        if (servable.has(path)) continue
        if (redirectSources.has(path)) {
            problems.push(`links a redirect source "${raw}" — link the canonical target instead`)
        } else {
            problems.push(`links a missing page "${raw}"`)
        }
    }

    return problems
}

/**
 * Extract the `og:image` URL from a built HTML document as a root-relative path, or
 * null when there is none or it points off-site. Handles both attribute orders
 * (`content`/`property`), since Head.astro emits `content` first.
 */
export function extractOgImage(html: string): string | null {
    const match =
        html.match(/<meta[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']+)["']/i) ??
        html.match(/<meta[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']og:image["']/i)
    if (!match) return null
    const url = match[1]
    if (url.startsWith(`${SITE}/`)) return url.slice(SITE.length)
    if (url.startsWith('/')) return url

    return null
}

export interface RedirectRule {
    source: string
    target: string
}

/** Parse Cloudflare `_redirects` lines (`<source> <target> <code>`). */
export function parseRedirects(text: string): RedirectRule[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .map((line) => {
            const [source, target] = line.split(/\s+/)

            return { source, target }
        })
}

/** Problem descriptions for the generated `_redirects` (empty = ok). */
export function checkRedirectsOutput(rules: RedirectRule[], servable: Set<string>): string[] {
    const problems: string[] = []
    const sources = new Set(rules.map((rule) => normalizePath(rule.source)))
    for (const { source, target } of rules) {
        const normalizedTarget = normalizePath(target)
        if (sources.has(normalizedTarget)) {
            problems.push(`chain: "${source}" -> "${target}", whose target is itself a redirect source`)
        } else if (!servable.has(normalizedTarget)) {
            problems.push(`dead-end: "${source}" -> "${target}" resolves to no built page`)
        }
    }

    return problems
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(sep).join('/'))

if (isMain) {
    const distDir = process.argv[2] ?? 'dist'
    const { pages, servable } = collectServable(distDir)
    if (pages.size === 0) {
        process.stderr.write(`\x1b[31mERROR\x1b[0m [dist-crawl] no index.html files found under "${distDir}"\n`)
        process.exit(1)
    }

    let hasError = false
    const report = (file: string, problem: string): void => {
        process.stderr.write(`\x1b[31mERROR\x1b[0m [dist-crawl] ${file}: ${problem}\n`)
        hasError = true
    }

    const redirectsText = readFileSync(join(distDir, '_redirects'), 'utf8')
    const rules = parseRedirects(redirectsText)
    const redirectSources = new Set(rules.map((rule) => normalizePath(rule.source)))

    const llmsText = readFileSync(join(distDir, 'llms.txt'), 'utf8')
    for (const problem of checkLlmsTxt(llmsText, servable, redirectSources)) report('llms.txt', problem)
    for (const problem of checkRedirectsOutput(rules, servable)) report('_redirects', problem)

    /*
     * Every generated per-page OG card (og:image → /og/*.png) must have been built.
     * A page pointing at a card the endpoint never enumerated is a silent broken share
     * image; /images/* fallbacks (Cloudflare Images) live off-dist and are skipped.
     */
    let ogChecked = 0
    for (const page of pages) {
        const ogPath = extractOgImage(readFileSync(join(distDir, page, 'index.html'), 'utf8'))
        if (!ogPath?.startsWith('/og/')) continue
        ogChecked++
        /*
         * normalizePath percent-decodes so an encoded URL (e.g. %C3%A4) matches the
         * UTF-8 filename on disk, exactly as the llms.txt/_redirects checks do.
         */
        if (!servable.has(normalizePath(ogPath))) report(page, `og:image "${ogPath}" has no built PNG`)
    }

    if (!hasError) {
        console.log(
            `OK: llms.txt links, ${rules.length} redirect rules, and ${ogChecked} og:image cards resolve against ${pages.size} built pages`
        )
    }
    process.exit(hasError ? 1 : 0)
}
