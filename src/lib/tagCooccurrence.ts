/** The fields of a post the co-occurrence count reads; one entry per post id, any locale. */
export interface TaggedPost {
    id: number
    tags: string[]
}

export interface RelatedTag {
    id: string
    /** Posts carrying both tags. */
    shared: number
}

/** Siblings shown at most on a category page. */
export const RELATED_TAGS_MAX = 5

/**
 * The tags most often used together with `tagId`, by Jaccard similarity over
 * unique post ids (shared / posts carrying either tag), so a tag on half the
 * site does not top every list on raw counts alone. Ties go to the larger shared
 * count, then the id. Only ids in `known` count (tags with a category page);
 * the tag itself never does. Locale entries of the same post count once.
 */
export function relatedTags(
    posts: TaggedPost[],
    tagId: string,
    known: ReadonlySet<string>,
    max = RELATED_TAGS_MAX
): RelatedTag[] {
    const postsByTag = new Map<string, Set<number>>()
    for (const post of posts) {
        for (const tag of post.tags) {
            if (!known.has(tag)) continue
            const ids = postsByTag.get(tag) ?? new Set<number>()
            ids.add(post.id)
            postsByTag.set(tag, ids)
        }
    }
    const own = postsByTag.get(tagId)
    if (!own) return []

    return [...postsByTag.entries()]
        .filter(([id]) => id !== tagId)
        .map(([id, ids]) => {
            const shared = [...ids].filter((postId) => own.has(postId)).length

            return { id, jaccard: shared / (own.size + ids.size - shared), shared }
        })
        .filter((t) => t.shared > 0)
        .toSorted((a, b) => b.jaccard - a.jaccard || b.shared - a.shared || a.id.localeCompare(b.id))
        .slice(0, max)
        .map(({ id, shared }) => ({ id, shared }))
}
