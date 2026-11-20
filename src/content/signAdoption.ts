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

/** 25 → "25", 27.5 → "27,50" in fi-FI or "27.50" in en-GB: cents only when there are any. */
const formatEuros = (euros: number, locale: 'en-GB' | 'fi-FI' | 'sv-FI'): string =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: Number.isInteger(euros) ? 0 : 2 }).format(euros)

interface SignText {
    firstName: string
    lastName: string
    payer: string
    /** The label over the name in the round sticker, two lines so it fits the circle. */
    sticker: readonly [string, string]
    tagline: string
}

const FI_SIGN_TEXT: SignText = {
    firstName: 'Lauri',
    lastName: 'Lavanti',
    payer: 'Mainoksen maksaja: Digitaalisen itsenäisyyden puolesta ry',
    sticker: ['Tämän kyltin', 'adoptoi'],
    tagline: 'Eduskuntavaalit 2027 · Uusimaa',
}

/**
 * Text on the sign graphic and the share images. The Swedish page shows a Swedish sign; the
 * English page shows the Finnish one, since there is no English sign, with the sticker label
 * in English so the reader knows what the name means.
 */
export const SIGN_TEXT: Record<Lang, SignText> = {
    en: { ...FI_SIGN_TEXT, sticker: ['This sign was', 'adopted by'] },
    fi: FI_SIGN_TEXT,
    sv: {
        firstName: 'Lauri',
        lastName: 'Lavanti',
        payer: 'Annonsens betalare: Digitaalisen itsenäisyyden puolesta ry',
        sticker: ['Den här skylten', 'adopterades av'],
        tagline: 'Riksdagsvalet 2027 · Nyland',
    },
}

export const MOBILEPAY_NUMBER = '46492'
/** The support association's account, for donors without MobilePay. */
export const ASSOCIATION_NAME = 'Digitaalisen itsenäisyyden puolesta ry'
export const ASSOCIATION_IBAN = 'FI61 5780 3820 2478 06'
/** Title of the invoice sent to a company; the owner copies it from `npm run adoptions`. */
export const INVOICE_TITLE = 'Lahjoitus vaalikeräykseen (Adoptoi kyltti)'

interface MailInput {
    company: boolean
    /** Null for a donation without a name on the sign. */
    name: null | string
    quantity: number
    ref: string
}

interface AdoptionLocale {
    form: {
        /** Always visible under the total: who receives the donation, with a finance page link. */
        association: { href: string; link: string; text: string }
        back: string
        billingAddress: string
        businessId: string
        chip: (n: number, euros: number) => string
        /** The badge on the package the page points to. */
        chipFeatured: string
        /** The per-sign price under a multi-sign package. */
        chipPerSign: (euros: number) => string
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
        /** Above the submit button: what happens after sending. */
        nextStep: (euros: number) => string
        nextStepCompany: (euros: number) => string
        pinned: (name: string, n: number, euros: number) => string
        pinnedUnnamed: (n: number, euros: number) => string
        price: string
        privacyHref: string
        privacyLink: string
        requiredNote: string
        revokeNote: string
        sending: string
        step2Heading: string
        step2HeadingUnnamed: string
        submitHint: string
        submitHintUnnamed: string
        total: (euros: number) => string
        /** The opt-out under the name field, and one sentence saying signs can be supported without a name. */
        unnamed: { hint: string; label: string }
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
        /** First heading on the thanks page; the amount follows the sign count. */
        almost: (euros: number) => string
        companyInvoice: string
        donated: string
        /** For a donor without MobilePay: a bank transfer to the association, ref as the message. */
        fallback: { lead: string; message: string; recipient: string }
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
            /** A donation without a name on the sign: no sticker, so no "my name" wording. */
            unnamed: { headline: string; imageAlt: string; text: string }
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
            association: {
                href: '/en/elections/campaign-finance/',
                link: 'Read how my campaign is funded.',
                text: 'Digitaalisen itsenäisyyden puolesta ry is my support association, which runs the fundraiser and pays for the signs.',
            },
            back: 'Change the name or number',
            billingAddress: 'Billing address (email or e-invoice address)',
            businessId: 'Business ID (Y-tunnus)',
            chip: (n, euros) => `${n} ${n === 1 ? 'sign' : 'signs'} · €${euros}`,
            chipFeatured: 'Most popular',
            chipPerSign: (euros) => `€${formatEuros(euros, 'en-GB')} per sign`,
            chipsLegend: 'How many signs will you adopt?',
            companyDeclaration:
                'The company is Finnish and is not a public body or controlled by the state, a municipality or a wellbeing services county.',
            companyName: 'Company name',
            companySummary: 'I am donating as a company',
            consentPage: (path) =>
                `I want my own page at lavanti.fi${path}. The page is public, and your name and message stay in the site's public change history even if the page is removed. You can ask for the page to be removed at any time.`,
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
                quantity: 'Choose a sign package.',
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
            nextStep: (euros) =>
                `Next, you donate €${euros} with MobilePay and get a reference code to write as the message.`,
            nextStepCompany: (euros) => `Next, we send an invoice for €${euros} to the billing address you gave.`,
            pinned: (name, n, euros) =>
                n > 1 ? `Your sign: ${name} · ${n} signs · €${euros}` : `Your sign: ${name} · €30`,
            pinnedUnnamed: (n, euros) =>
                n > 1 ? `Your signs without a name · ${n} signs · €${euros}` : 'Your sign without a name · €30',
            price: '€30 = one sign by the roadside',
            privacyHref: '/en/privacy-policy/',
            privacyLink: 'Read the privacy policy.',
            requiredNote: 'Fields marked with an asterisk (*) are required.',
            revokeNote:
                'You can withdraw your permission at any time by replying to our confirmation email or writing to lauri@lavanti.fi. If you withdraw permission to use your name, we cover the name on the sign and remove it from the website.',
            sending: 'Sending…',
            step2Heading: 'Just your contact details and permission to use your name.',
            step2HeadingUnnamed: 'Just your contact details.',
            submitHint: 'Fill in the name, municipality and email and tick the two required boxes to send.',
            submitHintUnnamed: 'Choose a municipality and fill in your email to send.',
            total: (euros) => `Your donation: €${euros}`,
            unnamed: {
                hint: 'You can also support signs without your name on them.',
                label: "I don't want my name on the sign",
            },
        },
        join: { href: '/en/join/', label: 'lavanti.fi/en/join', lead: 'Join in:' },
        mail: ({ company, name, quantity, ref }) => ({
            body: [
                'Hello,',
                '',
                name === null
                    ? `thank you for supporting ${quantity > 1 ? `${quantity} election signs` : 'an election sign'}! We have received your donation (${ref}). As you wished, your name does not go on ${quantity > 1 ? 'the signs' : 'the sign'}.`
                    : `thank you for adopting ${quantity > 1 ? `${quantity} election signs` : 'an election sign'}! We have received your donation (${ref}), and the name "${name}" will go on ${quantity > 1 ? 'a round sticker on each sign' : 'a round sticker on the sign'}.`,
                '',
                company ? 'The invoice is on its way to the billing address you gave.' : '',
                'The signs go up by the roadsides of Uusimaa in spring. We will let you know when yours is out.',
                '',
                name === null
                    ? ''
                    : 'You can withdraw your permission to use the name at any time by replying to this message. We then cover the name on the sign and remove it from the website.',
                '',
                'Best wishes,',
                'Lauri Lavanti',
            ]
                .filter((line, i, all) => line !== '' || all[i - 1] !== '')
                .join('\n'),
            subject:
                name === null
                    ? 'Thank you for supporting the signs'
                    : quantity > 1
                      ? 'Your signs are adopted'
                      : 'Your sign is adopted',
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
            figureLabel: 'Illustration of the election sign with your name on a round sticker',
            finePrint: 'Illustration. The final sign may differ from the picture.',
            ghostName: 'Your name',
        },
        thanks: {
            almost: (euros) => `Almost done: donate €${euros} with MobilePay`,
            companyInvoice:
                'We will send an invoice to the billing address you gave. The invoice has no VAT because this is a donation.',
            donated: 'I donated',
            fallback: {
                lead: 'No MobilePay? Make a bank transfer:',
                message: 'Message: your reference code, so we can match the donation to your sign.',
                recipient: 'Recipient',
            },
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
                unnamed: {
                    headline: "I supported Lauri Lavanti's election signs",
                    imageAlt: "Share image: I supported Lauri Lavanti's election signs",
                    text: "I supported Lauri Lavanti's election signs, and in spring they go up by the roadside. Lauri is the Greens' parliamentary candidate in Uusimaa. Adopt one too: lavanti.fi/en/adopt",
                },
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
            association: {
                href: '/fi/eduskuntavaalit/vaalirahoitus/',
                link: 'Lue, miten kampanjani rahoitetaan.',
                text: 'Digitaalisen itsenäisyyden puolesta ry on tukiyhdistykseni, joka järjestää vaalikeräyksen ja maksaa kyltit.',
            },
            back: 'Muuta nimeä tai määrää',
            billingAddress: 'Laskutusosoite (sähköposti tai verkkolaskuosoite)',
            businessId: 'Y-tunnus',
            chip: (n, euros) => `${n} ${n === 1 ? 'kyltti' : 'kylttiä'} · ${euros} €`,
            chipFeatured: 'Suosituin',
            chipPerSign: (euros) => `${formatEuros(euros, 'fi-FI')} €/kyltti`,
            chipsLegend: 'Montako kylttiä adoptoit?',
            companyDeclaration:
                'Yritys on suomalainen, eikä se ole julkisyhteisö tai valtion, kunnan tai hyvinvointialueen määräysvallassa.',
            companyName: 'Yrityksen nimi',
            companySummary: 'Lahjoitan yrityksenä',
            consentPage: (path) =>
                `Haluan oman sivun osoitteeseen lavanti.fi${path}. Sivu on julkinen, ja nimesi ja viestisi jäävät sivuston julkiseen muutoshistoriaan myös, jos sivu poistetaan. Voit pyytää sivun poistamista milloin tahansa.`,
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
                quantity: 'Valitse kylttipaketti.',
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
            nextStep: (euros) =>
                `Seuraavaksi lahjoitat ${euros} € MobilePayllä ja saat viitekoodin, jonka kirjoitat viestiksi.`,
            nextStepCompany: (euros) => `Seuraavaksi lähetämme ${euros} euron laskun antamaasi laskutusosoitteeseen.`,
            pinned: (name, n, euros) =>
                n > 1 ? `Kylttisi: ${name} · ${n} kylttiä · ${euros} €` : `Kylttisi: ${name} · 30 €`,
            pinnedUnnamed: (n, euros) =>
                n > 1 ? `Kylttisi ilman nimeä · ${n} kylttiä · ${euros} €` : 'Kylttisi ilman nimeä · 30 €',
            price: '30 € = yksi kyltti tienvarteen',
            privacyHref: '/fi/tietosuoja/',
            privacyLink: 'Lue tietosuojaseloste.',
            requiredNote: 'Tähdellä (*) merkityt kohdat ovat pakollisia.',
            revokeNote:
                'Voit perua luvan milloin tahansa vastaamalla vahvistusviestiimme tai kirjoittamalla osoitteeseen lauri@lavanti.fi. Jos perut luvan nimen käyttöön, peitämme nimen kyltistä ja poistamme sen sivustolta.',
            sending: 'Lähetetään…',
            step2Heading: 'Vielä yhteystieto ja lupa nimen käyttöön.',
            step2HeadingUnnamed: 'Vielä yhteystietosi.',
            submitHint: 'Valitse kunta, täytä sähköposti ja rastita kaksi pakollista kohtaa, niin voit lähettää.',
            submitHintUnnamed: 'Valitse kunta ja täytä sähköposti, niin voit lähettää.',
            total: (euros) => `Lahjoituksesi: ${euros} €`,
            unnamed: {
                hint: 'Voit tukea kylttejä myös ilman, että nimesi tulee niihin.',
                label: 'En halua nimeäni kylttiin',
            },
        },
        join: { href: '/fi/liity/', label: 'lavanti.fi/liity', lead: 'Liity mukaan:' },
        mail: ({ company, name, quantity, ref }) => ({
            body: [
                'Hei,',
                '',
                name === null
                    ? `kiitos, että tuet ${quantity > 1 ? `${quantity} vaalikylttiä` : 'vaalikylttiä'}! Lahjoituksesi (${ref}) on vastaanotettu. Toiveesi mukaan nimesi ei tule ${quantity > 1 ? 'kyltteihin' : 'kylttiin'}.`
                    : `kiitos, että adoptoit ${quantity > 1 ? `${quantity} vaalikylttiä` : 'vaalikyltin'}! Lahjoituksesi (${ref}) on vastaanotettu, ja nimi "${name}" tulee ${quantity > 1 ? 'jokaiseen kylttiin' : 'kylttiin'} pyöreään tarraan.`,
                '',
                company ? 'Lasku on tulossa antamaasi laskutusosoitteeseen.' : '',
                'Kyltit nousevat Uudenmaan tienvarsille keväällä. Kerromme, kun omasi on paikallaan.',
                '',
                name === null
                    ? ''
                    : 'Voit perua luvan nimen käyttöön milloin tahansa vastaamalla tähän viestiin. Silloin peitämme nimen kyltistä ja poistamme sen sivustolta.',
                '',
                'Lämpimin terveisin',
                'Lauri Lavanti',
            ]
                .filter((line, i, all) => line !== '' || all[i - 1] !== '')
                .join('\n'),
            // "Kylttisi" reads as one sign or several, so one subject fits both.
            subject: name === null ? 'Kiitos, että tuet kylttejä' : 'Kylttisi on adoptoitu',
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
            figureLabel: 'Havainnekuva vaalikyltistä, jonka pyöreässä tarrassa on nimesi',
            finePrint: 'Havainnekuva. Lopullinen kyltti voi poiketa kuvasta.',
            ghostName: 'Sinun nimesi',
        },
        thanks: {
            almost: (euros) => `Melkein valmis: lahjoita ${euros} € MobilePayllä`,
            companyInvoice:
                'Lähetämme laskun antamaasi laskutusosoitteeseen. Laskussa ei ole arvonlisäveroa, koska kyse on lahjoituksesta.',
            donated: 'Lahjoitin',
            fallback: {
                lead: 'Eikö sinulla ole MobilePayta? Tee tilisiirto:',
                message: 'Viesti: viitekoodisi, niin yhdistämme lahjoituksen kylttiisi.',
                recipient: 'Saaja',
            },
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
                unnamed: {
                    headline: 'Tuin Lauri Lavannin vaalikylttejä',
                    imageAlt: 'Jakokuva: Tuin Lauri Lavannin vaalikylttejä',
                    text: 'Tuin Lauri Lavannin vaalikylttejä, ja keväällä ne nousevat tienvarsille. Lauri on Vihreiden eduskuntavaaliehdokas Uudellamaalla. Adoptoi sinäkin: lavanti.fi/adoptoi',
                },
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
            association: {
                href: '/sv/riksdagsvalet/valfinansiering/',
                link: 'Läs hur min kampanj finansieras.',
                text: 'Digitaalisen itsenäisyyden puolesta ry är min stödförening, som ordnar valinsamlingen och betalar skyltarna.',
            },
            back: 'Ändra namnet eller antalet',
            billingAddress: 'Faktureringsadress (e-post eller e-fakturaadress)',
            businessId: 'FO-nummer',
            chip: (n, euros) => `${n} ${n === 1 ? 'skylt' : 'skyltar'} · ${euros} €`,
            chipFeatured: 'Populärast',
            chipPerSign: (euros) => `${formatEuros(euros, 'sv-FI')} €/skylt`,
            chipsLegend: 'Hur många skyltar adopterar du?',
            companyDeclaration:
                'Företaget är finländskt och är inte ett offentligt samfund eller under bestämmande inflytande av staten, en kommun eller ett välfärdsområde.',
            companyName: 'Företagets namn',
            companySummary: 'Jag ger gåvan som företag',
            consentPage: (path) =>
                `Jag vill ha en egen sida på adressen lavanti.fi${path}. Sidan är offentlig, och ditt namn och ditt meddelande finns kvar i webbplatsens offentliga ändringshistorik även om sidan tas bort. Du kan när som helst be att sidan tas bort.`,
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
                quantity: 'Välj ett skyltpaket.',
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
            nextStep: (euros) =>
                `Härnäst ger du ${euros} € med MobilePay och får en referenskod som du skriver som meddelande.`,
            nextStepCompany: (euros) =>
                `Härnäst skickar vi en faktura på ${euros} € till den faktureringsadress du angav.`,
            pinned: (name, n, euros) =>
                n > 1 ? `Din skylt: ${name} · ${n} skyltar · ${euros} €` : `Din skylt: ${name} · 30 €`,
            pinnedUnnamed: (n, euros) =>
                n > 1 ? `Dina skyltar utan namn · ${n} skyltar · ${euros} €` : 'Din skylt utan namn · 30 €',
            price: '30 € = en skylt vid vägkanten',
            privacyHref: '/sv/dataskydd/',
            privacyLink: 'Läs integritetspolicyn.',
            requiredNote: 'Fält märkta med asterisk (*) är obligatoriska.',
            revokeNote:
                'Du kan när som helst återkalla ditt tillstånd genom att svara på vårt bekräftelsemejl eller skriva till lauri@lavanti.fi. Om du återkallar tillståndet att använda ditt namn täcker vi namnet på skylten och tar bort det från webbplatsen.',
            sending: 'Skickar…',
            step2Heading: 'Bara kontaktuppgifter och tillstånd att använda ditt namn.',
            step2HeadingUnnamed: 'Bara dina kontaktuppgifter.',
            submitHint: 'Välj kommun, fyll i e-post och kryssa i de två obligatoriska rutorna för att skicka.',
            submitHintUnnamed: 'Välj kommun och fyll i e-post för att skicka.',
            total: (euros) => `Din gåva: ${euros} €`,
            unnamed: {
                hint: 'Du kan också stödja skyltar utan att ditt namn kommer på dem.',
                label: 'Jag vill inte ha mitt namn på skylten',
            },
        },
        join: { href: '/sv/bli-med/', label: 'lavanti.fi/sv/bli-med', lead: 'Bli med:' },
        mail: ({ company, name, quantity, ref }) => ({
            body: [
                'Hej,',
                '',
                name === null
                    ? `tack för att du stöder ${quantity > 1 ? `${quantity} valskyltar` : 'en valskylt'}! Vi har tagit emot din gåva (${ref}). Som du önskade kommer ditt namn inte på ${quantity > 1 ? 'skyltarna' : 'skylten'}.`
                    : `tack för att du adopterade ${quantity > 1 ? `${quantity} valskyltar` : 'en valskylt'}! Vi har tagit emot din gåva (${ref}), och namnet "${name}" hamnar på en rund dekal på ${quantity > 1 ? 'varje skylt' : 'skylten'}.`,
                '',
                company ? 'Fakturan kommer till den faktureringsadress du angav.' : '',
                'Skyltarna kommer upp vid vägkanterna i Nyland i vår. Vi hör av oss när din står på plats.',
                '',
                name === null
                    ? ''
                    : 'Du kan när som helst återkalla tillståndet att använda namnet genom att svara på det här meddelandet. Då täcker vi namnet på skylten och tar bort det från webbplatsen.',
                '',
                'Varma hälsningar',
                'Lauri Lavanti',
            ]
                .filter((line, i, all) => line !== '' || all[i - 1] !== '')
                .join('\n'),
            subject:
                name === null
                    ? 'Tack för att du stöder skyltarna'
                    : quantity > 1
                      ? 'Dina skyltar är adopterade'
                      : 'Din skylt är adopterad',
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
            figureLabel: 'Illustration av valskylten med ditt namn på en rund dekal',
            finePrint: 'Illustration. Den slutliga skylten kan avvika från bilden.',
            ghostName: 'Ditt namn',
        },
        thanks: {
            almost: (euros) => `Nästan klart: ge ${euros} € med MobilePay`,
            companyInvoice:
                'Vi skickar en faktura till den faktureringsadress du angav. Fakturan har ingen moms eftersom det är en gåva.',
            donated: 'Jag gav en gåva',
            fallback: {
                lead: 'Har du inte MobilePay? Gör en banköverföring:',
                message: 'Meddelande: din referenskod, så kopplar vi gåvan till din skylt.',
                recipient: 'Mottagare',
            },
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
                unnamed: {
                    headline: 'Jag stödde Lauri Lavantis valskyltar',
                    imageAlt: 'Delningsbild: Jag stödde Lauri Lavantis valskyltar',
                    text: 'Jag stödde Lauri Lavantis valskyltar, och i vår kommer de upp vid vägkanterna. Lauri är De Grönas riksdagskandidat i Nyland. Adoptera du också: lavanti.fi/sv/adoptera',
                },
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
