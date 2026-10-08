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
        date: '2026-10-19',
        endTime: '11:15',
        id: 'reset-helsinki-paneeli',
        locales: {
            en: {
                description:
                    'Lauri Lavanti joins the panel "Towards greater digital independence in artistic production" at Reset! Helsinki – Reclaiming the Digital. Nitin Sawhney moderates the panel. The event is free, but advance registration is required.',
                locality: 'Helsinki',
                title: 'Towards greater digital independence in artistic production, Reset! Helsinki',
                venue: 'Oranssi ry',
            },
            fi: {
                description:
                    'Lauri Lavanti on panelistina Reset! Helsinki – Reclaiming the Digital -tapahtuman paneelissa Towards greater digital independence in artistic production. Paneelia moderoi Nitin Sawhney. Tapahtuma on maksuton, mutta siihen pitää ilmoittautua etukäteen.',
                locality: 'Helsinki',
                title: 'Paneeli digitaalisesta riippumattomuudesta, Reset! Helsinki',
                venue: 'Oranssi ry',
            },
            sv: {
                description:
                    'Lauri Lavanti deltar i panelen Towards greater digital independence in artistic production under evenemanget Reset! Helsinki – Reclaiming the Digital. Panelen modereras av Nitin Sawhney. Evenemanget är avgiftsfritt, men kräver förhandsanmälan.',
                locality: 'Helsingfors',
                title: 'Panel om digitalt oberoende, Reset! Helsinki',
                venue: 'Oranssi ry',
            },
        },
        postalCode: '00540',
        startTime: '10:15',
        streetAddress: 'Kaasutehtaankatu 1/20',
        topicConfirmed: true,
    },
    {
        date: '2026-11-30',
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
        streetAddress: 'Kirkkotori 1',
        topicConfirmed: true,
    },
    // events:end
]
