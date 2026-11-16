import type { OgCard } from './cards'

import { Resvg } from '@resvg/resvg-js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import satori from 'satori'
import sharp from 'sharp'

import { SIGN, SIGN_COLORS } from '../adoptionShareImage'
import { estimateWidth, fitStickerLabel, fitStickerName, STICKER, type StickerText } from '../signSticker'
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

/** `adoption-sign.jpg` is the sign draft at 444 × 630, so the sign fills the column height. */
const SIGN_SCALE = HEIGHT / SIGN.height
const SIGN_LEFT = (PORTRAIT_WIDTH - SIGN.width * SIGN_SCALE) / 2

/** Text lines placed by baseline (sign units), centred on `cx` in a `span`-wide box: satori has no SVG text. */
const signLines = (fit: StickerText, cx: number, cy: number, color: string, span = 2 * STICKER.r): Node[] =>
    fit.lines.map((line, i) => {
        const size = fit.size * SIGN_SCALE
        const width = span * SIGN_SCALE

        return el(
            'div',
            {
                color,
                display: 'flex',
                fontSize: size,
                justifyContent: 'center',
                left: SIGN_LEFT + cx * SIGN_SCALE - width / 2,
                lineHeight: 1,
                position: 'absolute',
                // A 1-line-height box puts the baseline about 0.8 em below its top.
                top: (cy + fit.ys[i]) * SIGN_SCALE - 0.8 * size,
                width,
            },
            line
        )
    })

/**
 * The left column of a personal adoption card: the sign draft with the same overlays as
 * SignGraphic.astro (label mask, the sticker with the adopter's name, the payer line). Satori
 * only has Big Shoulders here, so the small label and payer text use it instead of IBM Plex Sans.
 */
const signColumn = (sign: NonNullable<OgCard['sign']>): Node => {
    const s = SIGN_SCALE
    const { mask, payer } = SIGN
    const box = (x: number, y: number, w: number, h: number) => ({
        height: h * s,
        left: SIGN_LEFT + x * s,
        position: 'absolute',
        top: y * s,
        width: w * s,
    })
    const payerFit: StickerText = { lines: [...sign.payer], size: payer.size, ys: payer.ys.map((y) => y - STICKER.cy) }

    return el(
        'div',
        {
            backgroundColor: SIGN_COLORS.ground,
            display: 'flex',
            height: HEIGHT,
            position: 'relative',
            width: PORTRAIT_WIDTH,
        },
        [
            el('img', box(0, 0, SIGN.width, SIGN.height), undefined, {
                height: HEIGHT,
                src: portraitUriFor('adoption-sign.jpg'),
                width: SIGN.width * s,
            }),
            el('div', { ...box(mask.x, mask.y, mask.w, mask.h), backgroundColor: SIGN_COLORS.ground }),
            el('div', {
                ...box(STICKER.cx - STICKER.r, STICKER.cy - STICKER.r, 2 * STICKER.r, 2 * STICKER.r),
                backgroundColor: SIGN_COLORS.sticker,
                borderRadius: '50%',
            }),
            ...signLines(fitStickerLabel(sign.sticker, estimateWidth), STICKER.cx, STICKER.cy, SIGN_COLORS.label),
            ...signLines(fitStickerName(sign.name, estimateWidth), STICKER.cx, STICKER.cy, SIGN_COLORS.name),
            ...signLines(payerFit, payer.x, STICKER.cy, SIGN_COLORS.payer, 2 * (930 - payer.x)),
        ]
    )
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
            card.sign
                ? signColumn(card.sign)
                : el(
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
