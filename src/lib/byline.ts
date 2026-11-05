import type { Lang } from '../content/nav'
import type { AuthorEntry } from '../content/person'

import { intlLocale } from '../content/nav'

export type { Lang }

export interface ExternalPublication {
    name: string
    date: string // YYYY-MM-DD
    url?: string
    lang?: Lang
}

export type CoAuthorEntry = Exclude<AuthorEntry, 'lauri'>

/** Heading over the co-author list: singular for one, plural for more. */
const coAuthorsHeadings: Record<Lang, { one: string; other: string }> = {
    en: { one: 'Co-author', other: 'Co-authors' },
    fi: { one: 'Kanssakirjoittaja', other: 'Kanssakirjoittajat' },
    sv: { one: 'Medförfattare', other: 'Medförfattare' },
}

export const coAuthorsHeading = (count: number, lang: Lang): string =>
    count === 1 ? coAuthorsHeadings[lang].one : coAuthorsHeadings[lang].other

/** Everyone but Lauri, in meta.json order; the AuthorCard above the byline already shows him. */
export const coAuthorsOf = (authors: AuthorEntry[]): CoAuthorEntry[] =>
    authors.filter((entry): entry is CoAuthorEntry => entry !== 'lauri')

export const publicationPrefix: Record<Lang, string> = {
    en: 'Also published in',
    fi: 'Julkaistu myös',
    sv: 'Publicerat även i',
}

/**
 * How a linked article's language is named, in the language of the page doing the
 * linking: `languageNameIn[pageLang][publicationLang]`. Naming it in its own language
 * ("(suomeksi)" on an English page) would drop a foreign word into an otherwise
 * English sentence, and a screen reader on a `lang="en"` page would pronounce it with
 * English phonetics. Same-language pairs are never rendered — the suffix is omitted
 * when the two match — but they are filled in so the map is total.
 */
const languageNameIn: Record<Lang, Record<Lang, string>> = {
    en: { en: 'in English', fi: 'in Finnish', sv: 'in Swedish' },
    fi: { en: 'englanniksi', fi: 'suomeksi', sv: 'ruotsiksi' },
    sv: { en: 'på engelska', fi: 'på finska', sv: 'på svenska' },
}

/**
 * A publication date is a calendar date, not an instant: `new Date('2026-06-17')` is UTC
 * midnight, so it is formatted in UTC (as `formatEventDate` does) or a build run west of
 * Greenwich would print the day before.
 */
export const formatPublicationDate = (date: string, lang: Lang): string =>
    new Intl.DateTimeFormat(intlLocale[lang], {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
        year: 'numeric',
    }).format(new Date(date))

/** " (in Finnish)" when the publication's language differs from the page's, else "". */
export const publicationLanguageSuffix = (pub: ExternalPublication, lang: Lang): string => {
    const pubLang = pub.lang ?? 'fi'

    return pubLang !== lang ? ` (${languageNameIn[lang][pubLang]})` : ''
}

/** The byline line as plain text; Byline.astro renders the same parts with a link on the name. */
export const buildPublicationBylineText = (pub: ExternalPublication, lang: Lang): string =>
    `${publicationPrefix[lang]}: ${pub.name}, ${formatPublicationDate(pub.date, lang)}${publicationLanguageSuffix(pub, lang)}.`
