import type { Lang } from './nav'

/** One cell of a PhotoStrip: a Cloudflare Images slug with localised alt, caption and srcset widths. */
export interface StripPhoto {
    /** Localised description of the scene. */
    alt: Record<Lang, string>
    /** Localised visible caption. Activity first; never anyone's party background. */
    caption: Record<Lang, string>
    /** Omit when no credit applies. */
    photographer?: string
    /** Cloudflare Images slug. The original lives in src/images/originals/{slug}.jpg (gitignored). */
    slug: string
    /** Srcset widths; none may exceed the original's pixel width. */
    widths: number[]
}
