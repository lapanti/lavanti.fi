import type { AstroIntegration } from 'astro'

import { readFile } from 'node:fs/promises'

/** One `<xhtml:link rel="alternate">` entry, the shape `@astrojs/sitemap` takes in `links`. */
export interface AlternateLink {
    lang: string
    url: string
}

const LINK_TAG = /<link\b[^>]*>/gi

const attribute = (tag: string, name: string): string | undefined => {
    const match = new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag)

    return match ? (match[1] ?? match[2] ?? match[3]) : undefined
}

/** The `<link rel="alternate" hreflang>` set of a built page, in document order. */
export const extractHreflangLinks = (html: string): AlternateLink[] =>
    (html.match(LINK_TAG) ?? []).flatMap((tag) => {
        const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/)
        const lang = attribute(tag, 'hreflang')
        const url = attribute(tag, 'href')

        return rel?.includes('alternate') && lang && url ? [{ lang, url }] : []
    })

/** Decoded pathname, the key both the built-page map and the sitemap lookup use (non-ASCII slugs). */
const pathKey = (url: string): string => decodeURIComponent(new URL(url, 'https://x.invalid').pathname)

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT'

/**
 * Sitemap hreflang alternates, read from the built HTML so they are exactly the set
 * `Head.astro` emits. The alternates come from `langAlternates` (posts, newsletters,
 * categories, pages with per-locale slugs) or the locale-prefix swap, resolved at
 * render time from content collections, so they cannot be rebuilt at config load.
 *
 * The integration must run before `sitemap()` in the integrations array: Astro awaits
 * each integration's `astro:build:done` in order, and the sitemap's `serialize` calls
 * `linksFor` from inside its own `astro:build:done`.
 */
export const createSitemapAlternates = (): {
    integration: AstroIntegration
    linksFor: (url: string, inSitemap: (url: string) => boolean) => AlternateLink[] | undefined
} => {
    const byPath = new Map<string, AlternateLink[]>()

    const integration: AstroIntegration = {
        hooks: {
            'astro:build:done': async ({ dir, pages }) => {
                for (const { pathname } of pages) {
                    const html = await readFile(new URL(`${pathname}index.html`, dir), 'utf-8').catch(
                        (error: unknown) => {
                            // File-named pages (404.html) have no hreflang and are never in the sitemap.
                            if (isMissing(error)) return undefined
                            throw error
                        }
                    )
                    if (html !== undefined) byPath.set(pathKey(`/${pathname}`), extractHreflangLinks(html))
                }
            },
        },
        name: 'sitemap-alternates',
    }

    /**
     * Alternates for a sitemap URL, keeping only targets that are built pages and pass
     * the sitemap filter, so no alternate points outside the sitemap. Returns undefined
     * when fewer than two locales remain: a page alone is not an alternate set.
     */
    const linksFor = (url: string, inSitemap: (url: string) => boolean): AlternateLink[] | undefined => {
        const links = (byPath.get(pathKey(url)) ?? []).filter(
            (link) => byPath.has(pathKey(link.url)) && inSitemap(link.url)
        )
        const locales = new Set(links.filter((link) => link.lang !== 'x-default').map((link) => link.lang))

        return locales.size >= 2 ? links : undefined
    }

    return { integration, linksFor }
}
