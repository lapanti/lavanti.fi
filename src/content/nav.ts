export type Lang = 'en' | 'fi' | 'sv'

export const skipLinks: Record<Lang, { main: string; footer: string }> = {
    en: { footer: 'Skip to footer &#x27A1;', main: 'Skip to main content &#x27A1;' },
    fi: { footer: 'Siirry alatunnisteeseen &#x27A1;', main: 'Siirry pääsisältöön &#x27A1;' },
    sv: { footer: 'Hoppa till sidfoten &#x27A1;', main: 'Hoppa till huvudinnehållet &#x27A1;' },
}

/** Visible label of the mobile menu button, which is also the mobile nav's accessible name. */
export const menuLabel: Record<Lang, string> = {
    en: 'Menu',
    fi: 'Valikko',
    sv: 'Meny',
}

/** Accessible name of the desktop nav landmark, in the page's language. */
export const mainNavLabel: Record<Lang, string> = {
    en: 'Main menu',
    fi: 'Päävalikko',
    sv: 'Huvudmeny',
}

export interface NavLink {
    href: string
    label: string
    switchToLang?: Lang
    title: string
}

export const navLinks: Record<Lang, NavLink[]> = {
    en: [
        { href: '/en/elections/', label: 'Elections', title: 'Parliamentary election 2027' },
        { href: '/en/about/', label: 'About Lauri', title: 'About Lauri' },
        { href: '/en/recommendations/', label: 'Endorsements', title: 'Endorsements for Lauri' },
        { href: '/en/blog/', label: 'Writing', title: 'Writing' },
        { href: '/en/contact/', label: 'Contact', title: 'Contact info' },
        { href: '/en/newsletter/', label: 'Newsletter', title: 'Newsletter' },
        { href: '/fi/', label: 'FI', switchToLang: 'fi', title: 'Suomeksi' },
        { href: '/sv/', label: 'SV', switchToLang: 'sv', title: 'På svenska' },
        { href: '/en/', label: 'EN', switchToLang: 'en', title: 'In English' },
    ],
    fi: [
        { href: '/fi/eduskuntavaalit/', label: 'Vaalit', title: 'Eduskuntavaalit 2027' },
        { href: '/fi/laurista/', label: 'Laurista', title: 'Laurista' },
        { href: '/fi/suositukset/', label: 'Suositukset', title: 'Suosituksia Laurista' },
        { href: '/fi/blog/', label: 'Kirjoitukset', title: 'Kirjoitukset' },
        { href: '/fi/yhteystiedot/', label: 'Ota yhteyttä', title: 'Ota yhteyttä' },
        { href: '/fi/uutiskirje/', label: 'Uutiskirje', title: 'Uutiskirje' },
        { href: '/fi/', label: 'FI', switchToLang: 'fi', title: 'Suomeksi' },
        { href: '/sv/', label: 'SV', switchToLang: 'sv', title: 'På svenska' },
        { href: '/en/', label: 'EN', switchToLang: 'en', title: 'In English' },
    ],
    sv: [
        { href: '/sv/riksdagsvalet/', label: 'Valet', title: 'Riksdagsvalet 2027' },
        { href: '/sv/om-lauri/', label: 'Om Lauri', title: 'Om Lauri' },
        { href: '/sv/rekommendationer/', label: 'Rekommendationer', title: 'Rekommendationer om Lauri' },
        { href: '/sv/blog/', label: 'Inlägg', title: 'Inlägg' },
        { href: '/sv/kontakt/', label: 'Kontakt', title: 'Kontaktuppgifter' },
        { href: '/sv/nyhetsbrev/', label: 'Nyhetsbrev', title: 'Nyhetsbrev' },
        { href: '/fi/', label: 'FI', switchToLang: 'fi', title: 'Suomeksi' },
        { href: '/sv/', label: 'SV', switchToLang: 'sv', title: 'På svenska' },
        { href: '/en/', label: 'EN', switchToLang: 'en', title: 'In English' },
    ],
}
