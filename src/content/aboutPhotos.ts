import type { StripPhoto } from './photoStrips'

export type AboutPhotoSection = 'leisure' | 'politics' | 'roots'

export type TimelinePhoto = StripPhoto & {
    /** Which of the three about-page strips the photo belongs to. */
    section: AboutPhotoSection
    /** Year the photo was taken; every caption starts with it. */
    year: number
}

/**
 * About page photo strips: twelve photos from childhood to the 2026 party congress, in
 * chronological order, shown as three thematic strips (roots, politics, leisure) at the matching
 * seams of the page. Portrait sources were pre-cropped to 4:3 (`-vaaka` slugs).
 */
export const aboutPhotos: TimelinePhoto[] = [
    {
        alt: {
            en: 'A boy in a red life vest sitting in a boat, looking out over a calm sea with a wooded shore behind.',
            fi: 'Poika punaisessa pelastusliivissä istuu veneessä ja katsoo tyyntä merta, taustalla metsäinen ranta.',
            sv: 'En pojke i röd flytväst sitter i en båt och ser ut över ett stilla hav, med en skogsklädd strand bakom.',
        },
        caption: {
            en: '2005 – On the way to the island cottage',
            fi: '2005 – Matkalla saareen mökille',
            sv: '2005 – På väg till stugan på ön',
        },
        section: 'roots',
        slug: 'Lauri-Lavanti-veneessa-2005',
        widths: [400, 800],
        year: 2005,
    },
    {
        alt: {
            en: 'A teenager with long hair playing a bass guitar alone on a dark stage, a music stand beside him.',
            fi: 'Pitkähiuksinen teini soittaa bassoa yksin pimeällä lavalla, vieressä nuottiteline.',
            sv: 'En tonåring med långt hår spelar basgitarr ensam på en mörk scen, med ett notställ bredvid.',
        },
        caption: {
            en: '2007 – Playing bass in a band',
            fi: '2007 – Basistina bändissä',
            sv: '2007 – Basist i ett band',
        },
        section: 'roots',
        slug: 'Lauri-Lavanti-basisti-2007-vaaka',
        widths: [400, 800, 1200],
        year: 2007,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a white student cap and a grey suit, smiling under a striped awning on graduation day.',
            fi: 'Lauri Lavanti valkoisessa ylioppilaslakissa ja harmaassa puvussa hymyilee raidallisen markiisin alla lakkiaispäivänä.',
            sv: 'Lauri Lavanti i vit studentmössa och grå kostym ler under en randig markis på studentdagen.',
        },
        caption: {
            en: '2011 – Graduation',
            fi: '2011 – Ylioppilas',
            sv: '2011 – Student',
        },
        section: 'roots',
        slug: 'Lauri-Lavanti-ylioppilas-2011',
        widths: [400, 800, 1200],
        year: 2011,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a green beret and camouflage uniform in front of a red-brick barracks wall.',
            fi: 'Lauri Lavanti vihreässä baskerissa ja maastopuvussa punatiilisen kasarmin seinän edessä.',
            sv: 'Lauri Lavanti i grön basker och kamouflageuniform framför en kasernvägg i rött tegel.',
        },
        caption: {
            en: '2011 – Military service',
            fi: '2011 – Varusmiespalvelus',
            sv: '2011 – Värnplikt',
        },
        section: 'roots',
        slug: 'Lauri-Lavanti-varusmies-2011-vaaka',
        widths: [400, 800, 1200],
        year: 2011,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a tasselled student cap and a green student overall covered in patches, in a garden at Wappu.',
            fi: 'Lauri Lavanti tupsulakissa ja haalarimerkkien peittämissä vihreissä opiskelijahaalareissa pihalla wappuna.',
            sv: 'Lauri Lavanti i teknologmössa och grön studentoverall full av märken, på en gård under valborg.',
        },
        caption: {
            en: '2015 – On the board of Athene, the information networks guild, in charge of international students',
            fi: '2015 – Athenen (informaatioverkostojen kilta) hallituksessa vastasin ulkomaalaisista opiskelijoista',
            sv: '2015 – I styrelsen för Athene, informationsnätverkens gille, med ansvar för utländska studerande',
        },
        section: 'leisure',
        slug: 'Lauri-Lavanti-athenen-hallituksessa-2015-vaaka',
        widths: [400, 800, 1200],
        year: 2015,
    },
    {
        alt: {
            en: 'Lauri Lavanti with eye black and a backwards cap, hugging an American football against his chest.',
            fi: 'Lauri Lavanti silmämustalla ja lippis takaperin, amerikkalainen jalkapallo rintaa vasten.',
            sv: 'Lauri Lavanti med svart under ögonen och keps bakochfram, kramar en amerikansk fotboll mot bröstet.',
        },
        caption: {
            en: '2015 – American football',
            fi: '2015 – Amerikkalainen jalkapallo',
            sv: '2015 – Amerikansk fotboll',
        },
        section: 'leisure',
        slug: 'Lauri-Lavanti-jenkkifutis-2015-vaaka',
        widths: [400, 800, 1200],
        year: 2015,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a navy number 54 jersey and helmet running onto the field, cheerleaders blurred behind him.',
            fi: 'Lauri Lavanti tummansinisessä pelipaidassa numero 54 ja kypärässä juoksee kentälle, taustalla cheerleadereita.',
            sv: 'Lauri Lavanti i marinblå tröja med nummer 54 och hjälm springer in på planen, med cheerleaders suddigt bakom.',
        },
        caption: {
            en: '2015 – Finland student national team, Finland–Japan',
            fi: '2015 – Opiskelijamaajoukkueessa, Suomi–Japani',
            sv: '2015 – I studentlandslaget, Finland–Japan',
        },
        photographer: 'Jari Turunen',
        section: 'leisure',
        slug: 'Lauri-Lavanti-maajoukkue-Suomi-Japani-2015-vaaka',
        widths: [400],
        year: 2015,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a green jacket bending over a small child in a yellow overall and helmet on a balance bike in a yard.',
            fi: 'Lauri Lavanti vihreässä takissa kumartuu pienen keltahaalarisen ja kypäräpäisen lapsen puoleen potkupyörällä pihalla.',
            sv: 'Lauri Lavanti i grön jacka böjer sig över ett litet barn i gul overall och hjälm på en springcykel på en gård.',
        },
        caption: {
            en: '2020 – First balance-bike lessons',
            fi: '2020 – Potkupyöräharjoituksia esikoisen kanssa',
            sv: '2020 – Springcykelövningar med äldsta barnet',
        },
        section: 'leisure',
        slug: 'Lauri-Lavanti-ja-esikoinen-potkupyoralla-2020-vaaka',
        widths: [400, 800, 1200],
        year: 2020,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a light t-shirt with arms crossed, smiling in an autumn birch and spruce forest.',
            fi: 'Lauri Lavanti vaaleassa t-paidassa kädet puuskassa hymyilee syksyisessä koivu- ja kuusimetsässä.',
            sv: 'Lauri Lavanti i ljus t-shirt med armarna i kors ler i en höstlig björk- och granskog.',
        },
        caption: {
            en: '2021 – Running for the first time in the municipal elections',
            fi: '2021 – Ensimmäistä kertaa ehdolla kuntavaaleissa',
            sv: '2021 – Kandiderar för första gången i kommunalvalet',
        },
        section: 'politics',
        slug: 'Lauri-Lavanti-metsassa-2021',
        widths: [400, 800, 1200],
        year: 2021,
    },
    {
        alt: {
            en: 'Close-up of Lauri Lavanti in a cap in front of the Kirkkonummi town hall sign.',
            fi: 'Lähikuva Lauri Lavannista lippis päässä Kirkkonummen kunnantalon kyltin edessä.',
            sv: 'Närbild på Lauri Lavanti i keps framför Kyrkslätts kommunhus skylt.',
        },
        caption: {
            en: '2021 – On the way to a social services committee meeting',
            fi: '2021 – Matkalla perusturvajaoston kokoukseen',
            sv: '2021 – På väg till grundtrygghetssektionens möte',
        },
        section: 'politics',
        slug: 'lauri-lavanti-perusturvajaosto-vaaka',
        widths: [400, 800, 1200],
        year: 2021,
    },
    {
        alt: {
            en: 'Lauri Lavanti in a dark jacket standing in a green field with autumn trees behind him.',
            fi: 'Lauri Lavanti tummassa takissa seisoo vihreällä pellolla, taustalla syksyisiä puita.',
            sv: 'Lauri Lavanti i mörk jacka står på en grön åker med höstträd bakom sig.',
        },
        caption: {
            en: '2022 – Running in the first county elections',
            fi: '2022 – Ehdolla ensimmäisissä aluevaaleissa',
            sv: '2022 – Kandidat i det första välfärdsområdesvalet',
        },
        section: 'politics',
        slug: 'Lauri-Lavanti-aluevaaliehdokas-pellolla',
        widths: [400, 800, 1200],
        year: 2022,
    },
    {
        alt: {
            en: 'A sports hall set up as a party congress: rows of delegate tables, a stage with a large screen and green decorations.',
            fi: 'Urheiluhalli puoluekokouskäytössä: rivejä edustajien pöytiä, lava suurine näyttöineen ja vihreitä koristeita.',
            sv: 'En idrottshall uppställd för partikongress: rader av delegatbord, en scen med stor skärm och gröna dekorationer.',
        },
        caption: {
            en: '2026 – Party congress in Turku',
            fi: '2026 – Puoluekokous Turussa',
            sv: '2026 – Partikongressen i Åbo',
        },
        section: 'politics',
        slug: 'vihreiden-puoluekokous-Turussa-2026',
        widths: [400, 800, 1200],
        year: 2026,
    },
]

/** The twelve photos split by strip, each in chronological order. */
export const aboutPhotosBySection: Record<AboutPhotoSection, TimelinePhoto[]> = {
    leisure: aboutPhotos.filter(({ section }) => section === 'leisure'),
    politics: aboutPhotos.filter(({ section }) => section === 'politics'),
    roots: aboutPhotos.filter(({ section }) => section === 'roots'),
}
