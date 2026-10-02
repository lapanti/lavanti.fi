import type { HELP_OPTIONS, MUNICIPALITIES } from '../lib/volunteers'

/**
 * Strings for the volunteer sign-up form (`src/components/VolunteerForm.astro`).
 * Finnish only until Lauri approves the Finnish text; SV and EN follow from it.
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
    submit: string
}

/**
 * Turnstile site key (public). Placeholder is Cloudflare's always-pass test key, which the
 * production secret rejects: sign-ups fail closed until the real key is set here.
 */
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'

export const volunteerContent: { fi: VolunteerLocale } = {
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
            puhelin: 'Soittaminen ja ovelta ovelle',
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
        phone: 'Puhelinnumero (vapaaehtoinen)',
        privacyHref: '/fi/tietosuoja/',
        submit: 'Ilmoittaudu mukaan',
    },
}
