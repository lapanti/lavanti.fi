import type { Lang } from '../content/nav'

/**
 * URL segments of the public newsletter archive. The landing page (subscribe form)
 * already lives at /{lang}/{segment}/; issues and the archive list nest under it.
 *
 * Kept free of astro:content so plain-Node check scripts (publish-due.ts) and
 * astro.config.mjs can import it, the same way src/lib/publishing.ts is.
 */
export const NEWSLETTER_SEGMENTS: Record<Lang, string> = { en: 'newsletter', fi: 'uutiskirje', sv: 'nyhetsbrev' }

const ARCHIVE_SEGMENTS: Record<Lang, string> = { en: 'archive', fi: 'arkisto', sv: 'arkiv' }

/** Slash-less canonical slug, e.g. `fi/uutiskirje/1/tekoaly-muuttaa-tyon` — the ogId input and the JSON-LD slug. */
export const newsletterSlug = (lang: Lang, id: number | string, slug: string): string =>
    `${lang}/${NEWSLETTER_SEGMENTS[lang]}/${id}/${slug}`

/** Canonical issue path with the site's trailing slash, e.g. `/fi/uutiskirje/1/tekoaly-muuttaa-tyon/`. */
export const newsletterPath = (lang: Lang, id: number | string, slug: string): string =>
    `/${newsletterSlug(lang, id, slug)}/`

/** Subscribe landing page, e.g. `/fi/uutiskirje/`. */
export const landingPath = (lang: Lang): string => `/${lang}/${NEWSLETTER_SEGMENTS[lang]}/`

/** Archive list page, e.g. `/fi/uutiskirje/arkisto/`. */
export const archivePath = (lang: Lang): string => `${landingPath(lang)}${ARCHIVE_SEGMENTS[lang]}/`
