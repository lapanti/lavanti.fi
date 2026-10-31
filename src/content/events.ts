import type { Lang } from './nav'

interface CampaignEventLocale {
    /** One or two factual sentences — the card body. */
    description: string
    /** Municipality in this language; also the schema.org addressLocality. */
    locality: string
    /** The card heading, and the schema.org `name` once the topic is confirmed. */
    title: string
    /** Venue as written for readers in this language; also the schema.org Place name. */
    venue: string
}

export interface CampaignEvent {
    /** Calendar date in Europe/Helsinki, YYYY-MM-DD — sorted and compared as a plain string. */
    date: string
    /** 'HH:MM', omitted together with startTime while the schedule is open. */
    endTime?: string
    /**
     * The event's Facebook page, where people RSVP and get reminders. Optional: the
     * card stays complete without it. Rendered as a link on the card and as the
     * Event JSON-LD `sameAs`.
     */
    fbUrl?: string
    /** Stable key for the rendered list, and the marker the nightly expiry check greps for. */
    id: string
    locales: Record<Lang, CampaignEventLocale>
    postalCode: string
    /** 'HH:MM' local time. Omitted until the time is agreed; the card then shows the date alone. */
    startTime?: string
    /**
     * Finnish street name in every locale: it is the form Posti routes on, and it
     * appears only in structured data, never on the page. Move into the locale object
     * if the Swedish street forms are ever wanted in the sv JSON-LD.
     */
    streetAddress: string
    /**
     * False while the subject of the event is still open: the card shows a
     * topic-pending line, and Head leaves the event out of the Event JSON-LD —
     * structured data should not announce a programme that does not exist yet.
     */
    topicConfirmed: boolean
}

/**
 * Campaign events, soonest first — the order they render in.
 *
 * Events whose date has passed are dropped at build time (see filterUpcoming in
 * src/lib/events.ts), and the nightly scheduled-publish workflow redeploys the site
 * so the removal actually reaches production.
 */
export const campaignEvents: CampaignEvent[] = [
    // events:start
    {
        date: '2026-11-22',
        endTime: '16:00',
        id: 'kampanjatiimin-avoin-tilaisuus',
        locales: {
            en: {
                description:
                    "Have you wondered what campaigns are really about? Now you can have a say. At the campaign team's open meeting you can give your views on the campaign programme, meaning what the campaign talks about. We will also go through the important dates and what campaigning means in practice. Welcome!",
                locality: 'Espoo',
                title: 'Open campaign team meeting',
                venue: 'Entresse Library, Blue room',
            },
            fi: {
                description:
                    'Oletko miettinyt, mistä kampanjoissa oikein on kyse? Nyt pääset vaikuttamaan. Kampanjatiimin avoimessa tapaamisessa voit sanoa sanasi kampanjaohjelmasta eli siitä, mistä kampanja puhuu. Lisäksi käymme läpi tärkeät päivämäärät ja sen, mitä kampanjointi käytännössä tarkoittaa. Tervetuloa mukaan!',
                locality: 'Espoo',
                title: 'Kampanjatiimin avoin tapaaminen',
                venue: 'Entressen kirjasto, Blue room',
            },
            sv: {
                description:
                    'Har du undrat vad en kampanj egentligen går ut på? Nu kan du påverka. På kampanjteamets öppna träff kan du säga din åsikt om kampanjens program, alltså vad kampanjen handlar om. Dessutom går vi igenom viktiga datum och vad kampanjarbete innebär i praktiken. Välkommen med!',
                locality: 'Esbo',
                title: 'Kampanjteamets öppna träff',
                venue: 'Entresse bibliotek, Blue room',
            },
        },
        postalCode: '02770',
        startTime: '14:00',
        streetAddress: 'Siltakatu 11',
        topicConfirmed: false,
    },
    {
        date: '2026-11-30',
        endTime: '19:30',
        fbUrl: 'https://fb.me/e/4WfF0fkf3',
        id: 'fyyri-morne',
        locales: {
            en: {
                description:
                    'What should happen to Keskusmetsä (the central forest) in Kirkkonummi? The "How are you, Kirkkonummi?" discussion series from Kirkkonummen Vihreät continues with a panel discussion on the development of the central forest. The discussion will be moderated by Lauri Lavanti, chair of the Green group on Kirkkonummi municipal council and parliamentary candidate. The panellists will be announced later. Come to listen, to ask questions and to share your own views. The event is open to all and free of charge.',
                locality: 'Kirkkonummi',
                title: 'How are you, Kirkkonummi? The development of the central forest',
                venue: 'Fyyri library, Mörne hall',
            },
            fi: {
                description:
                    'Mitä Kirkkonummen Keskusmetsälle pitäisi tapahtua? Kirkkonummen Vihreiden Mitä kuuluu Kirkkonummi? -keskustelusarja jatkuu paneelikeskustelulla Keskusmetsän kehityksestä. Keskustelun moderoi Lauri Lavanti, Kirkkonummen Vihreän valtuustoryhmän puheenjohtaja ja eduskuntavaaliehdokas. Keskustelijat julkaistaan myöhemmin. Tule kuuntelemaan, kysymään ja kertomaan oma näkemyksesi. Tilaisuus on avoin kaikille ja maksuton.',
                locality: 'Kirkkonummi',
                title: 'Mitä kuuluu Kirkkonummi? Keskusmetsän kehitys',
                venue: 'Kirjastotalo Fyyri, Mörne-sali',
            },
            sv: {
                description:
                    'Vad borde hända med Centralskogen i Kyrkslätt? Diskussionsserien Hur mår Kyrkslätt? som De Gröna i Kyrkslätt ordnar fortsätter med ett panelsamtal om utvecklingen av Centralskogen. Samtalet modereras av Lauri Lavanti, ordförande för De Grönas fullmäktigegrupp i Kyrkslätt och riksdagskandidat. Panelisterna presenteras senare. Kom och lyssna, ställ frågor och berätta din egen syn. Evenemanget är öppet för alla och avgiftsfritt.',
                locality: 'Kyrkslätt',
                title: 'Hur mår Kyrkslätt? Utvecklingen av Centralskogen',
                venue: 'Bibliotekshuset Fyyri, Mörnesalen',
            },
        },
        postalCode: '02400',
        startTime: '18:00',
        streetAddress: 'Kirkkotori 1',
        topicConfirmed: true,
    },
    // events:end
]
