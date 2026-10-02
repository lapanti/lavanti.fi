import type { FaqItem } from '../../lib/jsonld'

export interface LocalTag {
    descriptions: { en: string[]; fi: string[]; sv: string[] }
    /**
     * Per-locale category FAQ. A locale renders the plate and FAQPage JSON-LD
     * only with 2+ entries (hasFaqSection); an absent locale renders neither.
     */
    faq?: { en?: FaqItem[]; fi?: FaqItem[]; sv?: FaqItem[] }
    /**
     * Up to three post ids shown first, in this order, as the category's "start
     * here" reads. Each must carry the tag. Picked by hand, with
     * `npm run suggest:tags -- --intro <id>` as the advisory ranking.
     */
    featured?: number[]
    heroImage?: string
    heroImageAlt?: { en: string; fi: string; sv: string }
    id: string
    metaDescription: { en: string; fi: string; sv: string }
    names: { en: string; fi: string; sv: string }
    pageTitle: { en: string; fi: string; sv: string }
    /** Per-locale URL slug for the category page — ids stay English, slugs localise. */
    slugs: { en: string; fi: string; sv: string }
    updatedDate: string
}
