import { type CollectionEntry, getCollection } from 'astro:content'

import { newsletterPath } from './newsletterRoutes'
import { bodyStats, buildAlternatesMap, byPublishDateThenId, byRankedIds } from './posts'
import { helsinkiDateOf, isPublishedBy } from './publishing'

/**
 * One newsletter issue in one language, decorated the same way a Post is:
 * frontmatter + meta.json fields flattened, plus the canonical URL and body stats.
 */
export type Newsletter = CollectionEntry<'newsletters'>['data'] & {
    entry: CollectionEntry<'newsletters'>
    readingTime: number
    url: string
    wordCount: number
}

/** Pure decoration step, split out so it can be fixture-tested without the content store. */
export const decorateNewsletter = (entry: CollectionEntry<'newsletters'>): Newsletter => ({
    ...entry.data,
    ...bodyStats(entry.body),
    entry,
    url: newsletterPath(entry.data.lang, entry.data.id, entry.data.slug),
})

let cache: Promise<Newsletter[]> | undefined

/*
 * v8 ignore start -- requires getCollection(), which needs Astro's content-layer
 * data store populated by a prior astro build/dev/sync in-process; a plain vitest
 * run doesn't trigger that (see the same note in src/lib/posts.ts), so this is
 * exercised by `npm run build` and the e2e suite instead.
 */
async function loadAllNewsletters(): Promise<Newsletter[]> {
    const entries = await getCollection('newsletters')
    const today = helsinkiDateOf(new Date())

    return (
        entries
            /*
             * The 42-day embargo: publishDate is sent + 42 (schema-enforced), and the
             * same build filter as posts keeps an embargoed issue out of every
             * non-dev build until the nightly scheduled-publish workflow deploys it.
             */
            .filter((entry) => import.meta.env.DEV || isPublishedBy(entry.data.publishDate, today))
            .map(decorateNewsletter)
            .toSorted(byPublishDateThenId)
    )
}

export const getAllNewsletters = (): Promise<Newsletter[]> => (cache ??= loadAllNewsletters())

export const getNewsletterAlternates = async (id: number): Promise<Record<Newsletter['lang'], string>> =>
    buildAlternatesMap(await getAllNewsletters(), id)
/* v8 ignore stop */

export interface NewsletterQuery {
    excludeId?: number
    lang: Newsletter['lang']
    limit?: number
    /** Ids to show first, in this order (from src/lib/related.ts); the rest stay newest-first. */
    rankedIds?: number[]
}

/** Issues in one language, ranked ids first then newest-first, optionally without the current one and capped. */
export const filterNewsletters = (newsletters: Newsletter[], q: NewsletterQuery): Newsletter[] => {
    const filtered = newsletters.filter((n) => n.lang === q.lang).filter((n) => n.id !== q.excludeId)
    const ordered = q.rankedIds ? byRankedIds(filtered, q.rankedIds) : filtered

    return q.limit === undefined ? ordered : ordered.slice(0, q.limit)
}

/* v8 ignore next 2 -- thin getAllNewsletters() wrapper, see the ignore note above */
export const getNewsletters = async (q: NewsletterQuery): Promise<Newsletter[]> =>
    filterNewsletters(await getAllNewsletters(), q)
