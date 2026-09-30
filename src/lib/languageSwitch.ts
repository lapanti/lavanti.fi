import type { Lang } from '../content/nav'

const LANGS: readonly Lang[] = ['en', 'fi', 'sv']
const LOCALE_PREFIX = /^\/(fi|sv|en)\//

/**
 * Where each language link in the header points on a given page, decided at build
 * time so crawlers and visitors without JavaScript get the translated page rather
 * than the language's front page.
 *
 * - `langAlternates` wins: posts and pages whose slugs differ per locale declare them.
 * - Otherwise the locale prefix is swapped, the same fallback Head uses for hreflang
 *   (and which the dist checks verify resolves for every indexable page).
 * - Noindex pages (the root dispatcher, the 404s) and paths without a locale prefix
 *   have no counterpart, so the links keep their front-page hrefs.
 */
export const languageSwitchHrefs = (
    pathname: string,
    langAlternates: Record<Lang, string> | undefined,
    noindex: boolean | undefined
): Record<Lang, string> | undefined => {
    if (langAlternates) return langAlternates
    if (noindex || !LOCALE_PREFIX.test(pathname)) return undefined

    return Object.fromEntries(LANGS.map((lang) => [lang, pathname.replace(LOCALE_PREFIX, `/${lang}/`)])) as Record<
        Lang,
        string
    >
}
