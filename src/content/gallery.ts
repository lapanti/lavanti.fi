import type { CollectionInfo } from '../lib/jsonld'
import type { Lang } from './nav'

import { getDownloadUrl } from '../lib/images'

export interface GalleryPhoto {
    /** Localised description of the thumbnail (the first available crop). */
    alt: Record<Lang, string>
    /** Cloudflare Images slugs per aspect crop. At least one of the three must be present. */
    crops: Partial<Record<'nelio' | 'pysty' | 'vaaka', string>>
    id: string
    /** Omit when no photographer credit applies (e.g. in-house/studio shots). */
    photographer?: string
}

/**
 * Media gallery: photos of Lauri Lavanti cleared for download under CC BY-SA 4.0 —
 * see the LICENSE file and the /media page. The three-crop entries (neliö 1:1, pysty
 * portrait, vaaka landscape) come from Markus Isomeri's 2026 photoshoot and the
 * uncredited 2026 outdoor set; the 2026 campaign studio portraits are single pysty
 * frames instead.
 */
export const galleryPhotos: GalleryPhoto[] = [
    {
        alt: {
            en: 'Lauri Lavanti smiling at the camera in a close-up portrait, with the dark seating rows of an Aalto University auditorium behind him.',
            fi: 'Lauri Lavanti hymyilee kameralle lähikuvassa, taustalla Aalto-yliopiston auditorion tummat penkkirivit.',
            sv: 'Lauri Lavanti ler mot kameran i en närbild, med de mörka bänkraderna i en föreläsningssal på Aalto-universitetet i bakgrunden.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-aalto-yliopiston-paarakennuksen-auditoriossa-hymyilee-nelio',
            pysty: 'Lauri-Lavanti-aalto-yliopiston-paarakennuksen-auditoriossa-hymyilee-pysty',
            vaaka: 'Lauri-Lavanti-aalto-yliopiston-paarakennuksen-auditoriossa-hymyilee-vaaka',
        },
        id: 'aalto-auditorio',
        photographer: 'Markus Isomeri',
    },
    {
        alt: {
            en: 'Lauri Lavanti looking straight into the camera in front of a board-formed concrete wall, wearing a navy blazer and a floral shirt.',
            fi: 'Lauri Lavanti katsoo suoraan kameraan betoniseinän edessä, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Lauri Lavanti tittar rakt in i kameran framför en betongvägg, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan-nelio',
            pysty: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan-pysty',
            vaaka: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan-vaaka',
        },
        id: 'dipoli-katse-kameraan',
        photographer: 'Markus Isomeri',
    },
    {
        alt: {
            en: 'Lauri Lavanti gazing thoughtfully upwards in front of a board-formed concrete wall, wearing a navy blazer and a floral shirt.',
            fi: 'Lauri Lavanti katsoo mietteliäänä ylöspäin betoniseinän edessä, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Lauri Lavanti blickar eftertänksamt uppåt framför en betongvägg, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana-nelio',
            pysty: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana-pysty',
            vaaka: 'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana-vaaka',
        },
        id: 'dipoli-mietteliaana',
        photographer: 'Markus Isomeri',
    },
    {
        alt: {
            en: 'Lauri Lavanti smiling gently in front of the glass facade of the Dipoli building, framed by warm wooden mullions.',
            fi: 'Lauri Lavanti hymyilee kevyesti Dipolin lasijulkisivun edessä, taustalla lämpimät puiset ikkunapuitteet.',
            sv: 'Lauri Lavanti ler lätt framför Dipolis glasfasad, inramad av varma träspröjsar.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-dipolissa-lasijulkisivun-edessa-nelio',
            pysty: 'Lauri-Lavanti-dipolissa-lasijulkisivun-edessa-pystykuva',
            vaaka: 'Lauri-Lavanti-dipolissa-lasijulkisivun-edessa-veistoksen-vieressa',
        },
        id: 'dipoli-lasijulkisivu',
        photographer: 'Markus Isomeri',
    },
    {
        alt: {
            en: 'Lauri Lavanti sitting on outdoor stone steps with a laptop on his lap, smiling at the camera, wearing a navy blazer and beige chinos.',
            fi: 'Lauri Lavanti istuu ulkoportailla kannettava tietokone sylissään ja hymyilee kameralle, yllään tummansininen pikkutakki ja beiget housut.',
            sv: 'Lauri Lavanti sitter på en utomhustrappa med en bärbar dator i knäet och ler mot kameran, klädd i en marinblå kavaj och beiga byxor.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-kannettavan-tietokoneen-aarella-nelio',
            pysty: 'Lauri-Lavanti-tyoskentelee-portailla-koko-vartalo',
            vaaka: 'Lauri-Lavanti-tyoskentelee-portailla-vaaka',
        },
        id: 'portailla',
        photographer: 'Markus Isomeri',
    },
    {
        alt: {
            en: 'Lauri Lavanti standing on a lawn in front of apartment buildings with his hands in his pockets, wearing a navy blazer, a floral shirt and light chinos.',
            fi: 'Lauri Lavanti seisoo nurmikolla kerrostalojen edessä kädet taskuissa, yllään tummansininen pikkutakki, kukkakuvioinen paita ja vaaleat housut.',
            sv: 'Lauri Lavanti står på en gräsmatta framför flervåningshus med händerna i fickorna, klädd i en marinblå kavaj, en blommig skjorta och ljusa byxor.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-nelio',
            pysty: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-pysty',
            vaaka: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-vaaka',
        },
        id: 'kerrostalopiha-kadet-taskuissa',
    },
    {
        alt: {
            en: 'Lauri Lavanti looking into the camera in a half-length portrait in a residential courtyard, with a lawn and passers-by behind him.',
            fi: 'Lauri Lavanti katsoo kameraan puolilähikuvassa kerrostalopihalla, taustalla nurmikkoa ja ohikulkijoita.',
            sv: 'Lauri Lavanti tittar in i kameran i en halvbild på en bostadsgård, med gräsmatta och förbipasserande i bakgrunden.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-kerrostalopihalla-lahikuva-nelio',
            pysty: 'Lauri-Lavanti-kerrostalopihalla-lahikuva-pysty',
            vaaka: 'Lauri-Lavanti-kerrostalopihalla-lahikuva-vaaka',
        },
        id: 'kerrostalopiha-lahikuva',
    },
    {
        alt: {
            en: 'Lauri Lavanti leaning against a granite wall with his arms crossed, looking upwards, wearing a navy blazer and a floral shirt.',
            fi: 'Lauri Lavanti nojaa graniittimuuriin kädet puuskassa ja katsoo ylöspäin, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Lauri Lavanti lutar sig mot en granitmur med armarna i kors och blickar uppåt, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa-nelio',
            pysty: 'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa-pysty',
            vaaka: 'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa-vaaka',
        },
        id: 'graniittimuuri-kadet-puuskassa',
    },
    {
        alt: {
            en: 'Lauri Lavanti leaning against a granite wall with one hand in his pocket, looking into the camera, wearing a navy blazer, a floral shirt and light chinos.',
            fi: 'Lauri Lavanti nojaa graniittimuuriin toinen käsi taskussa ja katsoo kameraan, yllään tummansininen pikkutakki, kukkakuvioinen paita ja vaaleat housut.',
            sv: 'Lauri Lavanti lutar sig mot en granitmur med ena handen i fickan och tittar in i kameran, klädd i en marinblå kavaj, en blommig skjorta och ljusa byxor.',
        },
        crops: {
            nelio: 'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa-nelio',
            pysty: 'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa-pysty',
            vaaka: 'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa-vaaka',
        },
        id: 'graniittimuuri-kasi-taskussa',
    },
    {
        alt: {
            en: 'Official studio portrait of Lauri Lavanti against a white background, standing with hands clasped, wearing a navy blazer and a floral shirt.',
            fi: 'Virallinen studiokuva Lauri Lavannista valkoista taustaa vasten, kädet yhdessä edessä, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Officiellt studioporträtt av Lauri Lavanti mot vit bakgrund, stående med händerna knäppta, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            pysty: 'Lauri-Lavanti-virallinen-puoluekuva',
        },
        id: 'virallinen-puoluekuva',
    },
    {
        alt: {
            en: 'Studio portrait of Lauri Lavanti against a white background, one hand in his pocket, looking slightly to the side, wearing a navy blazer and a floral shirt.',
            fi: 'Studiokuva Lauri Lavannista valkoista taustaa vasten, toinen käsi taskussa, katse hieman sivulle, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Studioporträtt av Lauri Lavanti mot vit bakgrund, ena handen i fickan, blicken lätt åt sidan, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            pysty: 'Lauri-Lavanti-studiokuvassa-kasi-taskussa-katse-vasemmalle',
        },
        id: 'studio-katse-vasemmalle',
    },
    {
        alt: {
            en: 'Studio portrait of Lauri Lavanti against a white background, jacket open with a small pin visible on the lapel, wearing a navy blazer and a floral shirt.',
            fi: 'Studiokuva Lauri Lavannista valkoista taustaa vasten, takki auki ja pieni rintamerkki näkyvissä rinnuksessa, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Studioporträtt av Lauri Lavanti mot vit bakgrund, kavajen öppen med en liten pin synlig på slaget, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            pysty: 'Lauri-Lavanti-studiokuvassa-rintamerkki-nakyvissa',
        },
        id: 'studio-rintamerkki',
    },
    {
        alt: {
            en: 'Studio portrait of Lauri Lavanti against a white background, standing at a three-quarter turn with one hand in his pocket, wearing a navy blazer and a floral shirt.',
            fi: 'Studiokuva Lauri Lavannista valkoista taustaa vasten, seisoo hieman sivuttain toinen käsi taskussa, yllään tummansininen pikkutakki ja kukkakuvioinen paita.',
            sv: 'Studioporträtt av Lauri Lavanti mot vit bakgrund, stående lätt vriden i sidled med ena handen i fickan, klädd i en marinblå kavaj och en blommig skjorta.',
        },
        crops: {
            pysty: 'Lauri-Lavanti-studiokuvassa-sivuttain-kasi-taskussa',
        },
        id: 'studio-sivuttain',
    },
]

/** The media gallery as CollectionPage items: each photo by its alt text, at its full-resolution download. */
export function galleryCollection(lang: Lang): CollectionInfo {
    return {
        items: galleryPhotos.map((photo) => ({
            name: photo.alt[lang],
            url: getDownloadUrl((photo.crops.nelio ?? photo.crops.pysty ?? photo.crops.vaaka)!),
        })),
    }
}
