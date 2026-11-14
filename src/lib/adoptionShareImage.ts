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

import { colors } from './styles'

export const DISPLAY_FONT = 'Big Shoulders Display'
export const BODY_FONT = 'IBM Plex Sans'

const DEEP_FOREST = '#163E35'

/** Sign geometry in SVG user units (also the canvas units at scale 1). */
export const SIGN = {
    band: { h: 92, y: 718 },
    firstName: { size: 46, y: 512 },
    height: 860,
    lastName: { size: 136, y: 628 },
    nameText: { size: 46, y: 778 },
    padX: 40,
    payer: { size: 17, y: 840 },
    photo: { h: 440, y: 0 },
    tagline: { size: 26, y: 676 },
    width: 600,
} as const

export const SIGN_COLORS = {
    background: DEEP_FOREST,
    band: colors.white,
    firstName: colors.aquaBlue,
    ghost: 'rgba(22, 62, 53, 0.55)',
    lastName: colors.white,
    name: DEEP_FOREST,
    payer: 'rgba(255, 255, 255, 0.85)',
    tagline: colors.oat,
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
    'drawImage' | 'fillRect' | 'fillText' | 'measureText' | 'restore' | 'rotate' | 'save' | 'transform' | 'translate'
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

/** Draws `image` to cover the box, cropping the overflow evenly (CSS object-fit: cover). */
const drawCover = (
    ctx: CanvasLike,
    image: CanvasImageSource & { height: number; width: number },
    x: number,
    y: number,
    w: number,
    h: number
) => {
    const scale = Math.max(w / image.width, h / image.height)
    const sw = w / scale
    const sh = h / scale
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h)
}

export interface SignDrawing {
    ghost: string
    name: string
    payer: string
    photo: (CanvasImageSource & { height: number; width: number }) | null
    text: { firstName: string; lastName: string; tagline: string }
}

/** The sign at (x, y), `scale` times its SVG size. */
export const drawSign = (ctx: CanvasLike, x: number, y: number, scale: number, sign: SignDrawing): void => {
    ctx.save()
    ctx.translate(x, y)
    ctx.transform(scale, 0, 0, scale, 0, 0)
    ctx.fillStyle = SIGN_COLORS.background
    ctx.fillRect(0, 0, SIGN.width, SIGN.height)
    if (sign.photo) drawCover(ctx, sign.photo, 0, SIGN.photo.y, SIGN.width, SIGN.photo.h)

    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillStyle = SIGN_COLORS.firstName
    ctx.font = display(800)(SIGN.firstName.size)
    ctx.fillText(sign.text.firstName.toUpperCase(), SIGN.padX, SIGN.firstName.y)
    ctx.fillStyle = SIGN_COLORS.lastName
    ctx.font = display(800)(SIGN.lastName.size)
    ctx.fillText(sign.text.lastName.toUpperCase(), SIGN.padX - 4, SIGN.lastName.y)
    ctx.fillStyle = SIGN_COLORS.tagline
    ctx.font = `600 ${SIGN.tagline.size}px "${BODY_FONT}"`
    ctx.fillText(sign.text.tagline, SIGN.padX, SIGN.tagline.y)

    ctx.fillStyle = SIGN_COLORS.band
    ctx.fillRect(0, SIGN.band.y, SIGN.width, SIGN.band.h)
    const name = sign.name.trim()
    ctx.textAlign = 'center'
    ctx.fillStyle = name ? SIGN_COLORS.name : SIGN_COLORS.ghost
    fitFontSize(ctx, name || sign.ghost, display(700), SIGN.width - 2 * SIGN.padX, SIGN.nameText.size, 24)
    ctx.fillText(name || sign.ghost, SIGN.width / 2, SIGN.nameText.y)

    ctx.fillStyle = SIGN_COLORS.payer
    ctx.font = `400 ${SIGN.payer.size}px "${BODY_FONT}"`
    ctx.fillText(sign.payer, SIGN.width / 2, SIGN.payer.y)
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
