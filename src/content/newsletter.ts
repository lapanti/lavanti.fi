import type { Lang } from './nav'

/** Strings for the public archive: issue pages and the "other issues" plate. */
export interface NewsletterArchiveLocale {
    /** Button/link label leading to the archive list page. */
    allIssuesLabel: string
    /** Tracked-uppercase label above the "other issues" plate heading. */
    eyebrow: string
    /** Heading of the "other issues" plate on an issue page. */
    otherIssuesHeading: string
    /** Provenance line; `date` is already formatted for the locale (d.m.yyyy). */
    provenance: (date: string) => string
    shareAriaLabel: (title: string) => string
}

export const newsletterArchiveContent: Record<Lang, NewsletterArchiveLocale> = {
    en: {
        allIssuesLabel: 'All issues',
        eyebrow: 'Newsletter',
        otherIssuesHeading: 'Other issues',
        provenance: (date) => `Sent to subscribers on ${date}.`,
        shareAriaLabel: (title) => `Share links for newsletter issue ${title}`,
    },
    fi: {
        allIssuesLabel: 'Kaikki uutiskirjeet',
        eyebrow: 'Uutiskirje',
        otherIssuesHeading: 'Muita uutiskirjeitä',
        provenance: (date) => `Lähetetty tilaajille ${date}.`,
        shareAriaLabel: (title) => `Uutiskirjeen ${title} sosiaalisen median jakolinkit`,
    },
    sv: {
        allIssuesLabel: 'Alla nyhetsbrev',
        eyebrow: 'Nyhetsbrev',
        otherIssuesHeading: 'Andra nyhetsbrev',
        provenance: (date) => `Skickat till prenumeranterna ${date}.`,
        shareAriaLabel: (title) => `Delningslänkar för nyhetsbrevet ${title}`,
    },
}

interface NewsletterLocale {
    description: string
    /** The tracked-uppercase label above the heading, shown in the split plate layout. */
    eyebrow: string
    emailPlaceholder: string
    heading: string
    loadingLabel: string
    privacyLinkText: string
    privacyText: string
    privacyTextAfter?: string
    submitButton: string
    successHeading: string
    successMessage: string
}

export const newsletterContent: Record<Lang, NewsletterLocale> = {
    en: {
        description:
            'Subscribe to my newsletter and get analysis on the latest developments in AI and technology, and their impact on society, straight to your inbox.',
        emailPlaceholder: 'Email',
        eyebrow: 'Newsletter',
        heading: 'Subscribe to the newsletter',
        loadingLabel: 'Loading...',
        privacyLinkText: 'privacy policy',
        privacyText: 'You can unsubscribe at any time. For more information, read our ',
        submitButton: 'Subscribe',
        successHeading: 'Thank you!',
        successMessage: 'You have successfully subscribed',
    },
    fi: {
        description:
            'Tilaamalla uutiskirjeeni saat sähköpostiisi analyysejä tuoreimmista kehityskuluista tekoälyn ja teknologian saralla sekä arvioita niiden vaikutuksista yhteiskuntaan.',
        emailPlaceholder: 'Sähköposti',
        eyebrow: 'Uutiskirje',
        heading: 'Tilaa uutiskirje',
        loadingLabel: 'Lataa...',
        privacyLinkText: 'tietosuojaseloste',
        privacyText: 'Voit perua uutiskirjeen koska tahansa. Lisätietoja varten lue ',
        privacyTextAfter: '.',
        submitButton: 'Tilaa',
        successHeading: 'Kiitos!',
        successMessage: 'Uutiskirje tilattu onnistuneesti',
    },
    sv: {
        description:
            'Prenumerera på mitt nyhetsbrev och få analyser av den senaste utvecklingen inom AI och teknik, samt dess påverkan på samhället, direkt till din inkorg.',
        emailPlaceholder: 'E-post',
        eyebrow: 'Nyhetsbrev',
        heading: 'Prenumerera på nyhetsbrevet',
        loadingLabel: 'Laddar...',
        privacyLinkText: 'integritetspolicy',
        privacyText: 'Du kan avsluta prenumerationen när som helst. För mer information, läs vår ',
        privacyTextAfter: '.',
        submitButton: 'Prenumerera',
        successHeading: 'Tack så mycket!',
        successMessage: 'Du har prenumererat framgångsrikt',
    },
}
