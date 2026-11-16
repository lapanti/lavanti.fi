/**
 * The Adoptoi kyltti sign and share images (spec: .agents/specs/sign-adoption/spec.md).
 *
 * `SIGN` is the one geometry for the sign: `SignGraphic.astro` draws it as SVG, and `drawSign`
 * draws the same shapes on a canvas for the share PNGs. The layout maths is pure so it can be
 * unit-tested with a fake context; the page script only loads fonts and images and calls
 * `drawShareImage`.
 *
 * Share PNG chrome: deep forest ground, wordmark and Vihreät logo on a top row, 76 px side padding,
 * `lavanti.fi` in the call to action and one stripe run at the foot. Never dark green text or rules
 * on the deep forest ground, so the stripe runs blue to green from the ground down to the edge.
 */

import {
    BODY_FONT,
    DISPLAY_FONT,
    fitStickerLabel,
    fitStickerName,
    labelFont,
    type Measure,
    nameFont,
    STICKER,
} from './signSticker'
import { colors } from './styles'

export { BODY_FONT, DISPLAY_FONT } from './signSticker'

const DEEP_FOREST = '#163E35'

/** Cloudflare Images id of the campaign's road-sign draft (Finnish), the base of every sign. */
export const SIGN_IMAGE_SLUG = 'Lauri-Lavanti-vaalikyltti-luonnos'

/**
 * Sign geometry in SVG user units (also the canvas units at scale 1): the draft's own pixels. The
 * draft carries the name, photo, slogan, logo and URL; only three things are drawn over it. The
 * adopter's name sits in the round sticker (`STICKER` in signSticker.ts) right of "LAURI".
 */
export const SIGN = {
    height: 2000,
    /** The draft's stray "BIG SHOULDERS" font label, top right, painted over with the ground. */
    mask: { h: 32, w: 174, x: 1144, y: 26 },
    /** Two lines in the free ground between the party logo (ends x 338) and LAVANTI.FI (x 930). */
    payer: { size: 26, x: 634, ys: [1924, 1960] },
    width: 1410,
} as const

export const SIGN_COLORS = {
    ghost: 'rgba(22, 62, 53, 0.55)',
    /** The draft's dark green ground, sampled from the image (0, 61, 36). */
    ground: '#003D24',
    label: 'rgba(22, 62, 53, 0.8)',
    name: DEEP_FOREST,
    payer: 'rgba(255, 255, 255, 0.85)',
    sticker: colors.white,
} as const

/** Top to bottom: blue against the ground, dark green at the image edge. */
export const STRIPE_RUN = [colors.signalBlue, colors.brightSky, colors.aquaBlue, colors.brightGreen, colors.darkGreen]

export type ShareFormat = 'feed' | 'story'

export const SHARE_SIZES: Record<ShareFormat, { height: number; width: number }> = {
    feed: { height: 1350, width: 1080 },
    story: { height: 1920, width: 1080 },
}

export const SHARE_PAD = 76
const STRIPE_BAND = 14
const TOP_ROW = 120
const GAP = 48
const SIGN_FRAME = 8

const SIZES: Record<ShareFormat, { cta: number; headline: number; logo: number }> = {
    feed: { cta: 40, headline: 84, logo: 60 },
    story: { cta: 48, headline: 104, logo: 72 },
}

/** The subset of CanvasRenderingContext2D the drawing uses, so tests can pass a recorder. */
export type CanvasLike = Pick<
    CanvasRenderingContext2D,
    | 'arc'
    | 'beginPath'
    | 'drawImage'
    | 'fill'
    | 'fillRect'
    | 'fillText'
    | 'measureText'
    | 'restore'
    | 'rotate'
    | 'save'
    | 'transform'
    | 'translate'
> & {
    fillStyle: CanvasRenderingContext2D['fillStyle']
    font: string
    textAlign: CanvasTextAlign
    textBaseline: CanvasTextBaseline
}

/** Greedy word wrap to `maxWidth` with the context's current font. A single long word keeps its own line. */
export const wrapText = (ctx: Pick<CanvasLike, 'measureText'>, text: string, maxWidth: number): string[] => {
    const lines: string[] = []
    let line = ''
    for (const word of text.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word
        if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line)
            line = word
        } else {
            line = candidate
        }
    }
    if (line) lines.push(line)

    return lines
}

/** Largest font size from `max` down to `min` at which `text` fits `maxWidth` on one line. */
export const fitFontSize = (
    ctx: Pick<CanvasLike, 'font' | 'measureText'>,
    text: string,
    font: (size: number) => string,
    maxWidth: number,
    max: number,
    min: number
): number => {
    for (let size = max; size > min; size -= 2) {
        ctx.font = font(size)
        if (ctx.measureText(text).width <= maxWidth) return size
    }
    ctx.font = font(min)

    return min
}

export interface ShareLayout {
    cta: { size: number; y: number }
    headline: { lineHeight: number; size: number; y: number }
    logo: { height: number; y: number }
    sign: { scale: number; x: number; y: number }
    stripe: { band: number; y: number }
}

/** Where everything goes on a share image with `headlineLines` lines of headline. */
export const shareLayout = (format: ShareFormat, headlineLines: number): ShareLayout => {
    const { height, width } = SHARE_SIZES[format]
    const sizes = SIZES[format]
    const stripeY = height - STRIPE_BAND * STRIPE_RUN.length
    const lineHeight = Math.round(sizes.headline * 1.02)
    const headlineY = SHARE_PAD + TOP_ROW
    const headlineBottom = headlineY + lineHeight * headlineLines
    const ctaY = stripeY - SHARE_PAD
    const signTop = headlineBottom + GAP
    const signBottom = ctaY - sizes.cta - GAP
    const scale = Math.min((width - 2 * SHARE_PAD) / SIGN.width, (signBottom - signTop) / SIGN.height)

    return {
        cta: { size: sizes.cta, y: ctaY },
        headline: { lineHeight, size: sizes.headline, y: headlineY },
        logo: { height: sizes.logo, y: SHARE_PAD },
        sign: { scale, x: (width - SIGN.width * scale) / 2, y: signTop },
        stripe: { band: STRIPE_BAND, y: stripeY },
    }
}

const display = (weight: number) => (size: number) => `${weight} ${size}px "${DISPLAY_FONT}"`

export interface SignDrawing {
    ghost: string
    /** The sign draft; null when it failed to load (or tainted the canvas): the ground stays. */
    image: (CanvasImageSource & { height: number; width: number }) | null
    name: string
    /**
     * `firstName`/`lastName` feed the share image wordmark; `payer` is the two-line "Mainoksen
     * maksaja" line; `sticker` the label over the name ("Tämän kyltin", "adoptoi").
     */
    text: { firstName: string; lastName: string; payer: readonly string[]; sticker: readonly string[] }
}

/** Draws the white sticker with its label and the name (or ghost text) fitted inside. */
const drawSticker = (ctx: CanvasLike, sign: SignDrawing) => {
    const { cx, cy, r } = STICKER
    const measure: Measure = (text, font) => {
        ctx.font = font
        return ctx.measureText(text).width
    }
    ctx.fillStyle = SIGN_COLORS.sticker
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.fill()

    ctx.textAlign = 'center'
    const label = fitStickerLabel(sign.text.sticker, measure)
    ctx.fillStyle = SIGN_COLORS.label
    ctx.font = labelFont(label.size)
    label.lines.forEach((line, i) => ctx.fillText(line, cx, cy + label.ys[i]))

    const name = sign.name.trim()
    const fit = fitStickerName(name || sign.ghost, measure)
    ctx.fillStyle = name ? SIGN_COLORS.name : SIGN_COLORS.ghost
    ctx.font = nameFont(fit.size)
    fit.lines.forEach((line, i) => ctx.fillText(line, cx, cy + fit.ys[i]))
}

/** The sign at (x, y), `scale` times its SVG size. */
export const drawSign = (ctx: CanvasLike, x: number, y: number, scale: number, sign: SignDrawing): void => {
    ctx.save()
    ctx.translate(x, y)
    ctx.transform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = SIGN_COLORS.ground
    ctx.fillRect(0, 0, SIGN.width, SIGN.height)
    if (sign.image) ctx.drawImage(sign.image, 0, 0, SIGN.width, SIGN.height)
    const { mask } = SIGN
    ctx.fillRect(mask.x, mask.y, mask.w, mask.h)

    ctx.textBaseline = 'alphabetic'
    drawSticker(ctx, sign)

    ctx.fillStyle = SIGN_COLORS.payer
    ctx.font = `400 ${SIGN.payer.size}px "${BODY_FONT}"`
    sign.text.payer.forEach((line, i) => ctx.fillText(line, SIGN.payer.x, SIGN.payer.ys[i]))
    ctx.restore()
}

export interface ShareDrawing extends SignDrawing {
    cta: string
    headline: string
    logo: (CanvasImageSource & { height: number; width: number }) | null
}

/** One share PNG: chrome, headline, the adopter's sign and the call to action. */
export const drawShareImage = (ctx: CanvasLike, format: ShareFormat, drawing: ShareDrawing): ShareLayout => {
    const { height, width } = SHARE_SIZES[format]
    const inner = width - 2 * SHARE_PAD
    ctx.fillStyle = DEEP_FOREST
    ctx.fillRect(0, 0, width, height)

    // Top row: the wordmark (as NameLogo draws it: tilted, small first name over the surname)…
    const { headline: headlineSize } = SIZES[format]
    ctx.font = display(800)(headlineSize)
    const lines = wrapText(ctx, drawing.headline, inner)
    const layout = shareLayout(format, lines.length)
    ctx.save()
    ctx.translate(SHARE_PAD, layout.logo.y + layout.logo.height)
    ctx.rotate((-10 * Math.PI) / 180)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = colors.white
    ctx.font = display(800)(Math.round(layout.logo.height * 0.32))
    ctx.fillText(drawing.text.firstName.toUpperCase(), 0, -layout.logo.height * 0.62)
    ctx.font = display(800)(Math.round(layout.logo.height * 0.78))
    ctx.fillText(drawing.text.lastName.toUpperCase(), 0, 0)
    ctx.restore()
    // …and the party logo on the right.
    if (drawing.logo) {
        const logoWidth = (drawing.logo.width / drawing.logo.height) * layout.logo.height
        ctx.drawImage(drawing.logo, width - SHARE_PAD - logoWidth, layout.logo.y, logoWidth, layout.logo.height)
    }

    ctx.fillStyle = colors.white
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = display(800)(layout.headline.size)
    lines.forEach((line, i) => ctx.fillText(line, SHARE_PAD, layout.headline.y + i * layout.headline.lineHeight))

    // The sign shares the deep forest ground, so a white frame sets it off like a real board.
    const frame = SIGN_FRAME
    ctx.fillStyle = colors.white
    ctx.fillRect(
        layout.sign.x - frame,
        layout.sign.y - frame,
        SIGN.width * layout.sign.scale + 2 * frame,
        SIGN.height * layout.sign.scale + 2 * frame
    )
    drawSign(ctx, layout.sign.x, layout.sign.y, layout.sign.scale, drawing)

    ctx.fillStyle = colors.oat
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    fitFontSize(ctx, drawing.cta, display(700), inner, layout.cta.size, 24)
    ctx.fillText(drawing.cta, SHARE_PAD, layout.cta.y)

    STRIPE_RUN.forEach((color, i) => {
        ctx.fillStyle = color
        ctx.fillRect(0, layout.stripe.y + i * layout.stripe.band, width, layout.stripe.band)
    })

    return layout
}
