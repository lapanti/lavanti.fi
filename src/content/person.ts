import type { Lang } from './nav'

import { getImage } from '../lib/images'
import { socialUrls } from './social'

export const PERSON_ID = 'https://lavanti.fi/fi/laurista/#person'

export const personBlueskyHandle = 'lauri.lavanti.fi'
export const personThreadsHandle = 'laurilavanti'
export const personMastodonInstance = 'mastodon.social'
export const personMastodonHandle = `laurilavanti@${personMastodonInstance}`

export const personName = 'Lauri Lavanti'
export const personGivenName = 'Lauri'
export const personFamilyName = 'Lavanti'
export const personBirthDate = '1991-10-01'
export const personBirthPlace = { '@type': 'Place', name: 'Jyväskylä' }
export const personNationality = { '@type': 'Country', name: 'FI' }
export const personUrl = 'https://lavanti.fi/fi/'
export const personEmail = 'lauri@lavanti.fi'
export const personTelephone = '+358407617605'

export function getPersonImageUrl(): Promise<string> {
    return Promise.resolve(getImage('Lauri-Lavanti-seisoo-suorassa-sinisella-taustalla', 'og').src)
}

/*
 * Social profiles come from the shared list; the reference entries are not profiles.
 * The Markkinavihreät person page stays out of socialUrls: that list also renders the
 * footer's rel="me" links, and a network-run page is not Lauri's own profile.
 */
export const personSameAs = [
    ...socialUrls,
    'https://fi.wikipedia.org/wiki/Lauri_Lavanti',
    'https://www.wikidata.org/wiki/Q139711658',
    'https://markkinavihreat.fi/ketka/lauri-lavanti/',
]

export const personJobTitle: Record<Lang, string> = {
    en: 'parliamentary candidate, municipal councillor & lead developer, MSc',
    fi: 'eduskuntavaaliehdokas, kunnanvaltuutettu ja johtava ohjelmistokehittäjä ja DI',
    sv: 'riksdagskandidat, kommunfullmäktigeledamot och ledande programutvecklare, DI',
}

export const personDescription: Record<Lang, string> = {
    en: "Lauri Lavanti is the Greens' parliamentary candidate in Uusimaa for the 2027 elections, a Kirkkonummi municipal councillor and lead developer (MSc, Aalto). He works to build a digitally independent Finland where the economy, education, and rights work together in the age of AI.",
    fi: 'Lauri Lavanti on Vihreiden eduskuntavaaliehdokas Uudenmaan vaalipiirissä eduskuntavaaleissa 2027, Kirkkonummen kunnanvaltuutettu ja johtava ohjelmistokehittäjä (DI, Aalto). Hänen tavoitteenaan on digitaalisesti itsenäinen Suomi, jossa talous, sivistys ja vapaus toimivat yhdessä tekoälyn aikakaudella.',
    sv: 'Lauri Lavanti är De Grönas riksdagskandidat i Nylands valkrets i riksdagsvalet 2027, fullmäktigeledamot i Kyrkslätt och ledande programutvecklare (DI, Aalto-universitetet). Hans mål är ett digitalt självständigt Finland där ekonomi, bildning och frihet fungerar tillsammans i AI-tidsåldern.',
}

export const personKnowsAbout: Record<Lang, string[]> = {
    en: [
        'Artificial intelligence',
        'Digital independence',
        'Economic policy',
        'Market economy',
        'Marketgreen',
        'Entrepreneurship',
        'Education',
        'Fundamental rights',
        'Privacy',
        'Responsible AI',
        'Parliamentary elections',
        'Finnish-language AI models',
        'Public procurement portability',
        'Foundation-owned companies',
        'Public administration',
    ],
    fi: [
        'Tekoäly',
        'Digitaalinen itsenäisyys',
        'Talouspolitiikka',
        'Markkinatalous',
        'Markkinavihreä',
        'Yrittäjyys',
        'Sivistys',
        'Perusoikeudet',
        'Yksityisyys',
        'Vastuullinen tekoäly',
        'Eduskuntavaalit',
        'Suomenkieliset tekoälymallit',
        'Julkishankintojen siirrettävyys',
        'Säätiö-omisteiset yhtiöt',
        'Julkishallinto',
    ],
    sv: [
        'Artificiell intelligens',
        'Digital självständighet',
        'Ekonomisk politik',
        'Marknadsekonomi',
        'Marknadsgrön',
        'Företagande',
        'Bildning',
        'Grundläggande rättigheter',
        'Integritet',
        'Ansvarsfull AI',
        'Riksdagsval',
        'Finskspråkiga AI-modeller',
        'Överförbarhet av offentliga upphandlingar',
        'Stiftelseägda bolag',
        'Offentlig förvaltning',
    ],
}

export const personKnowsLanguage = ['fi', 'en', 'sv']

export const personWorksFor = {
    '@type': 'Organization',
    name: 'OP',
    url: 'https://www.op.fi/',
}

export const personAlumniOf = [
    { '@type': 'CollegeOrUniversity', name: 'Aalto-yliopisto', url: 'https://www.aalto.fi/' },
    { '@type': 'EducationalOrganization', name: 'Omnia', url: 'https://www.omnia.fi/' },
    { '@type': 'HighSchool', name: 'Masalan lukio' },
]

export const personMemberOf = [
    {
        '@type': 'PoliticalParty',
        name: 'Vihreä liitto',
        url: 'https://www.vihreat.fi',
    },
    {
        '@id': 'https://markkinavihreat.fi/#organization',
        '@type': 'Organization',
        name: 'Markkinavihreät',
        url: 'https://markkinavihreat.fi/',
    },
]

export const personAffiliation = [
    {
        '@type': 'Organization',
        name: 'Digitaalinen itsenäisyys -kansalaisaloite',
        url: 'https://digitaalinenitsenaisyys.fi/',
    },
]

export const personHasOccupation: Record<Lang, object[]> = {
    en: [
        {
            '@type': 'Occupation',
            name: 'Parliamentary candidate',
            occupationLocation: { '@type': 'AdministrativeArea', name: 'Uusimaa electoral district' },
            skills: 'AI policy, digital independence, economic policy, privacy, fundamental rights',
        },
        {
            '@type': 'Occupation',
            name: 'Municipal councillor',
            occupationLocation: { '@type': 'City', name: 'Kirkkonummi' },
            skills: 'Digital policy, AI governance, economic policy, entrepreneurship, local government',
        },
        {
            '@type': 'Occupation',
            name: 'Lead developer',
            skills: 'Artificial intelligence, software architecture, digital sovereignty, secure software development',
        },
    ],
    fi: [
        {
            '@type': 'Occupation',
            name: 'Eduskuntavaaliehdokas',
            occupationLocation: { '@type': 'AdministrativeArea', name: 'Uudenmaan vaalipiiri' },
            skills: 'Tekoälypolitiikka, digitaalinen itsenäisyys, talouspolitiikka, yksityisyys, perusoikeudet',
        },
        {
            '@type': 'Occupation',
            name: 'Kunnanvaltuutettu',
            occupationLocation: { '@type': 'City', name: 'Kirkkonummi' },
            skills: 'Digitaalinen politiikka, tekoälyhallinto, talouspolitiikka, yrittäjyys, julkishallinto',
        },
        {
            '@type': 'Occupation',
            name: 'Johtava ohjelmistokehittäjä',
            skills: 'Tekoäly, ohjelmistoarkkitehtuuri, digitaalinen itsenäisyys, tietoturvallinen ohjelmistokehitys',
        },
    ],
    sv: [
        {
            '@type': 'Occupation',
            name: 'Riksdagskandidat',
            occupationLocation: { '@type': 'AdministrativeArea', name: 'Nylands valkrets' },
            skills: 'AI-politik, digital självständighet, ekonomisk politik, integritet, grundläggande rättigheter',
        },
        {
            '@type': 'Occupation',
            name: 'Kommunfullmäktigeledamot',
            occupationLocation: { '@type': 'City', name: 'Kyrkslätt' },
            skills: 'Digital politik, AI-styrning, ekonomisk politik, företagande, kommunal förvaltning',
        },
        {
            '@type': 'Occupation',
            name: 'Ledande programutvecklare',
            skills: 'Artificiell intelligens, programvaruarkitektur, digital självständighet, säker mjukvaruutveckling',
        },
    ],
}

export type AuthorEntry =
    | 'lauri'
    | {
          name: string
          url?: string
          sameAs?: string[]
          role?: string
      }
