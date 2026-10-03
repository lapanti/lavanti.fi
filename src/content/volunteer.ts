import type { HELP_OPTIONS, MUNICIPALITIES } from '../lib/volunteers'
import type { Lang } from './nav'

/**
 * Strings for the volunteer sign-up form (`src/components/VolunteerForm.astro`).
 * Finnish is the approved source (#1543); SV and EN are translations of it.
 */
interface VolunteerLocale {
    consent: { after: string; before: string; linkText: string }
    email: string
    /** Shown above the form when the function sends the visitor back with ?virhe=<code>. */
    errors: Record<string, string>
    help: Record<(typeof HELP_OPTIONS)[number], string>
    helpLegend: string
    municipality: string
    municipalityOptions: Record<(typeof MUNICIPALITIES)[number], string>
    name: string
    phone: string
    privacyHref: string
    /** Explains the asterisk on name, email and consent; shown above the first field. */
    requiredNote: string
    submit: string
    /** Under the submit button while name, email or consent is still missing. */
    submitHint: string
}

/**
 * Turnstile site key (public) of the `lavanti.fi` widget (hostnames lavanti.fi, www.lavanti.fi).
 * Its secret is the Pages secret `TURNSTILE_SECRET`.
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFMh8S3Jk7UPxASR'

export const volunteerContent: Record<Lang, VolunteerLocale> = {
    en: {
        consent: {
            after: ' The details are deleted by 31 July 2027 at the latest.',
            before: "I consent to Lauri Lavanti's election campaign processing the details I give on this form and contacting me about volunteering. I understand that signing up reveals my political opinion. ",
            linkText: 'Read the privacy policy.',
        },
        email: 'Email',
        errors: {
            consent: 'Signing up needs your consent.',
            email: 'Check the email address.',
            help: 'Choose at least one way to help.',
            lomake: 'Sending the form failed. Please try again.',
            municipality: 'Choose your municipality.',
            name: 'Enter your name.',
            palvelu: 'Signing up does not work right now. Please try again shortly or email lauri@lavanti.fi.',
            phone: 'Check the phone number.',
            varmistus: 'The check failed. Please try again.',
        },
        help: {
            jakaminen: 'Handing out leaflets',
            muu: 'Something else',
            some: 'Social media',
            tapahtumat: 'Events and campaign stands',
        },
        helpLegend: 'How would you like to help?',
        municipality: 'Municipality',
        municipalityOptions: {
            espoo: 'Espoo',
            kirkkonummi: 'Kirkkonummi',
            muu: 'Other',
            'muu-uusimaa': 'Other municipality in Uusimaa',
            vantaa: 'Vantaa',
        },
        name: 'Name',
        phone: 'Phone number',
        privacyHref: '/en/privacy-policy/',
        requiredNote: 'Fields marked with an asterisk (*) are required. Everything else is optional.',
        submit: 'Sign up',
        submitHint: 'Fill in your name and email and give your consent to send the form.',
    },
    fi: {
        consent: {
            after: ' Tiedot poistetaan viimeistään 31.7.2027.',
            before: 'Annan suostumukseni siihen, että Lauri Lavannin vaalikampanja käsittelee tällä lomakkeella antamiani tietoja ja ottaa minuun yhteyttä vapaaehtoistyöstä. Tiedän, että ilmoittautuminen kertoo poliittisesta kannastani. ',
            linkText: 'Lue tietosuojaseloste.',
        },
        email: 'Sähköposti',
        errors: {
            consent: 'Ilmoittautuminen tarvitsee suostumuksesi.',
            email: 'Tarkista sähköpostiosoite.',
            help: 'Valitse ainakin yksi tapa auttaa.',
            lomake: 'Lomakkeen lähetys epäonnistui. Yritä uudelleen.',
            municipality: 'Valitse kotikunta.',
            name: 'Kirjoita nimesi.',
            palvelu:
                'Ilmoittautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen tai lähetä viesti osoitteeseen lauri@lavanti.fi.',
            phone: 'Tarkista puhelinnumero.',
            varmistus: 'Varmistus epäonnistui. Yritä uudelleen.',
        },
        help: {
            jakaminen: 'Esitteiden jakaminen',
            muu: 'Jokin muu',
            some: 'Sosiaalinen media',
            tapahtumat: 'Tapahtumat ja vaaliteltat',
        },
        helpLegend: 'Miten haluaisit auttaa?',
        municipality: 'Kotikunta',
        municipalityOptions: {
            espoo: 'Espoo',
            kirkkonummi: 'Kirkkonummi',
            muu: 'Muu',
            'muu-uusimaa': 'Muu Uudenmaan kunta',
            vantaa: 'Vantaa',
        },
        name: 'Nimi',
        phone: 'Puhelinnumero',
        privacyHref: '/fi/tietosuoja/',
        requiredNote: 'Tähdellä (*) merkityt kohdat ovat pakollisia. Muut voit jättää tyhjiksi.',
        submit: 'Ilmoittaudu mukaan',
        submitHint: 'Täytä nimi ja sähköposti ja anna suostumuksesi, niin voit lähettää lomakkeen.',
    },
    sv: {
        consent: {
            after: ' Uppgifterna raderas senast 31.7.2027.',
            before: 'Jag samtycker till att Lauri Lavantis valkampanj behandlar de uppgifter jag lämnar i det här formuläret och kontaktar mig om frivilligarbete. Jag vet att anmälan avslöjar min politiska åskådning. ',
            linkText: 'Läs integritetspolicyn.',
        },
        email: 'E-post',
        errors: {
            consent: 'Anmälan kräver ditt samtycke.',
            email: 'Kontrollera e-postadressen.',
            help: 'Välj minst ett sätt att hjälpa till.',
            lomake: 'Det gick inte att skicka formuläret. Försök igen.',
            municipality: 'Välj hemkommun.',
            name: 'Skriv ditt namn.',
            palvelu:
                'Anmälan fungerar inte just nu. Försök igen om en stund eller skicka e-post till lauri@lavanti.fi.',
            phone: 'Kontrollera telefonnumret.',
            varmistus: 'Kontrollen misslyckades. Försök igen.',
        },
        help: {
            jakaminen: 'Dela ut broschyrer',
            muu: 'Något annat',
            some: 'Sociala medier',
            tapahtumat: 'Evenemang och valtält',
        },
        helpLegend: 'Hur vill du hjälpa till?',
        municipality: 'Hemkommun',
        municipalityOptions: {
            espoo: 'Esbo',
            kirkkonummi: 'Kyrkslätt',
            muu: 'Annan',
            'muu-uusimaa': 'Annan kommun i Nyland',
            vantaa: 'Vanda',
        },
        name: 'Namn',
        phone: 'Telefonnummer',
        privacyHref: '/sv/dataskydd/',
        requiredNote: 'Fält märkta med asterisk (*) är obligatoriska. De övriga kan du lämna tomma.',
        submit: 'Anmäl dig',
        submitHint: 'Fyll i namn och e-post och ge ditt samtycke för att kunna skicka formuläret.',
    },
}
