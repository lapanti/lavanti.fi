import type { AstroIntegration } from 'astro'

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { helsinkiDateOf, isPublishedBy } from './publishing'

/*
 * Links to scheduled posts. A published post may link to one whose publishDate is
 * still ahead: the target is left out of the build (see loadAllPosts in posts.ts),
 * so the link would 404 until the date. Builds render such a link as its plain text
 * instead; the nightly scheduled-publish deploy rebuilds the linking post once the
 * target is live, and the link comes back without a content edit.
 *
 * The pass runs on the built HTML rather than as a rehype plugin: Astro's default
 * Sätteri Markdown processor takes no rehype plugins without adding a dependency.
 */

/* An <a> whose href is /{lang}/blog/{id}/…, site-relative or absolute on the production origin. */
const POST_ANCHOR =
    /<a\b[^>]*?\shref="(?:https:\/\/lavanti\.fi)?\/(?:fi|sv|en)\/blog\/(\d+)\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g

/* The same anchor entity-escaped, as post bodies appear inside the RSS feeds' XML. */
const ESCAPED_POST_ANCHOR =
    /&lt;a\b(?:(?!&gt;).)*?\shref=&quot;(?:https:\/\/lavanti\.fi)?\/(?:fi|sv|en)\/blog\/(\d+)\/(?:(?!&quot;).)*&quot;(?:(?!&gt;).)*&gt;([\s\S]*?)&lt;\/a&gt;/g

/** Replace every anchor to an unpublished post, raw or entity-escaped, with its inner markup. */
export function unwrapLinks(html: string, unpublished: ReadonlySet<number>): string {
    if (unpublished.size === 0) return html
    const unwrap = (anchor: string, id: string, inner: string) => (unpublished.has(Number(id)) ? inner : anchor)

    return html.replace(POST_ANCHOR, unwrap).replace(ESCAPED_POST_ANCHOR, unwrap)
}

/** Ids of the posts whose publishDate is after `today` (YYYY-MM-DD, Helsinki). */
export function unpublishedPostIds(postsDir: string, today: string): Set<number> {
    const ids = new Set<number>()
    for (const entry of readdirSync(postsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const meta = JSON.parse(readFileSync(join(postsDir, entry.name, 'meta.json'), 'utf8')) as {
            id: number
            publishDate: string
        }
        if (!isPublishedBy(meta.publishDate, today)) ids.add(meta.id)
    }

    return ids
}

/** Rewrite every built HTML page and XML feed under `dir`; returns how many changed. */
export function unwrapLinksInDir(dir: string, unpublished: ReadonlySet<number>): number {
    let changed = 0
    for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !/\.(html|xml)$/.test(entry.name)) continue
        const file = join(entry.parentPath, entry.name)
        const html = readFileSync(file, 'utf8')
        const rewritten = unwrapLinks(html, unpublished)
        if (rewritten !== html) {
            writeFileSync(file, rewritten)
            changed++
        }
    }

    return changed
}

/** Build-only (astro:build:done never runs under `astro dev`, which renders scheduled posts). */
export function unpublishedLinks(postsDir: string): AstroIntegration {
    return {
        hooks: {
            'astro:build:done': ({ dir, logger }) => {
                const unpublished = unpublishedPostIds(postsDir, helsinkiDateOf(new Date()))
                const changed = unwrapLinksInDir(fileURLToPath(dir), unpublished)
                if (changed > 0) logger.info(`unlinked scheduled posts on ${changed} page(s)`)
            },
        },
        name: 'unpublished-links',
    }
}
