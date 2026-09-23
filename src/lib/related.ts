import related from '../content/related.json'

/**
 * Build-side reader of src/content/related.json, the Jev-ranked "best next read"
 * per post and newsletter that scripts/generate-related.ts writes and
 * scripts/checks/related-stale.ts keeps in sync with the content. Kept astro-free
 * and date-free on purpose: getAllPosts()/getAllNewsletters() already drop
 * unpublished documents, so ids that are not published simply never match.
 *
 * Spec: .agents/specs/jev/related.md
 */
export interface RelatedFile {
    entries: Record<string, { ranked: Array<{ key: string; p: number }>; sourceHash: string }>
}

type Kind = 'newsletter' | 'post'

/** Ranked keys for one document, best first; empty when the file has no entry. */
export const rankedKeys = (key: string, file: RelatedFile = related): string[] =>
    file.entries[key]?.ranked.map((item) => item.key) ?? []

const idsOfKind = (kind: Kind, keys: string[]): number[] =>
    keys.filter((k) => k.startsWith(`${kind}:`)).map((k) => Number(k.slice(kind.length + 1)))

/** Post ids ranked as the best next reads after post `id`; same in every locale. */
export const relatedPostIds = (id: number, file?: RelatedFile): number[] =>
    idsOfKind('post', rankedKeys(`post:${id}`, file))

/** Newsletter ids ranked as the best next reads after issue `id`. */
export const relatedNewsletterIds = (id: number, file?: RelatedFile): number[] =>
    idsOfKind('newsletter', rankedKeys(`newsletter:${id}`, file))
