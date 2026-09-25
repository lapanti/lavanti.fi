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
    fi: 'Tilaa Lauri Lavantin RSS-syöte (linkki aukeaa uudessa välilehdessä)',
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
