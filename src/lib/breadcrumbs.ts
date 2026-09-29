import type { Lang } from '../content/nav'
import type { BreadcrumbItem } from './jsonld'

import { landingPath } from './newsletterRoutes'

const SITE = 'https://lavanti.fi'

/** Trilingual breadcrumb labels shared by PostLayout, NewsletterLayout and PageLayout. */
export const breadcrumbLabels: Record<
    'blog' | 'elections' | 'home' | 'newsletter' | 'newsletterArchive',
    Record<Lang, string>
> = {
    blog: { en: 'Blog', fi: 'Blogi', sv: 'Blogg' },
    elections: { en: 'Elections', fi: 'Eduskuntavaalit', sv: 'Riksdagsvalet' },
    home: { en: 'Home', fi: 'Etusivu', sv: 'Hem' },
    newsletter: { en: 'Newsletter', fi: 'Uutiskirje', sv: 'Nyhetsbrev' },
    newsletterArchive: { en: 'Archive', fi: 'Arkisto', sv: 'Arkiv' },
}

/**
 * The section a PageLayout page sits under. The trail is Home → parent → the page;
 * `home` leaves out the middle step for a page that sits directly under the front page.
 */
export type BreadcrumbParent = 'blog' | 'elections' | 'home' | 'newsletter'

const ELECTIONS_PATHS: Record<Lang, string> = {
    en: '/en/elections/',
    fi: '/fi/eduskuntavaalit/',
    sv: '/sv/riksdagsvalet/',
}

const parentPaths: Record<Exclude<BreadcrumbParent, 'home'>, (lang: Lang) => string> = {
    blog: (lang) => `/${lang}/blog/`,
    elections: (lang) => ELECTIONS_PATHS[lang],
    newsletter: landingPath,
}

/**
 * The BreadcrumbList trail for a page with a canonical `slug` (no leading or trailing
 * slash). `name` is the page's own crumb; soft hyphens from a hero title are dropped,
 * since they would otherwise reach the structured data verbatim.
 */
export function pageBreadcrumbs(lang: Lang, slug: string, name: string, parent: BreadcrumbParent): BreadcrumbItem[] {
    const home = { name: breadcrumbLabels.home[lang], url: `${SITE}/${lang}/` }
    const self = { name: name.replaceAll('­', ''), url: `${SITE}/${slug}/` }
    if (parent === 'home') return [home, self]

    return [home, { name: breadcrumbLabels[parent][lang], url: `${SITE}${parentPaths[parent](lang)}` }, self]
}
