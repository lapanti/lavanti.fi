import type { Lang } from '../content/nav'

/** Trilingual breadcrumb labels shared by PostLayout, NewsletterLayout and PageLayout. */
export const breadcrumbLabels: Record<
    'blog' | 'category' | 'home' | 'newsletter' | 'newsletterArchive',
    Record<Lang, string>
> = {
    blog: { en: 'Blog', fi: 'Blogi', sv: 'Blogg' },
    category: { en: 'Category', fi: 'Kategoria', sv: 'Kategori' },
    home: { en: 'Home', fi: 'Etusivu', sv: 'Hem' },
    newsletter: { en: 'Newsletter', fi: 'Uutiskirje', sv: 'Nyhetsbrev' },
    newsletterArchive: { en: 'Archive', fi: 'Arkisto', sv: 'Arkiv' },
}

/**
 * Which trail a CollectionPage sits on. `category` is Home → Category (the page
 * itself); `newsletterArchive` is Home → Newsletter landing → Archive (the page itself).
 */
export type BreadcrumbTrail = 'category' | 'newsletterArchive'
