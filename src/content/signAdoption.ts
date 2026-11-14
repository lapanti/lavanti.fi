import type { AdoptionMunicipality } from '../lib/signAdoptions'
import type { Lang } from './nav'

/*
 * Strings for Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md): the landing form, the
 * thanks page, the adopters wall, the personal pages and the confirmation email the CLI prints.
 * Finnish is the approved source; SV and EN are translations of it.
 *
 * Vocabulary in every language: donation and thanks, adopt, never buy, pay (for the donation),
 * sponsor, ad space or visibility. Type-only imports, so the CLI can load this file under
 * `node --experimental-strip-types`.
 */

/** Text on the sign itself. The physical sign is Finnish, so the graphic is too in every locale. */
export const SIGN_TEXT = {
    firstName: 'Lauri',
    lastName: 'Lavanti',
    payer: 'Mainoksen maksaja: Digitaalisen itsenäisyyden puolesta ry',
    tagline: 'Eduskuntavaalit 2027 · Uusimaa',
} as const

export const MOBILEPAY_NUMBER = '46492'
/** Title of the invoice sent to a company; the owner copies it from `npm run adoptions`. */
export const INVOICE_TITLE = 'Lahjoitus vaalikeräykseen (Adoptoi kyltti)'

interface MailInput {
    company: boolean
    name: string
    quantity: number
    ref: string
}

interface AdoptionLocale {
    form: {
        back: string
        billingAddress: string
        businessId: string
        chip: (n: number) => string
        chipOther: string
        chipsLegend: string
        companyDeclaration: string
        companyName: string
        companySummary: string
        consentPage: (path: string) => string
        consentPerson: string
        consentPersonCompany: string
        consentPrint: (n: number) => string
        consentPublic: string
        cta: (n: number) => string
        email: string
        emailHint: string
        /** Shown when the function answers with an error code. */
        errors: Record<string, string>
        liveCount: (n: number) => string
        liveNames: (names: string) => string
        municipality: string
        municipalityHint: string
        municipalityOptions: Record<AdoptionMunicipality, string>
        nameCounter: (used: number, max: number) => string
        nameLabel: string
        pinned: (name: string, n: number) => string
        price: string
        privacyHref: string
        privacyLink: string
        quantityLabel: string
        requiredNote: string
        revokeNote: string
        sending: string
        step2Heading: string
        submitHint: string
        total: (euros: number) => string
    }
    /** Path prefix of the personal pages: `<base><slug>/`. */
    base: string
    euros: (n: number) => string
    join: { href: string; label: string; lead: string }
    mail: (input: MailInput) => { body: string; subject: string }
    mobilePay: {
        copied: string
        copyNumber: string
        copyRef: string
        donate: (euros: number) => string
        open: string
        qrAlt: string
        refNote: (ref: string) => string
    }
    personal: {
        cta: string
        description: (name: string) => string
        ogEmphasis: string
        pageTitle: (name: string) => string
        title: (name: string) => string
    }
    sign: {
        figureLabel: string
        finePrint: string
        ghostName: string
    }
    thanks: {
        almost: string
        companyInvoice: string
        donated: string
        invalid: string
        invalidLink: string
        message: { hint: string; label: string; save: string; saved: string; tooSoon: string; unavailable: string }
        missingName: string
        next: string
        payer: { label: string; save: string; saved: string }
        share: {
            clipboard: string
            cta: string
            download: string
            feed: string
            headline: string
            heading: string
            imageAlt: (name: string) => string
            inApp: string
            longPress: string
            share: string
            story: string
            text: string
        }
        thankYou: string[]
    }
    wall: {
        adoptersHeading: string
        count: (n: number) => string
        messagesHeading: string
        municipalities: string
        other: string
        ownTile: (name: string) => string
    }
}

const fiMunicipalities: Record<AdoptionMunicipality, string> = {
    askola: 'Askola',
    'ei-toivetta': 'Ei toivetta',
    espoo: 'Espoo',
    hanko: 'Hanko',
    hyvinkaa: 'Hyvinkää',
    inkoo: 'Inkoo',
    jarvenpaa: 'Järvenpää',
    karkkila: 'Karkkila',
    kauniainen: 'Kauniainen',
    kerava: 'Kerava',
    kirkkonummi: 'Kirkkonummi',
    lapinjarvi: 'Lapinjärvi',
    lohja: 'Lohja',
    loviisa: 'Loviisa',
    mantsala: 'Mäntsälä',
    myrskyla: 'Myrskylä',
    nurmijarvi: 'Nurmijärvi',
    pornainen: 'Pornainen',
    porvoo: 'Porvoo',
    pukkila: 'Pukkila',
    raasepori: 'Raasepori',
    sipoo: 'Sipoo',
    siuntio: 'Siuntio',
    tuusula: 'Tuusula',
    vantaa: 'Vantaa',
    vihti: 'Vihti',
}

const svMunicipalities: Record<AdoptionMunicipality, string> = {
    askola: 'Askola',
    'ei-toivetta': 'Ingen önskan',
    espoo: 'Esbo',
    hanko: 'Hangö',
    hyvinkaa: 'Hyvinge',
    inkoo: 'Ingå',
    jarvenpaa: 'Träskända',
    karkkila: 'Högfors',
    kauniainen: 'Grankulla',
    kerava: 'Kervo',
    kirkkonummi: 'Kyrkslätt',
    lapinjarvi: 'Lappträsk',
    lohja: 'Lojo',
    loviisa: 'Lovisa',
    mantsala: 'Mäntsälä',
    myrskyla: 'Mörskom',
    nurmijarvi: 'Nurmijärvi',
    pornainen: 'Borgnäs',
    porvoo: 'Borgå',
    pukkila: 'Pukkila',
    raasepori: 'Raseborg',
    sipoo: 'Sibbo',
    siuntio: 'Sjundeå',
    tuusula: 'Tusby',
    vantaa: 'Vanda',
    vihti: 'Vichtis',
}

const fiEuros = (n: number) => `${n} €`

export const adoptionContent: Record<Lang, AdoptionLocale> = {
    en: {
        base: '/en/adopt/',
        euros: (n) => `€${n}`,
        form: {
            back: 'Change the name or number',
            billingAddress: 'Billing address (email or e-invoice address)',
            businessId: 'Business ID (Y-tunnus)',
            chip: (n) => `${n} ${n === 1 ? 'sign' : 'signs'} · €${n * 30}`,
            chipOther: 'Another number of signs',
            chipsLegend: 'How many signs will you adopt?',
            companyDeclaration:
                'The company is Finnish and is not a public body or controlled by the state, a municipality or a wellbeing services county.',
            companyName: 'Company name',
            companySummary: 'I am donating as a company',
            consentPage: (path) =>
                `I want my own page at lavanti.fi${path}. Your name and message are stored in the site's public source code. You can ask for the page to be removed at any time.`,
            consentPerson: 'The name is my own name. I am 18 or older.',
            consentPersonCompany: 'The name is my own name or the name of a company I may represent. I am 18 or older.',
            consentPrint: (n) =>
                n > 1
                    ? "I give permission to write my name on Lauri Lavanti's election signs. I know that my name on the signs shows that I support his candidacy."
                    : "I give permission to write my name on Lauri Lavanti's election sign. I know that my name on the sign shows that I support his candidacy.",
            consentPublic: 'My name may appear in the list of adopters on this page.',
            cta: (n) => (n > 1 ? `Adopt ${n} signs` : 'Adopt a sign'),
            email: 'Email',
            emailHint:
                'We send you a confirmation, get in touch if we have a question about the name, and tell you when the signs go up.',
            errors: {
                billing_address: 'Check the billing address.',
                business_id: 'Check the business ID.',
                company_name: 'Check the company name.',
                consent_company: 'Confirm the statement about the company.',
                consent_person: 'Confirm that the name is your own and that you are 18 or older.',
                consent_print: 'Writing your name on the sign needs your permission.',
                email: 'Check the email address.',
                lomake: 'Sending the form failed. Please try again.',
                municipality: 'Choose a municipality or "No preference".',
                palvelu: 'Adopting a sign does not work right now. Please try again shortly or email lauri@lavanti.fi.',
                quantity: 'Choose between 1 and 20 signs.',
                sign_name:
                    'Check the name: 2 to 24 letters, spaces, hyphens, apostrophes or full stops. Digits and "&" only for a company.',
                varmistus: 'The check failed. Please try again.',
            },
            liveCount: (n) => `${n} ${n === 1 ? 'sign' : 'signs'} adopted so far.`,
            liveNames: (names) => `Most recent adopters: ${names}.`,
            municipality: 'In which municipality would you like your sign to stand?',
            municipalityHint: 'We take your wish into account, but we cannot promise a spot.',
            municipalityOptions: { ...fiMunicipalities, 'ei-toivetta': 'No preference' },
            nameCounter: (used, max) => `${used}/${max}`,
            nameLabel: 'Name for the sign',
            pinned: (name, n) => (n > 1 ? `Your sign: ${name} · ${n} signs` : `Your sign: ${name}`),
            price: '€30 = one sign by the roadside',
            privacyHref: '/en/privacy-policy/',
            privacyLink: 'Read the privacy policy.',
            quantityLabel: 'Number of signs',
            requiredNote: 'Fields marked with an asterisk (*) are required.',
            revokeNote:
                'You can withdraw your permission at any time by replying to our confirmation email or writing to lauri@lavanti.fi. If you withdraw permission to use your name, we cover the name on the sign and remove it from the website.',
            sending: 'Sending…',
            step2Heading: 'Just your contact details and permission to use your name.',
            submitHint: 'Fill in the name, municipality and email and tick the two required boxes to send.',
            total: (euros) => `Your donation: €${euros}`,
        },
        join: { href: '/en/join/', label: 'lavanti.fi/en/join', lead: 'Join in:' },
        mail: ({ company, name, quantity, ref }) => ({
            body: [
                'Hello,',
                '',
                `thank you for adopting ${quantity > 1 ? `${quantity} election signs` : 'an election sign'}! We have received your donation (${ref}), and the name "${name}" will be written on the bottom edge of ${quantity > 1 ? 'the signs' : 'the sign'}.`,
                '',
                company ? 'The invoice is on its way to the billing address you gave.' : '',
                'The signs go up by the roadsides of Uusimaa in spring. We will let you know when yours is out.',
                '',
                'You can withdraw your permission to use the name at any time by replying to this message. We then cover the name on the sign and remove it from the website.',
                '',
                'Best wishes,',
                'Lauri Lavanti',
            ]
                .filter((line, i, all) => line !== '' || all[i - 1] !== '')
                .join('\n'),
            subject: quantity > 1 ? 'Your signs are adopted' : 'Your sign is adopted',
        }),
        mobilePay: {
            copied: 'Copied',
            copyNumber: 'Copy the number',
            copyRef: 'Copy the message',
            donate: (euros) => `Donate €${euros} with MobilePay to number 46492.`,
            open: 'Open MobilePay',
            qrAlt: 'MobilePay QR code for number 46492',
            refNote: (ref) => `Write ${ref} as the message so we can find your donation.`,
        },
        personal: {
            cta: 'Adopt a sign too',
            description: (name) => `${name} adopted an election sign for Lauri Lavanti's campaign in Uusimaa.`,
            ogEmphasis: 'adopted a sign',
            pageTitle: (name) => `${name} adopted a sign`,
            title: (name) => `${name} adopted a sign`,
        },
        sign: {
            figureLabel: 'Illustration of the election sign with your name on its bottom edge',
            finePrint: 'Illustration. The final sign may differ from the picture.',
            ghostName: 'Your name',
        },
        thanks: {
            almost: 'Almost done! Your sign is only waiting for your donation.',
            companyInvoice:
                'We will send an invoice to the billing address you gave. The invoice has no VAT because this is a donation.',
            donated: 'I donated',
            invalid: 'This link is missing some details.',
            invalidLink: 'Go back and adopt a sign',
            message: {
                hint: 'Up to 140 characters. The message appears on the page only after we have checked it, and only if you allowed your name to be shown.',
                label: 'Why did I adopt? (optional)',
                save: 'Save the message',
                saved: 'Thank you! We will check the message before it appears.',
                tooSoon: 'Wait a moment and try again.',
                unavailable: 'Saving the message does not work right now. Please email lauri@lavanti.fi.',
            },
            missingName: 'Type the name again to see your sign.',
            next: 'We will check the donation and send a confirmation to your email.',
            payer: {
                label: "Payer's name, if you pay with someone else's MobilePay",
                save: 'Save',
                saved: 'Saved.',
            },
            share: {
                clipboard: 'Add a link sticker to your story. The address is already on your clipboard.',
                cta: 'Adopt one too: lavanti.fi/en/adopt',
                download: 'Download the image',
                feed: 'Post (4:5)',
                heading: 'Tell your friends about your sign',
                headline: "I adopted Lauri Lavanti's election sign",
                imageAlt: (name) => `Share image: ${name} adopted Lauri Lavanti's election sign`,
                inApp: 'Open the page in your browser to save the image.',
                longPress: 'Press and hold the image to save it.',
                share: 'Share the image',
                story: 'Story (9:16)',
                text: "I adopted Lauri Lavanti's election sign, and in spring it goes up by the roadside with my name on it. Lauri is the Greens' parliamentary candidate in Uusimaa. Adopt one too: lavanti.fi/en/adopt",
            },
            thankYou: [
                'Thank you for choosing to support my parliamentary election campaign!',
                'Your donation puts your sign up by the roadside in spring, bringing parliament a step closer.',
                'When the economy, education, and freedom work together in the age of AI, we build a digitally independent Finland.',
                'You make that possible. Thank you!',
            ],
        },
        wall: {
            adoptersHeading: 'Adopters',
            count: (n) => `${n} ${n === 1 ? 'sign' : 'signs'} adopted so far.`,
            messagesHeading: 'Why I adopted',
            municipalities: 'Requested municipalities:',
            other: 'other municipalities',
            ownTile: (name) => `${name} (awaiting confirmation)`,
        },
    },
    fi: {
        base: '/fi/adoptoi/',
        euros: fiEuros,
        form: {
            back: 'Muuta nimeä tai määrää',
            billingAddress: 'Laskutusosoite (sähköposti tai verkkolaskuosoite)',
            businessId: 'Y-tunnus',
            chip: (n) => `${n} ${n === 1 ? 'kyltti' : 'kylttiä'} · ${n * 30} €`,
            chipOther: 'Muu määrä kylttejä',
            chipsLegend: 'Montako kylttiä adoptoit?',
            companyDeclaration:
                'Yritys on suomalainen, eikä se ole julkisyhteisö tai valtion, kunnan tai hyvinvointialueen määräysvallassa.',
            companyName: 'Yrityksen nimi',
            companySummary: 'Lahjoitan yrityksenä',
            consentPage: (path) =>
                `Haluan oman sivun osoitteeseen lavanti.fi${path}. Nimesi ja viestisi tallentuvat sivuston julkiseen lähdekoodiin. Voit pyytää sivun poistamista milloin tahansa.`,
            consentPerson: 'Nimi on oma nimeni. Olen täysi-ikäinen.',
            consentPersonCompany: 'Nimi on oma nimeni tai sen yrityksen nimi, jota saan edustaa. Olen täysi-ikäinen.',
            consentPrint: (n) =>
                n > 1
                    ? 'Annan luvan kirjoittaa nimeni Lauri Lavannin vaalikyltteihin. Tiedän, että nimeni kylteissä kertoo tukevani hänen ehdokkuuttaan.'
                    : 'Annan luvan kirjoittaa nimeni Lauri Lavannin vaalikylttiin. Tiedän, että nimeni kyltissä kertoo tukevani hänen ehdokkuuttaan.',
            consentPublic: 'Nimeni saa näkyä tämän sivun adoptoijien listalla.',
            cta: (n) => (n > 1 ? `Adoptoi ${n} kylttiä` : 'Adoptoi kyltti'),
            email: 'Sähköposti',
            emailHint:
                'Lähetämme vahvistuksen, otamme yhteyttä, jos nimessä on kysyttävää, ja kerromme, kun kyltit nousevat tienvarsille.',
            errors: {
                billing_address: 'Tarkista laskutusosoite.',
                business_id: 'Tarkista Y-tunnus.',
                company_name: 'Tarkista yrityksen nimi.',
                consent_company: 'Vahvista yritystä koskeva vakuutus.',
                consent_person: 'Vahvista, että nimi on oma nimesi ja että olet täysi-ikäinen.',
                consent_print: 'Nimen kirjoittaminen kylttiin tarvitsee lupasi.',
                email: 'Tarkista sähköpostiosoite.',
                lomake: 'Lomakkeen lähetys epäonnistui. Yritä uudelleen.',
                municipality: 'Valitse kunta tai "Ei toivetta".',
                palvelu:
                    'Kyltin adoptointi ei juuri nyt onnistu. Yritä hetken päästä uudelleen tai lähetä viesti osoitteeseen lauri@lavanti.fi.',
                quantity: 'Valitse vähintään 1 ja enintään 20 kylttiä.',
                sign_name:
                    'Tarkista nimi: vähintään 2 ja enintään 24 merkkiä, joissa on kirjaimia, välilyöntejä, yhdysmerkkejä, heittomerkkejä tai pisteitä. Numerot ja "&" vain yrityksen nimessä.',
                varmistus: 'Varmistus epäonnistui. Yritä uudelleen.',
            },
            liveCount: (n) => `Jo ${n} ${n === 1 ? 'kyltti' : 'kylttiä'} on adoptoitu.`,
            liveNames: (names) => `Viimeksi adoptoivat: ${names}.`,
            municipality: 'Missä kunnassa toivot kylttisi seisovan?',
            municipalityHint: 'Otamme toiveen huomioon, mutta paikkaa emme voi luvata.',
            municipalityOptions: fiMunicipalities,
            nameCounter: (used, max) => `${used}/${max}`,
            nameLabel: 'Nimi kylttiin',
            pinned: (name, n) => (n > 1 ? `Kylttisi: ${name} · ${n} kylttiä` : `Kylttisi: ${name}`),
            price: '30 € = yksi kyltti tienvarteen',
            privacyHref: '/fi/tietosuoja/',
            privacyLink: 'Lue tietosuojaseloste.',
            quantityLabel: 'Kylttien määrä',
            requiredNote: 'Tähdellä (*) merkityt kohdat ovat pakollisia.',
            revokeNote:
                'Voit perua luvan milloin tahansa vastaamalla vahvistusviestiimme tai kirjoittamalla osoitteeseen lauri@lavanti.fi. Jos perut luvan nimen käyttöön, peitämme nimen kyltistä ja poistamme sen sivustolta.',
            sending: 'Lähetetään…',
            step2Heading: 'Vielä yhteystieto ja lupa nimen käyttöön.',
            submitHint: 'Valitse kunta, täytä sähköposti ja rastita kaksi pakollista kohtaa, niin voit lähettää.',
            total: (euros) => `Lahjoituksesi: ${euros} €`,
        },
        join: { href: '/fi/liity/', label: 'lavanti.fi/liity', lead: 'Liity mukaan:' },
        mail: ({ company, name, quantity, ref }) => ({
            body: [
                'Hei,',
                '',
                `kiitos, että adoptoit ${quantity > 1 ? `${quantity} vaalikylttiä` : 'vaalikyltin'}! Lahjoituksesi (${ref}) on vastaanotettu, ja nimi "${name}" kirjoitetaan ${quantity > 1 ? 'kylttien' : 'kyltin'} alareunaan.`,
                '',
                company ? 'Lasku on tulossa antamaasi laskutusosoitteeseen.' : '',
                'Kyltit nousevat Uudenmaan tienvarsille keväällä. Kerromme, kun omasi on paikallaan.',
                '',
                'Voit perua luvan nimen käyttöön milloin tahansa vastaamalla tähän viestiin. Silloin peitämme nimen kyltistä ja poistamme sen sivustolta.',
                '',
                'Lämpimin terveisin',
                'Lauri Lavanti',
            ]
                .filter((line, i, all) => line !== '' || all[i - 1] !== '')
                .join('\n'),
            // "Kylttisi" reads as one sign or several, so one subject fits both.
            subject: 'Kylttisi on adoptoitu',
        }),
        mobilePay: {
            copied: 'Kopioitu',
            copyNumber: 'Kopioi numero',
            copyRef: 'Kopioi viesti',
            donate: (euros) => `Lahjoita ${euros} euroa MobilePayllä numerolla 46492.`,
            open: 'Avaa MobilePay',
            qrAlt: 'MobilePay-QR-koodi numeroon 46492',
            refNote: (ref) => `Kirjoita viestiksi ${ref}, niin löydämme lahjoituksesi.`,
        },
        personal: {
            cta: 'Adoptoi sinäkin kyltti',
            description: (name) => `${name} adoptoi vaalikyltin Lauri Lavannin kampanjalle Uudellamaalla.`,
            ogEmphasis: 'adoptoi kyltin',
            pageTitle: (name) => `${name} adoptoi kyltin`,
            title: (name) => `${name} adoptoi kyltin`,
        },
        sign: {
            figureLabel: 'Havainnekuva vaalikyltistä, jonka alareunassa on nimesi',
            finePrint: 'Havainnekuva. Lopullinen kyltti voi poiketa kuvasta.',
            ghostName: 'Sinun nimesi',
        },
        thanks: {
            almost: 'Melkein valmis! Kylttisi odottaa enää vain lahjoitustasi.',
            companyInvoice:
                'Lähetämme laskun antamaasi laskutusosoitteeseen. Laskussa ei ole arvonlisäveroa, koska kyse on lahjoituksesta.',
            donated: 'Lahjoitin',
            invalid: 'Linkistä puuttuu tietoja.',
            invalidLink: 'Palaa adoptoimaan kyltti',
            message: {
                hint: 'Enintään 140 merkkiä. Viesti näkyy sivulla vasta, kun olemme tarkistaneet sen, ja vain jos annoit luvan nimesi näyttämiseen.',
                label: 'Miksi adoptoin? (vapaaehtoinen)',
                save: 'Tallenna viesti',
                saved: 'Kiitos! Tarkistamme viestin ennen kuin se näkyy.',
                tooSoon: 'Odota hetki ja yritä uudelleen.',
                unavailable: 'Viestin tallennus ei juuri nyt onnistu. Lähetä viesti osoitteeseen lauri@lavanti.fi.',
            },
            missingName: 'Kirjoita nimi uudelleen, niin näet kylttisi.',
            next: 'Tarkistamme lahjoituksen ja lähetämme vahvistuksen sähköpostiisi.',
            payer: {
                label: 'Maksajan nimi, jos maksat toisen henkilön MobilePayllä',
                save: 'Tallenna',
                saved: 'Tallennettu.',
            },
            share: {
                clipboard: 'Lisää tarinaan linkkitarra. Osoite on jo leikepöydällä.',
                cta: 'Adoptoi sinäkin: lavanti.fi/adoptoi',
                download: 'Lataa kuva',
                feed: 'Julkaisu (4:5)',
                heading: 'Kerro kyltistäsi kavereillesi',
                headline: 'Adoptoin Lauri Lavannin vaalikyltin',
                imageAlt: (name) => `Jakokuva: ${name} adoptoi Lauri Lavannin vaalikyltin`,
                inApp: 'Avaa sivu selaimessa, niin voit tallentaa kuvan.',
                longPress: 'Paina kuvaa pitkään ja tallenna se.',
                share: 'Jaa kuva',
                story: 'Tarina (9:16)',
                text: 'Adoptoin Lauri Lavannin vaalikyltin, ja keväällä se nousee tienvarteen minun nimelläni. Lauri on Vihreiden eduskuntavaaliehdokas Uudellamaalla. Adoptoi sinäkin: lavanti.fi/adoptoi',
            },
            thankYou: [
                'Kiitos, että lähdit tukemaan eduskuntavaalikampanjaani!',
                'Lahjoituksesi avulla kylttisi nousee keväällä tienvarteen, ja eduskunta on piirun verran lähempänä.',
                'Kun talous, sivistys ja vapaus toimivat yhdessä tekoälyn aikakaudella, rakennetaan digitaalisesti itsenäinen Suomi.',
                'Sinä teet sen mahdolliseksi. Kiitos!',
            ],
        },
        wall: {
            adoptersHeading: 'Adoptoijat',
            count: (n) => `Jo ${n} ${n === 1 ? 'kyltti' : 'kylttiä'} on adoptoitu.`,
            messagesHeading: 'Miksi adoptoin?',
            municipalities: 'Toivotut kunnat:',
            other: 'muut kunnat',
            ownTile: (name) => `${name} (odottaa vahvistusta)`,
        },
    },
    sv: {
        base: '/sv/adoptera/',
        euros: fiEuros,
        form: {
            back: 'Ändra namnet eller antalet',
            billingAddress: 'Faktureringsadress (e-post eller e-fakturaadress)',
            businessId: 'FO-nummer',
            chip: (n) => `${n} ${n === 1 ? 'skylt' : 'skyltar'} · ${n * 30} €`,
            chipOther: 'Ett annat antal skyltar',
            chipsLegend: 'Hur många skyltar adopterar du?',
            companyDeclaration:
                'Företaget är finländskt och är inte ett offentligt samfund eller under bestämmande inflytande av staten, en kommun eller ett välfärdsområde.',
            companyName: 'Företagets namn',
            companySummary: 'Jag ger gåvan som företag',
            consentPage: (path) =>
                `Jag vill ha en egen sida på adressen lavanti.fi${path}. Ditt namn och ditt meddelande sparas i webbplatsens öppna källkod. Du kan när som helst be att sidan tas bort.`,
            consentPerson: 'Namnet är mitt eget namn. Jag är myndig.',
            consentPersonCompany:
                'Namnet är mitt eget namn eller namnet på ett företag som jag får företräda. Jag är myndig.',
            consentPrint: (n) =>
                n > 1
                    ? 'Jag ger tillstånd att skriva mitt namn på Lauri Lavantis valskyltar. Jag vet att mitt namn på skyltarna visar att jag stöder hans kandidatur.'
                    : 'Jag ger tillstånd att skriva mitt namn på Lauri Lavantis valskylt. Jag vet att mitt namn på skylten visar att jag stöder hans kandidatur.',
            consentPublic: 'Mitt namn får synas i listan över skyltfaddrar på den här sidan.',
            cta: (n) => (n > 1 ? `Adoptera ${n} skyltar` : 'Adoptera en skylt'),
            email: 'E-post',
            emailHint:
                'Vi skickar en bekräftelse, hör av oss om vi har frågor om namnet och berättar när skyltarna kommer upp vid vägkanterna.',
            errors: {
                billing_address: 'Kontrollera faktureringsadressen.',
                business_id: 'Kontrollera FO-numret.',
                company_name: 'Kontrollera företagets namn.',
                consent_company: 'Bekräfta försäkran om företaget.',
                consent_person: 'Bekräfta att namnet är ditt eget och att du är myndig.',
                consent_print: 'Ditt namn kan skrivas på skylten först när du gett ditt tillstånd.',
                email: 'Kontrollera e-postadressen.',
                lomake: 'Det gick inte att skicka formuläret. Försök igen.',
                municipality: 'Välj en kommun eller "Ingen önskan".',
                palvelu:
                    'Det går inte att adoptera en skylt just nu. Försök igen om en stund eller skicka e-post till lauri@lavanti.fi.',
                quantity: 'Välj mellan 1 och 20 skyltar.',
                sign_name:
                    'Kontrollera namnet: 2 till 24 bokstäver, mellanslag, bindestreck, apostrofer eller punkter. Siffror och "&" bara i ett företagsnamn.',
                varmistus: 'Kontrollen misslyckades. Försök igen.',
            },
            liveCount: (n) => `Redan ${n} ${n === 1 ? 'skylt har' : 'skyltar har'} adopterats.`,
            liveNames: (names) => `Senast adopterade: ${names}.`,
            municipality: 'I vilken kommun vill du att din skylt ska stå?',
            municipalityHint: 'Vi tar hänsyn till din önskan, men vi kan inte lova en plats.',
            municipalityOptions: svMunicipalities,
            nameCounter: (used, max) => `${used}/${max}`,
            nameLabel: 'Namn på skylten',
            pinned: (name, n) => (n > 1 ? `Din skylt: ${name} · ${n} skyltar` : `Din skylt: ${name}`),
            price: '30 € = en skylt vid vägkanten',
            privacyHref: '/sv/dataskydd/',
            privacyLink: 'Läs integritetspolicyn.',
            quantityLabel: 'Antal skyltar',
            requiredNote: 'Fält märkta med asterisk (*) är obligatoriska.',
            revokeNote:
                'Du kan när som helst återkalla ditt tillstånd genom att svara på vårt bekräftelsemejl eller skriva till lauri@lavanti.fi. Om du återkallar tillståndet att använda ditt namn täcker vi namnet på skylten och tar bort det från webbplatsen.',
            sending: 'Skickar…',
            step2Heading: 'Bara kontaktuppgifter och tillstånd att använda ditt namn.',
            submitHint: 'Välj kommun, fyll i e-post och kryssa i de två obligatoriska rutorna för att skicka.',
            total: (euros) => `Din gåva: ${euros} €`,
        },
        join: { href: '/sv/bli-med/', label: 'lavanti.fi/sv/bli-med', lead: 'Bli med:' },
        mail: ({ company, name, quantity, ref }) => ({
            body: [
                'Hej,',
                '',
                `tack för att du adopterade ${quantity > 1 ? `${quantity} valskyltar` : 'en valskylt'}! Vi har tagit emot din gåva (${ref}), och namnet "${name}" skrivs längst ner på ${quantity > 1 ? 'skyltarna' : 'skylten'}.`,
                '',
                company ? 'Fakturan kommer till den faktureringsadress du angav.' : '',
                'Skyltarna kommer upp vid vägkanterna i Nyland i vår. Vi hör av oss när din står på plats.',
                '',
                'Du kan när som helst återkalla tillståndet att använda namnet genom att svara på det här meddelandet. Då täcker vi namnet på skylten och tar bort det från webbplatsen.',
                '',
                'Varma hälsningar',
                'Lauri Lavanti',
            ]
                .filter((line, i, all) => line !== '' || all[i - 1] !== '')
                .join('\n'),
            subject: quantity > 1 ? 'Dina skyltar är adopterade' : 'Din skylt är adopterad',
        }),
        mobilePay: {
            copied: 'Kopierat',
            copyNumber: 'Kopiera numret',
            copyRef: 'Kopiera meddelandet',
            donate: (euros) => `Ge ${euros} euro med MobilePay till nummer 46492.`,
            open: 'Öppna MobilePay',
            qrAlt: 'MobilePay-QR-kod till nummer 46492',
            refNote: (ref) => `Skriv ${ref} som meddelande, så hittar vi din gåva.`,
        },
        personal: {
            cta: 'Adoptera du också en skylt',
            description: (name) => `${name} adopterade en valskylt för Lauri Lavantis kampanj i Nyland.`,
            ogEmphasis: 'adopterade en skylt',
            pageTitle: (name) => `${name} adopterade en skylt`,
            title: (name) => `${name} adopterade en skylt`,
        },
        sign: {
            figureLabel: 'Illustration av valskylten med ditt namn längst ner',
            finePrint: 'Illustration. Den slutliga skylten kan avvika från bilden.',
            ghostName: 'Ditt namn',
        },
        thanks: {
            almost: 'Nästan klart! Din skylt väntar bara på din gåva.',
            companyInvoice:
                'Vi skickar en faktura till den faktureringsadress du angav. Fakturan har ingen moms eftersom det är en gåva.',
            donated: 'Jag gav en gåva',
            invalid: 'Länken saknar uppgifter.',
            invalidLink: 'Gå tillbaka och adoptera en skylt',
            message: {
                hint: 'Högst 140 tecken. Meddelandet syns på sidan först när vi har granskat det, och bara om du gav tillstånd att visa ditt namn.',
                label: 'Varför adopterade jag? (frivilligt)',
                save: 'Spara meddelandet',
                saved: 'Tack! Vi granskar meddelandet innan det syns.',
                tooSoon: 'Vänta en stund och försök igen.',
                unavailable: 'Det går inte att spara meddelandet just nu. Skicka e-post till lauri@lavanti.fi.',
            },
            missingName: 'Skriv namnet igen, så ser du din skylt.',
            next: 'Vi kontrollerar gåvan och skickar en bekräftelse till din e-post.',
            payer: {
                label: 'Betalarens namn, om du betalar med någon annans MobilePay',
                save: 'Spara',
                saved: 'Sparat.',
            },
            share: {
                clipboard: 'Lägg till ett länkklistermärke i din story. Adressen finns redan i urklippet.',
                cta: 'Adoptera du också: lavanti.fi/sv/adoptera',
                download: 'Ladda ner bilden',
                feed: 'Inlägg (4:5)',
                heading: 'Berätta om din skylt för dina vänner',
                headline: 'Jag adopterade Lauri Lavantis valskylt',
                imageAlt: (name) => `Delningsbild: ${name} adopterade Lauri Lavantis valskylt`,
                inApp: 'Öppna sidan i webbläsaren, så kan du spara bilden.',
                longPress: 'Tryck länge på bilden och spara den.',
                share: 'Dela bilden',
                story: 'Story (9:16)',
                text: 'Jag adopterade Lauri Lavantis valskylt, och i vår kommer den upp vid vägkanten med mitt namn. Lauri är De Grönas riksdagskandidat i Nyland. Adoptera du också: lavanti.fi/sv/adoptera',
            },
            thankYou: [
                'Tack för att du valde att stödja min riksdagsvalskampanj!',
                'Med din gåva kommer din skylt upp vid vägkanten i vår, och riksdagen kommer en bit närmare.',
                'När ekonomi, bildning och frihet fungerar tillsammans i AI-tidevarvet byggs ett digitalt självständigt Finland.',
                'Du gör det möjligt. Tack!',
            ],
        },
        wall: {
            adoptersHeading: 'Skyltfaddrar',
            count: (n) => `Redan ${n} ${n === 1 ? 'skylt har' : 'skyltar har'} adopterats.`,
            messagesHeading: 'Varför jag adopterade',
            municipalities: 'Önskade kommuner:',
            other: 'övriga kommuner',
            ownTile: (name) => `${name} (väntar på bekräftelse)`,
        },
    },
}
