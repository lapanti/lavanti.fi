/**
 * Era-appropriate author portraits for the post author card.
 *
 * A post shows the portrait whose era covers its publishDate, so a 2021 post keeps a
 * 2021 photo after the site's current portrait changes. The table is append-only:
 * a new era is a new entry at the end, dated from today onwards. Editing or inserting
 * an earlier entry would re-photo old posts, and authorPhotos.spec.ts fails on it.
 *
 * Posts dated before the first entry get the first entry. A single post can pin its
 * own photo with `authorImage` in meta.json.
 */
export interface AuthorPhotoEra {
    /** First publishDate (YYYY-MM-DD) this portrait applies to. */
    from: string
    /** Cloudflare Images name; the original lives in src/images/originals/. */
    image: string
}

export const authorPhotos: readonly AuthorPhotoEra[] = [
    { from: '2021-01-01', image: 'Lauri-Lavanti-kadet-puuskassa-ulkona' },
    { from: '2024-09-25', image: 'Lauri-Lavanti-nojaamassa-kasiin' },
    { from: '2026-01-01', image: 'Lauri-Lavanti-seisoo-suorassa-sinisella-taustalla' },
    /** The parliamentary candidacy announcement. */
    { from: '2026-08-26', image: 'Lauri-Lavanti-virallinen-puoluekuva' },
]

/** The author portrait for a post: its own `authorImage`, else the era covering publishDate. */
export function resolveAuthorImage(publishDate: string, authorImage?: string): string {
    if (authorImage) return authorImage

    const era = authorPhotos.findLast(({ from }) => from <= publishDate) ?? authorPhotos[0]

    return era.image
}
