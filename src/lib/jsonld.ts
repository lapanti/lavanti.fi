export const BLOGPOSTING = 'BlogPosting' as const
export const COLLECTIONPAGE = 'CollectionPage' as const
/*
 * EVENT and FAQPAGE are sibling-script types: emitted alongside the page's primary
 * JSON-LD, never as its @type. They are deliberately absent from JSON_LD_TYPES so no
 * page frontmatter can select them.
 */
export const EVENT = 'Event' as const
export const FAQPAGE = 'FAQPage' as const
export const PERSON = 'Person' as const
export const PROFILEPAGE = 'ProfilePage' as const
export const WEBPAGE = 'WebPage' as const
export const WEBSITE = 'WebSite' as const

export const JSON_LD_TYPES = [BLOGPOSTING, COLLECTIONPAGE, PERSON, PROFILEPAGE, WEBPAGE, WEBSITE] as const

export type JsonLdType = (typeof JSON_LD_TYPES)[number]

export type BreadcrumbItem = { name: string; url: string }

export type FaqItem = { a: string; q: string }

/**
 * What a CollectionPage collects: the topic it is about (a DefinedTerm in the
 * site's category set) and its items in display order, as an ItemList.
 */
export type CollectionInfo = {
    about: { name: string; termSet: string }
    items: Array<{ name: string; url: string }>
}
