/**
 * Chart data for post 96 (public sector revenue and spending in 2027).
 *
 * One module for all three locales, so the fi, sv and en charts cannot drift apart.
 * The post's prose and bullet lists state the same figures in words; a change here
 * needs the matching change in all three MDX files and an `updatedDate` bump.
 *
 * Sources, as described in the post's "Mistä luvut ovat peräisin?" section:
 * - Totals: VM Taloudellinen katsaus syksy 2026, tables 16 and 17.
 * - Revenue split: Statistics Finland national accounts 15aj (taxes) and 15ah (property
 *   income), scaled to the VM totals. An estimate, not an official breakdown.
 * - Spending split: Statistics Finland COFOG table 12a6 (2024 preliminary), scaled to
 *   2027. An estimate, not an official breakdown.
 * - Interest 1990–2024: table 12a6, S13 consolidated property expenditure (D4KS) and
 *   total consolidated expenditure (OTES), all functions, current prices. The 2027
 *   figure is the post's own estimate (6.1 of 174.0).
 */

import type { Lang } from './nav'

export type Localised = Record<Lang, string>

/**
 * How a square is painted. `half` marks a sub-item inside a solid group (yhteisövero
 * inside tuloverot); `hatch` marks the items of the catch-all group, which read as one
 * block at a glance and as separate items on a closer look.
 */
export type WaffleFill = 'half' | 'hatch' | 'solid'

export interface WaffleItem {
    /** The chart palette goes beyond the site tokens: twelve hatched items need twelve hues. */
    color: string
    fill: WaffleFill
    key: string
    label: Localised
    /** Billions of euros, one decimal. */
    value: number
}

export interface WaffleGroup {
    items: WaffleItem[]
    key: string
    label: Localised
}

export interface WaffleData {
    groups: WaffleGroup[]
    /** Billions of euros, one decimal; the sum of every item. */
    total: number
}

export const publicRevenue2027: WaffleData = {
    groups: [
        {
            items: [
                {
                    color: '#163E35',
                    fill: 'solid',
                    key: 'ansiotuloverot',
                    label: {
                        en: 'earned and capital income taxes',
                        fi: 'ansio- ja pääomatuloverot',
                        sv: 'förvärvs- och kapitalinkomstskatter',
                    },
                    value: 38.5,
                },
                {
                    color: '#163E35',
                    fill: 'half',
                    key: 'yhteisovero',
                    label: { en: 'corporate income tax', fi: 'yhteisövero', sv: 'samfundsskatt' },
                    value: 7.7,
                },
            ],
            key: 'tuloverot',
            label: { en: 'Income taxes', fi: 'Tuloverot', sv: 'Inkomstskatter' },
        },
        {
            items: [
                {
                    color: '#317CE6',
                    fill: 'solid',
                    key: 'tyoelakemaksut',
                    label: {
                        en: 'earnings-related pension contributions',
                        fi: 'työeläkemaksut',
                        sv: 'arbetspensionsavgifter',
                    },
                    value: 30.1,
                },
                {
                    color: '#317CE6',
                    fill: 'half',
                    key: 'muutsotu',
                    label: {
                        en: 'health and unemployment insurance contributions',
                        fi: 'sairaus- ja työttömyysvakuutusmaksut',
                        sv: 'sjuk- och arbetslöshetsförsäkringsavgifter',
                    },
                    value: 6.7,
                },
            ],
            key: 'sotumaksut',
            label: {
                en: 'Social security contributions',
                fi: 'Sosiaalivakuutusmaksut',
                sv: 'Socialförsäkringsavgifter',
            },
        },
        {
            items: [
                {
                    color: '#009639',
                    fill: 'solid',
                    key: 'alv',
                    label: { en: 'Value added tax', fi: 'Arvonlisävero', sv: 'Mervärdesskatt' },
                    value: 28.8,
                },
            ],
            key: 'alv',
            label: { en: 'Value added tax', fi: 'Arvonlisävero', sv: 'Mervärdesskatt' },
        },
        {
            items: [
                {
                    color: '#6E5845',
                    fill: 'solid',
                    key: 'myynti',
                    label: {
                        en: 'Sales and fee income',
                        fi: 'Myynti- ja maksutulot',
                        sv: 'Försäljnings- och avgiftsintäkter',
                    },
                    value: 19.0,
                },
            ],
            key: 'myynti',
            label: { en: 'Sales and fee income', fi: 'Myynti- ja maksutulot', sv: 'Försäljnings- och avgiftsintäkter' },
        },
        {
            items: [
                {
                    color: '#466661',
                    fill: 'solid',
                    key: 'omaisuustulot',
                    label: { en: 'Property income', fi: 'Omaisuustulot', sv: 'Egendomsinkomster' },
                    value: 12.2,
                },
            ],
            key: 'omaisuustulot',
            label: { en: 'Property income', fi: 'Omaisuustulot', sv: 'Egendomsinkomster' },
        },
        {
            items: [
                {
                    color: '#8A8670',
                    fill: 'hatch',
                    key: 'energiaverot',
                    label: { en: 'energy taxes', fi: 'energiaverot', sv: 'energiskatter' },
                    value: 4.0,
                },
                {
                    color: '#AE958F',
                    fill: 'hatch',
                    key: 'alkoholitupakka',
                    label: {
                        en: 'alcohol and tobacco taxes',
                        fi: 'alkoholi- ja tupakkaverot',
                        sv: 'alkohol- och tobaksskatter',
                    },
                    value: 2.8,
                },
                {
                    color: '#9FB0AE',
                    fill: 'hatch',
                    key: 'ajoneuvo',
                    label: {
                        en: 'vehicle, car and other excise taxes',
                        fi: 'ajoneuvo-, auto- ja muut valmisteverot',
                        sv: 'fordons-, bil- och övriga punktskatter',
                    },
                    value: 1.8,
                },
                {
                    color: '#C4AE9C',
                    fill: 'hatch',
                    key: 'kiinteistovero',
                    label: { en: 'real estate tax', fi: 'kiinteistövero', sv: 'fastighetsskatt' },
                    value: 2.4,
                },
                {
                    color: '#73898A',
                    fill: 'hatch',
                    key: 'muutverot',
                    label: {
                        en: 'other taxes (insurance premium, inheritance, transfer tax etc.)',
                        fi: 'muut verot (vakuutusmaksu-, perintö-, varainsiirtovero ym.)',
                        sv: 'övriga skatter (försäkringspremie-, arvs-, överlåtelseskatt m.m.)',
                    },
                    value: 4.4,
                },
                {
                    color: '#B8AF9C',
                    fill: 'hatch',
                    key: 'muuttulot',
                    label: { en: 'other income', fi: 'muut tulot', sv: 'övriga inkomster' },
                    value: 2.0,
                },
            ],
            key: 'muut',
            label: { en: 'Other taxes and income', fi: 'Muut verot ja tulot', sv: 'Övriga skatter och inkomster' },
        },
    ],
    total: 160.4,
}

export const publicSpending2027: WaffleData = {
    groups: [
        {
            items: [
                {
                    color: '#317CE6',
                    fill: 'solid',
                    key: 'tyoelakkeet',
                    label: { en: 'earnings-related pensions', fi: 'työeläkkeet', sv: 'arbetspensioner' },
                    value: 37.6,
                },
                {
                    color: '#317CE6',
                    fill: 'half',
                    key: 'kansanelakkeet',
                    label: {
                        en: 'national and guarantee pensions (Kela)',
                        fi: 'kansan- ja takuueläkkeet (Kela)',
                        sv: 'folk- och garantipensioner (FPA)',
                    },
                    value: 2.6,
                },
            ],
            key: 'elakkeet',
            label: { en: 'Pensions', fi: 'Eläkkeet', sv: 'Pensioner' },
        },
        {
            items: [
                {
                    color: '#59B9F1',
                    fill: 'solid',
                    key: 'sosiaaliturva',
                    label: { en: 'Other social security', fi: 'Muu sosiaaliturva', sv: 'Övrig social trygghet' },
                    value: 14.4,
                },
            ],
            key: 'sosiaaliturva',
            label: { en: 'Other social security', fi: 'Muu sosiaaliturva', sv: 'Övrig social trygghet' },
        },
        {
            items: [
                {
                    color: '#163E35',
                    fill: 'solid',
                    key: 'sote',
                    label: { en: 'Health and social services', fi: 'Sote', sv: 'Social- och hälsovård' },
                    value: 38.2,
                },
            ],
            key: 'sote',
            label: { en: 'Health and social services', fi: 'Sote', sv: 'Social- och hälsovård' },
        },
        {
            items: [
                {
                    color: '#009639',
                    fill: 'solid',
                    key: 'koulutus',
                    label: { en: 'Education', fi: 'Koulutus', sv: 'Utbildning' },
                    value: 23.2,
                },
            ],
            key: 'koulutus',
            label: { en: 'Education', fi: 'Koulutus', sv: 'Utbildning' },
        },
        {
            items: [
                {
                    color: '#6E5845',
                    fill: 'solid',
                    key: 'puolustus',
                    label: { en: 'Defence', fi: 'Puolustus', sv: 'Försvar' },
                    value: 7.0,
                },
            ],
            key: 'puolustus',
            label: { en: 'Defence', fi: 'Puolustus', sv: 'Försvar' },
        },
        {
            items: [
                {
                    color: '#625E37',
                    fill: 'hatch',
                    key: 'liikenne',
                    label: { en: 'transport', fi: 'liikenne', sv: 'trafik' },
                    value: 8.9,
                },
                {
                    color: '#466661',
                    fill: 'hatch',
                    key: 'kunnat',
                    label: {
                        en: 'municipal and regional administration',
                        fi: 'kunta- ja aluehallinto',
                        sv: 'kommunal och regional förvaltning',
                    },
                    value: 7.1,
                },
                {
                    color: '#F8CFA9',
                    fill: 'hatch',
                    key: 'korot',
                    label: { en: 'interest on debt', fi: 'velan korot', sv: 'räntor på skulden' },
                    value: 6.1,
                },
                {
                    color: '#C99A8B',
                    fill: 'hatch',
                    key: 'kulttuuri',
                    label: {
                        en: 'culture, sport and Yle',
                        fi: 'kulttuuri, liikunta ja Yle',
                        sv: 'kultur, idrott och Yle',
                    },
                    value: 5.3,
                },
                {
                    color: '#7DC79A',
                    fill: 'hatch',
                    key: 'tk',
                    label: {
                        en: 'research and development',
                        fi: 'tutkimus ja kehitys',
                        sv: 'forskning och utveckling',
                    },
                    value: 4.8,
                },
                {
                    color: '#86A9A1',
                    fill: 'hatch',
                    key: 'valtio',
                    label: { en: 'central government administration', fi: 'valtionhallinto', sv: 'statsförvaltning' },
                    value: 4.3,
                },
                {
                    color: '#A08872',
                    fill: 'hatch',
                    key: 'poliisi',
                    label: {
                        en: 'police, rescue services and courts',
                        fi: 'poliisi, pelastustoimi ja oikeuslaitos',
                        sv: 'polis, räddningsväsende och domstolar',
                    },
                    value: 4.2,
                },
                {
                    color: '#8C8650',
                    fill: 'hatch',
                    key: 'elinkeino',
                    label: {
                        en: 'business and employment services',
                        fi: 'elinkeino- ja työvoimapalvelut',
                        sv: 'närings- och arbetskraftstjänster',
                    },
                    value: 2.8,
                },
                {
                    color: '#C3D8D3',
                    fill: 'hatch',
                    key: 'eu',
                    label: { en: 'EU contributions', fi: 'EU-maksut', sv: 'EU-avgifter' },
                    value: 2.5,
                },
                {
                    color: '#C2BC6E',
                    fill: 'hatch',
                    key: 'maatalous',
                    label: { en: 'agriculture and forestry', fi: 'maa- ja metsätalous', sv: 'jord- och skogsbruk' },
                    value: 2.0,
                },
                {
                    color: '#CFC8B2',
                    fill: 'hatch',
                    key: 'muu',
                    label: {
                        en: 'housing, environment and development aid',
                        fi: 'asuminen, ympäristö ja kehitysapu',
                        sv: 'boende, miljö och utvecklingsbistånd',
                    },
                    value: 3.0,
                },
            ],
            key: 'muut',
            label: { en: 'Other spending', fi: 'Muut menot', sv: 'Övriga utgifter' },
        },
    ],
    total: 174.0,
}

export interface InterestYear {
    /** True for the post's own estimate, drawn hatched. */
    estimate?: boolean
    /** Interest paid, millions of euros. */
    interest: number
    /** Total consolidated spending, millions of euros. */
    spending: number
    year: number
}

/** Statistics Finland 12a6, S13, D4KS and OTES, all functions; fetched 2026-11-01 (2024 preliminary). */
export const publicInterest: InterestYear[] = [
    { interest: 1250, spending: 43554, year: 1990 },
    { interest: 1601, spending: 49267, year: 1991 },
    { interest: 2102, spending: 52405, year: 1992 },
    { interest: 3696, spending: 54898, year: 1993 },
    { interest: 3652, spending: 56696, year: 1994 },
    { interest: 3782, spending: 60074, year: 1995 },
    { interest: 4150, spending: 60634, year: 1996 },
    { interest: 4502, spending: 62087, year: 1997 },
    { interest: 4117, spending: 62998, year: 1998 },
    { interest: 3685, spending: 64681, year: 1999 },
    { interest: 3703, spending: 65373, year: 2000 },
    { interest: 3699, spending: 68372, year: 2001 },
    { interest: 3020, spending: 71933, year: 2002 },
    { interest: 2766, spending: 74848, year: 2003 },
    { interest: 2694, spending: 77979, year: 2004 },
    { interest: 2661, spending: 80717, year: 2005 },
    { interest: 2589, spending: 83083, year: 2006 },
    { interest: 2659, spending: 87113, year: 2007 },
    { interest: 2720, spending: 93001, year: 2008 },
    { interest: 2422, spending: 98305, year: 2009 },
    { interest: 2646, spending: 101633, year: 2010 },
    { interest: 2939, spending: 106402, year: 2011 },
    { interest: 3052, spending: 111605, year: 2012 },
    { interest: 2754, spending: 116210, year: 2013 },
    { interest: 2697, spending: 118624, year: 2014 },
    { interest: 2587, spending: 117168, year: 2015 },
    { interest: 2498, spending: 118868, year: 2016 },
    { interest: 2357, spending: 118756, year: 2017 },
    { interest: 2282, spending: 122135, year: 2018 },
    { interest: 2049, spending: 125459, year: 2019 },
    { interest: 1601, spending: 133447, year: 2020 },
    { interest: 1289, spending: 137103, year: 2021 },
    { interest: 1520, spending: 140085, year: 2022 },
    { interest: 3215, spending: 152619, year: 2023 },
    { interest: 4372, spending: 159373, year: 2024 },
    { estimate: true, interest: 6100, spending: 174000, year: 2027 },
]
