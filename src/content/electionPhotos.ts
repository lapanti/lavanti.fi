import type { StripPhoto } from './photoStrips'

/**
 * Elections page "campaign life" strip, shown above the event calendar: what campaign events
 * look like. Portrait sources were pre-cropped to 4:3 (`-vaaka` slugs).
 */
export const electionPhotos: StripPhoto[] = [
    {
        alt: {
            en: 'Lauri Lavanti in a navy blazer talking with a visitor at a green market tent, a campaign flag behind him.',
            fi: 'Lauri Lavanti tummansinisessä pikkutakissa juttelee kävijän kanssa vihreän markkinateltan luona, taustalla kampanjalippu.',
            sv: 'Lauri Lavanti i marinblå kavaj pratar med en besökare vid ett grönt marknadstält, med en kampanjflagga bakom sig.',
        },
        caption: {
            en: 'Conversations at the Greens’ market tent',
            fi: 'Keskusteluja Vihreiden markkinateltalla',
            sv: 'Samtal vid De Grönas marknadstält',
        },
        slug: 'Lauri-Lavanti-vihreiden-teltalla-markkinoilla-vaaka',
        widths: [400, 800],
    },
    {
        alt: {
            en: 'Lauri Lavanti in front of Kirkkonummi town hall, rainbow flags flying on the flagpoles above him.',
            fi: 'Lauri Lavanti Kirkkonummen kunnantalon edessä, yläpuolella lipputangoissa liehuvia sateenkaarilippuja.',
            sv: 'Lauri Lavanti framför Kyrkslätts kommunhus, med regnbågsflaggor som vajar i flaggstängerna ovanför honom.',
        },
        caption: {
            en: 'Rainbow flags at Kirkkonummi town hall, summer 2026',
            fi: 'Sateenkaariliput Kirkkonummen kunnantalolla kesällä 2026',
            sv: 'Regnbågsflaggor vid Kyrkslätts kommunhus sommaren 2026',
        },
        slug: 'Lauri-Lavanti-sateenkaariliput-kunnantalolla-vaaka',
        widths: [400, 800, 1200],
    },
    {
        alt: {
            en: 'Campaign team members talking around a meeting table with laptops and papers, Lauri Lavanti standing at the back.',
            fi: 'Kampanjatiimin jäseniä keskustelee kokouspöydän ääressä kannettavien ja papereiden keskellä, Lauri Lavanti seisoo taustalla.',
            sv: 'Medlemmar av kampanjteamet samtalar runt ett mötesbord med datorer och papper, Lauri Lavanti står i bakgrunden.',
        },
        caption: {
            en: 'The campaign team’s kick-off meeting, September 2026',
            fi: 'Kampanjatiimin kick-off-tapaaminen syyskuussa 2026',
            sv: 'Kampanjteamets kick-off-träff i september 2026',
        },
        photographer: 'Erkki Laine',
        slug: 'Kampanjatiimi-kokous-2026-vaaka',
        widths: [400, 800, 1200],
    },
]
