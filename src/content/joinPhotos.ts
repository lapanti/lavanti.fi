import type { Lang } from './nav'

export interface StripPhoto {
    /** Localised description of the scene. */
    alt: Record<Lang, string>
    /** Localised visible caption. Activity first; never anyone's party background. */
    caption: Record<Lang, string>
    /** Omit when no credit applies (a team member's own photo). */
    photographer?: string
    /** Cloudflare Images slug. The original lives in src/images/originals/{slug}.jpg. */
    slug: string
    /** Srcset widths; none may exceed the original's pixel width. */
    widths: number[]
}

/**
 * Join page photo strip: the campaign team and the candidate at work, shown
 * above the volunteer form. The two team photos are from the September 2026
 * kick-off session; the market photo is a team member's own.
 */
export const joinPhotos: StripPhoto[] = [
    {
        alt: {
            en: 'Ten members of the campaign team standing together in front of a campaign beach flag, Lauri Lavanti in the middle.',
            fi: 'Kymmenen kampanjatiimin jäsentä seisoo yhdessä kampanjan beach flag -lipun edessä, Lauri Lavanti keskellä.',
            sv: 'Tio medlemmar av kampanjteamet står tillsammans framför en beach flag för kampanjen, Lauri Lavanti i mitten.',
        },
        caption: {
            en: 'The campaign team at the kick-off session, September 2026.',
            fi: 'Kampanjatiimi kick-off-tapaamisessa syyskuussa 2026.',
            sv: 'Kampanjteamet på kick-off-träffen i september 2026.',
        },
        photographer: 'Erkki Laine',
        slug: 'Kampanjatiimi-ryhmakuva-2026',
        widths: [400, 800, 1200],
    },
    {
        alt: {
            en: 'Four campaign team members in discussion around a meeting table, with handwritten flip-chart sheets on the wall behind them.',
            fi: 'Neljä kampanjatiimin jäsentä keskustelee kokouspöydän ääressä, taustalla seinällä käsin kirjoitettuja fläppipapereita.',
            sv: 'Fyra medlemmar av kampanjteamet diskuterar runt ett mötesbord, med handskrivna blädderblocksark på väggen bakom dem.',
        },
        caption: {
            en: 'Planning the campaign themes together.',
            fi: 'Kampanjan teemoja suunnitellaan yhdessä.',
            sv: 'Kampanjens teman planeras tillsammans.',
        },
        photographer: 'Erkki Laine',
        slug: 'Kampanjatiimi-suunnittelee-2026',
        widths: [400, 800, 1200],
    },
    {
        alt: {
            en: 'Lauri Lavanti in a white campaign vest with a candidate badge, handing out leaflets at a market square with people and a stroller behind him.',
            fi: 'Lauri Lavanti valkoisessa kampanjaliivissä ehdokasnappi rinnassa jakamassa esitteitä torilla, taustalla ihmisiä ja lastenvaunut.',
            sv: 'Lauri Lavanti i vit kampanjväst med kandidatknapp delar ut broschyrer på ett torg, med människor och en barnvagn bakom sig.',
        },
        caption: {
            en: 'Leaflets and conversations at the market square.',
            fi: 'Esitteitä ja keskusteluja torilla.',
            sv: 'Broschyrer och samtal på torget.',
        },
        slug: 'Lauri-Lavanti-jakaa-esitteita-torilla-vaaka',
        widths: [400, 800],
    },
]
