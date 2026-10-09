/**
 * Pure helpers for `npm run recommendations` (scripts/recommendations/cli.ts): turn an approved
 * submission into a `src/content/recommendations.json` entry.
 */

export interface Submission {
    created_at: string
    id: string
    name: string
    photo_type: string
    recommendation: string
    title_en: null | string
    title_fi: string
    title_sv: null | string
}

export interface Entry {
    image: string
    locales: Record<'en' | 'fi' | 'sv', { alt: string; title: string }>
    name: string
    recommendation: string
}

/**
 * The CF Images id and originals filename: `Juho Makkonen` → `Juho-Makkonen`, `Roni Öberg` → `Roni-Oberg`.
 * Throws when nothing Latin is left (e.g. a name in Cyrillic), which would otherwise name the photo `.jpg`.
 */
export const makeSlug = (name: string): string => {
    const slug = name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    if (slug === '') throw new Error(`"${name}" has no Latin letters for a slug; add this entry by hand.`)

    return slug
}

/*
 * Alt text stays a plain template the reviewer can refine in the PR. The name is never
 * inflected (Finnish case forms can't be derived from an arbitrary name), and `Kuva: X` is
 * avoided because the site uses that form for photographer credits.
 */
export const buildEntry = (s: Submission, titles: { en: string; sv: string }): Entry => ({
    image: makeSlug(s.name),
    locales: {
        en: { alt: `Portrait of ${s.name}`, title: titles.en },
        fi: { alt: `${s.name}, muotokuva`, title: s.title_fi },
        sv: { alt: `${s.name}, porträtt`, title: titles.sv },
    },
    name: s.name,
    recommendation: s.recommendation,
})

/** Sets the frontmatter `updatedDate` of an MDX page; throws when the page has none. */
export const bumpUpdatedDate = (mdx: string, date: string): string => {
    const re = /^updatedDate: '\d{4}-\d{2}-\d{2}'$/m
    if (!re.test(mdx)) throw new Error('no updatedDate in frontmatter')

    return mdx.replace(re, `updatedDate: '${date}'`)
}
