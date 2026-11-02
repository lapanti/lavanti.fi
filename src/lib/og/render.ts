import type { OgCard } from './cards'

import { Resvg } from '@resvg/resvg-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import satori from 'satori'
import sharp from 'sharp'

import { colors } from '../styles'

const WIDTH = 1200
const HEIGHT = 630
const PORTRAIT_WIDTH = 468 // ~39% — the deep-forest portrait column, matching og-image-lauri-lavanti.jpg

/*
 * Card colours, straight from the Signal Band palette (src/lib/styles.ts). The wordmark
 * and headline share the deep-forest ink; only the emphasised word is bright green.
 */
const INK = colors.forestGreen // deep-forest ink (#163E35) — matches NameLogo's dark tone
const SAND = colors.lightSand // right-panel ground (#E9E4D4)
const ACCENT = colors.brightGreen // emphasised word (#009639)

/*
 * Build inputs are read once, from committed assets (src/images/originals is gitignored,
 * so the portrait is copied here; the font is a static 900 instance since satori's
 * variable-weight selection is unreliable). Resolved from the project root — an
 * import.meta.url-relative read breaks once Astro bundles this module into dist/.prerender.
 * Never fetched over the network at build.
 */
const ASSETS = join(process.cwd(), 'src/lib/og/assets')
const fontData = readFileSync(join(ASSETS, 'fonts/BigShouldersDisplay-Black.ttf'))

/**
 * Portrait data URIs, loaded lazily and cached per asset filename. `card.photo` selects
 * a per-page portrait (see HERO_PORTRAITS in cards.ts); the default is the front-page
 * portrait. Filenames come from the build-time card manifest, never from user input.
 */
const portraitCache = new Map<string, string>()
const portraitUriFor = (photo = 'portrait.jpg'): string => {
    let uri = portraitCache.get(photo)
    if (!uri) {
        uri = `data:image/jpeg;base64,${readFileSync(join(ASSETS, photo)).toString('base64')}`
        portraitCache.set(photo, uri)
    }

    return uri
}

type Style = Record<string, unknown>
interface Node {
    props: { children?: Node[] | string; style: Style } & Record<string, unknown>
    type: string
}

const el = (type: string, style: Style, children?: Node[] | string, attrs?: Record<string, unknown>): Node => ({
    props: { ...attrs, ...(children === undefined ? {} : { children }), style },
    type,
})

/** Rough auto-fit so long post titles stay inside the sand panel. */
const headlineSize = (text: string): number => {
    const n = text.length
    if (n <= 24) return 68
    if (n <= 40) return 56
    if (n <= 60) return 46
    if (n <= 85) return 38

    return 32
}

const words = (text: string, color: string): Node[] =>
    text
        .toUpperCase()
        .split(' ')
        .filter(Boolean)
        .map((word) => el('div', { color, display: 'flex' }, word))

/**
 * Render a 1200×630 branded OG card as JPEG bytes: deep-forest portrait on the left, a
 * sand panel on the right carrying the "LAURI LAVANTI" wordmark and the upright page
 * headline (with an optional emphasised word in bright green). Only the wordmark takes
 * the brand oblique — `rotate(-10deg) skew(-10deg)`, exactly as NameLogo.astro renders it.
 */
export async function renderOgCard(card: OgCard): Promise<Uint8Array> {
    /*
     * The brand card always carries a bright-green accent (as og-image-lauri-lavanti.jpg
     * does). Use the authored emphasis when present, otherwise fall back to the title's
     * last word — a single-word title becomes the accent in full.
     */
    const parts = card.title.split(' ').filter(Boolean)
    const emphasis = card.emphasis ?? (parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? ''))
    const lead = card.emphasis ? card.title : parts.slice(0, -1).join(' ')

    const size = headlineSize([lead, emphasis].filter(Boolean).join(' '))

    const headline = el(
        'div',
        {
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: size,
            gap: Math.round(size * 0.26),
            lineHeight: 1,
            maxWidth: 620,
        },
        [...(lead ? words(lead, INK) : []), ...words(emphasis, ACCENT)]
    )

    const wordmark = el(
        'div',
        {
            color: INK,
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 80,
            transform: 'rotate(-10deg) skew(-10deg)',
        },
        [
            el('div', { display: 'flex', fontSize: 46, lineHeight: 0.9 }, 'LAURI'),
            el('div', { display: 'flex', fontSize: 96, letterSpacing: '-0.01em', lineHeight: 0.85 }, 'LAVANTI'),
        ]
    )

    const tree = el(
        'div',
        {
            backgroundColor: INK,
            display: 'flex',
            fontFamily: 'Big Shoulders Display',
            fontWeight: 900,
            height: HEIGHT,
            width: WIDTH,
        },
        [
            el(
                'img',
                { height: HEIGHT, objectFit: 'cover', objectPosition: '100% 50%', width: PORTRAIT_WIDTH },
                undefined,
                { height: HEIGHT, src: portraitUriFor(card.photo), width: PORTRAIT_WIDTH }
            ),
            el(
                'div',
                {
                    backgroundColor: SAND,
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    height: HEIGHT,
                    justifyContent: 'center',
                    paddingBottom: 48,
                    paddingLeft: 80,
                    paddingRight: 56,
                    paddingTop: 48,
                },
                [wordmark, headline]
            ),
        ]
    )

    const svg = await satori(tree as never, {
        fonts: [{ data: fontData, name: 'Big Shoulders Display', style: 'normal', weight: 900 }],
        height: HEIGHT,
        width: WIDTH,
    })

    const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH }, font: { loadSystemFonts: false } })
        .render()
        .asPng()

    /*
     * Ship JPEG, not the raw PNG: the photo column makes a PNG card 300–450 KB even when
     * lossless-optimised, and WhatsApp drops link-preview images above ~300 KB. mozjpeg
     * q85 lands around 50–60 KB with no visible loss on the flat sand panel.
     */
    return sharp(png).jpeg({ mozjpeg: true, quality: 85 }).toBuffer()
}
