import type { FaqItem } from '../../lib/jsonld'

export interface LocalTag {
    descriptions: { en: string[]; fi: string[]; sv: string[] }
    /**
     * Per-locale category FAQ. A locale renders the plate and FAQPage JSON-LD
     * only with 2+ entries (hasFaqSection); an absent locale renders neither.
     */
    faq?: { en?: FaqItem[]; fi?: FaqItem[]; sv?: FaqItem[] }
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
