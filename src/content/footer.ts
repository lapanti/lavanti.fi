import type { Lang } from './nav'

import { socialProfiles } from './social'

interface FooterLink {
    icon: string
    title: string
    url: string
}

// Derived so the footer row cannot drift from sameAs or the page chips again.
export const footerLinks: FooterLink[] = socialProfiles
    .filter(({ footer }) => footer)
    .map(({ icon, title, url }) => ({ icon: icon ?? '', title, url }))

export const footerRssAriaLabel: Record<Lang, string> = {
    en: "Subscribe to Lauri Lavanti's RSS feed (opens in new tab)",
    fi: 'Tilaa Lauri Lavannin RSS-syöte (linkki aukeaa uudessa välilehdessä)',
    sv: 'Prenumerera på Lauri Lavantis RSS-flöde (öppnas i ny flik)',
}

export const footerAriaLabel: Record<Lang, (title: string) => string> = {
    en: (title) => `Lauri Lavanti on ${title} (opens in new tab)`,
    fi: (title) => `Lauri Lavanti palvelussa ${title} (linkki aukeaa uudessa välilehdessä)`,
    sv: (title) => `Lauri Lavanti på ${title} (öppnas i ny flik)`,
}

export const footerLogoAlt: Record<Lang, string> = {
    en: 'The Greens logo and text',
    fi: 'Vihreiden logo ja teksti',
    sv: 'De Gröna logotyp och text',
}

/**
 * Footer-only, like the newsletter archive: the campaign finance page is for readers
 * who want to check the money, while the header nav stays at the six main sections.
 */
export const footerCampaignFinanceLabel: Record<Lang, string> = {
    en: 'Campaign finance',
    fi: 'Vaalirahoitus',
    sv: 'Valfinansiering',
}

export const footerCampaignFinanceHref: Record<Lang, string> = {
    en: '/en/elections/campaign-finance/',
    fi: '/fi/eduskuntavaalit/vaalirahoitus/',
    sv: '/sv/riksdagsvalet/valfinansiering/',
}

/**
 * The site's source is public as part of the campaign's openness; it sits next to the
 * finance link for the same reader who wants to check how things are done.
 */
export const footerSourceCodeLabel: Record<Lang, string> = {
    en: 'Site source code',
    fi: 'Sivuston lähdekoodi',
    sv: 'Webbplatsens källkod',
}

export const footerSourceCodeUrl = 'https://github.com/lapanti/lavanti.fi'

/**
 * Simple Analytics' free plan requires its badge from 2026-11-01. URLs are verbatim from their
 * badge builder (their detector looks for them); colours are the footer's deepForest, footerMuted
 * and oat. Both modes share one palette because the footer is dark in either scheme.
 */
const analyticsBadgeQuery = 'counter=false&radius=0&background=163E35&text=A9CFCB&logo=E4D77E'

export const footerAnalyticsBadge = {
    darkSrc: `https://simpleanalyticsbadges.com/lavanti.fi?mode=dark&${analyticsBadgeQuery}`,
    height: 50,
    href: 'https://www.simpleanalytics.com/lavanti.fi?utm_source=lavanti.fi&utm_content=badge',
    lightSrc: `https://simpleanalyticsbadges.com/lavanti.fi?mode=light&${analyticsBadgeQuery}`,
    width: 210,
} as const

export const footerColumnLabels: Record<Lang, { contact: string; languages: string; site: string }> = {
    en: { contact: 'Contact', languages: 'Languages', site: 'Lauri Lavanti' },
    fi: { contact: 'Yhteys', languages: 'Kielet', site: 'Lauri Lavanti' },
    sv: { contact: 'Kontakt', languages: 'Språk', site: 'Lauri Lavanti' },
}

export const footerLanguageLinks: Array<{ href: string; label: string }> = [
    { href: '/fi/', label: 'Suomeksi' },
    { href: '/sv/', label: 'På svenska' },
    { href: '/en/', label: 'In English' },
]

export const footerMediaLabel: Record<Lang, string> = {
    en: 'For media',
    fi: 'Medialle',
    sv: 'För media',
}

export const footerNewsletterArchiveLabel: Record<Lang, string> = {
    en: 'Newsletter archive',
    fi: 'Uutiskirjeen arkisto',
    sv: 'Nyhetsbrevsarkiv',
}

export const footerPrivacyPolicyLabel: Record<Lang, string> = {
    en: 'Privacy policy',
    fi: 'Tietosuojaseloste',
    sv: 'Integritetspolicy',
}

export const footerPrivacyPolicyHref: Record<Lang, string> = {
    en: '/en/privacy-policy/',
    fi: '/fi/tietosuoja/',
    sv: '/sv/dataskydd/',
}
