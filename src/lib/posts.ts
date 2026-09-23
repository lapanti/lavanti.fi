import { type CollectionEntry, getCollection } from 'astro:content'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { helsinkiDateOf, isPublishedBy } from './publishing'

export const stripImportsExports = (raw: string): string =>
    raw.replace(/^(import\s+.+|export\s+const\s+components\s*=.+)$/gm, '')

/** Word count and reading time (200 wpm) of an MDX body, shared by every collection. */
export const bodyStats = (rawBody: string | undefined): { readingTime: number; wordCount: number } => {
    const wordCount = stripImportsExports(rawBody ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length

    return { readingTime: Math.ceil(wordCount / 200), wordCount }
}

export type Post = CollectionEntry<'posts'>['data'] & {
    entry: CollectionEntry<'posts'>
    readingTime: number
    url: string
    wordCount: number
}

/** Shape shared by every localized collection entry that has per-locale alternates. */
export interface LocalizedEntry {
    id: number
    lang: Post['lang']
    publishDate: string
    url: string
}

/**
 * Display order is newest-first by publishDate, with id as a stable tiebreaker.
 * Keying on the date (not id) keeps ordering correct for far-future scheduled
 * entries, whose id — assigned at authoring time — can be lower than entries that
 * publish earlier but are authored later. Shared with the newsletters collection.
 */
export const byPublishDateThenId = <T extends Pick<LocalizedEntry, 'id' | 'publishDate'>>(a: T, b: T): number =>
    b.publishDate.localeCompare(a.publishDate) || b.id - a.id

let cache: Promise<Post[]> | undefined

/*
 * v8 ignore start -- requires getCollection(), which needs Astro's content-layer
 * data store populated by a prior astro build/dev/sync in-process; a plain vitest
 * run doesn't trigger that (known upstream limitation, withastro/astro#7051,
 * #12836), so this is exercised by `npm run build` and the e2e suite instead.
 */
async function loadAllPosts(): Promise<Post[]> {
    const entries = await getCollection('posts')
    const today = helsinkiDateOf(new Date())

    return (
        entries
            /*
             * Scheduled publishing: future-dated posts are built only in dev; the
             * nightly scheduled-publish workflow deploys them once the date arrives.
             */
            .filter((entry) => import.meta.env.DEV || isPublishedBy(entry.data.publishDate, today))
            .map((entry) => ({
                ...entry.data,
                ...bodyStats(entry.body),
                entry,
                url: `/${entry.data.lang}/blog/${entry.data.id}/${entry.data.slug}/`,
            }))
            .toSorted(byPublishDateThenId)
    )
}

export const getAllPosts = (): Promise<Post[]> => (cache ??= loadAllPosts())
/* v8 ignore stop */

export const buildAlternatesMap = <T extends Pick<LocalizedEntry, 'id' | 'lang' | 'url'>>(
    entries: T[],
    id: number
): Record<Post['lang'], string> => {
    const result = {} as Record<Post['lang'], string>
    for (const p of entries.filter((p) => p.id === id)) {
        result[p.lang] = p.url
    }
    return result
}

/* v8 ignore next 2 -- thin getAllPosts() wrapper, see the ignore note above */
export const getPostAlternates = async (id: number): Promise<Record<Post['lang'], string>> =>
    buildAlternatesMap(await getAllPosts(), id)

export interface ExcerptQuery {
    currentSlug?: string
    excludeIds?: number[]
    lang: Post['lang']
    limit?: number
    onlyIds?: number[]
    /** Ids to show first, in this order (from src/lib/related.ts); the rest keep their existing order. */
    rankedIds?: number[]
    relatedTags?: string[]
    tag?: string
}

/** Items whose id is in rankedIds come first in that order; the others follow in their existing order. */
export const byRankedIds = <T extends Pick<LocalizedEntry, 'id'>>(items: T[], rankedIds: number[]): T[] => {
    const rank = new Map(rankedIds.map((id, index) => [id, index]))
    const ranked = items.filter((item) => rank.has(item.id)).toSorted((a, b) => rank.get(a.id)! - rank.get(b.id)!)

    return [...ranked, ...items.filter((item) => !rank.has(item.id))]
}

export const sortByRelatedTags = (posts: Post[], relatedTags: string[]): Post[] =>
    posts
        .map<[Post, number]>((p) => [p, relatedTags.reduce((sum, t) => sum + (p.tags.includes(t) ? 1 : 0), 0)])
        .toSorted(([a, aPoints], [b, bPoints]) => (aPoints === bPoints ? byPublishDateThenId(a, b) : bPoints - aPoints))
        .map(([p]) => p)

export const filterExcerptPosts = (posts: Post[], q: ExcerptQuery): Post[] => {
    const filtered = posts
        .filter((p) => p.lang === q.lang)
        .filter((p) => !q.currentSlug || p.slug !== q.currentSlug)
        .filter((p) => !q.tag || p.tags.includes(q.tag))
        .filter((p) => !q.onlyIds || q.onlyIds.includes(p.id))
        .filter((p) => !q.excludeIds || !q.excludeIds.includes(p.id))

    const sorted = q.relatedTags ? sortByRelatedTags(filtered, q.relatedTags) : filtered
    const ordered = q.rankedIds ? byRankedIds(sorted, q.rankedIds) : sorted

    return q.limit ? ordered.slice(0, q.limit) : ordered
}

export const getExcerptPosts = async (q: ExcerptQuery): Promise<Post[]> => filterExcerptPosts(await getAllPosts(), q)

const processor = unified().use(remarkParse).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeStringify)

/**
 * Plain markdown-to-HTML render for RSS — deliberately not the real Astro/MDX render
 *  path (astro:content's render()), since RSS never rendered actual Astro components
 *  even under the old page-routed setup; this preserves that same behavior.
 */
/*
 * v8 ignore start -- post.entry.body requires a real CollectionEntry from
 * getCollection(), see the ignore note on loadAllPosts above
 */
export const getPostHtml = async (post: Post): Promise<string> => {
    const body = stripImportsExports(post.entry.body ?? '')

    return String(await processor.process(body))
}
/* v8 ignore stop */
