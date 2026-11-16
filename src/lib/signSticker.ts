/**
 * The round name sticker on the Adoptoi kyltti sign (spec: .agents/specs/sign-adoption/spec.md).
 *
 * The sticker is a white circle with a small two-line label ("Tämän kyltin" / "adoptoi") over the
 * adopter's name. The name takes one line when it fits large enough and otherwise wraps onto two,
 * and the font shrinks until every line fits the circle's chord at its height, so a 24-character
 * name never spills out. The layout is pure: the SVG sign (server and browser) and the canvas
 * share image all call `fitStickerName` with their own `measure`. No imports, so the form script
 * can bundle it without the share image code.
 */

export const DISPLAY_FONT = 'Big Shoulders Display'
export const BODY_FONT = 'IBM Plex Sans'

/** Sticker geometry in sign units. Line positions are baselines relative to the centre. */
export const STICKER = {
    cx: 496,
    cy: 520,
    label: { size: 15, width: 134, ys: [-46, -27] },
    /** One name line, at most `max` units tall; below `min` it wraps instead. */
    nameOne: { max: 40, min: 28, width: 156, y: 30 },
    /** Two name lines: the lower one sits low in the circle, so both get its narrower chord. */
    nameTwo: { max: 30, width: 140, ys: [12, 46] },
    r: 96,
} as const

/** Width of `text` set in a CSS `font` such as `700 40px "Big Shoulders Display"`. */
export type Measure = (text: string, font: string) => number

export const nameFont = (size: number): string => `700 ${size}px "${DISPLAY_FONT}"`
export const labelFont = (size: number): string => `600 ${size}px "${BODY_FONT}"`

const NARROW = new Set([..." -.,'’iIjlftr"])
const WIDE = new Set([...'mwMWÆØŒ@'])

/**
 * A server-side stand-in for measureText, from per-character widths of Big Shoulders Display
 * (bold) and IBM Plex Sans, rounded up. Over-estimating only makes a name a little smaller.
 */
export const estimateWidth: Measure = (text, font) => {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16)
    const body = font.includes(BODY_FONT)
    let em = 0
    for (const ch of text) {
        if (body) em += NARROW.has(ch) ? 0.3 : WIDE.has(ch) ? 0.85 : 0.56
        else em += NARROW.has(ch) ? 0.22 : WIDE.has(ch) ? 0.68 : ch === ch.toUpperCase() ? 0.45 : 0.4
    }

    return em * size * 1.08
}

/** Largest size up to `max` at which `text` is at most `width` wide (widths scale with size). */
const sizeToFit = (text: string, measure: Measure, font: (size: number) => string, width: number, max: number) => {
    const w = measure(text, font(max))
    if (w <= width) return max

    return Math.floor(((max * width) / w) * 2) / 2
}

/** Ways to put a name on two lines: at each space (dropped) and after each hyphen (kept). */
export const twoLineSplits = (name: string): [string, string][] => {
    const splits: [string, string][] = []
    for (let i = 1; i < name.length - 1; i++) {
        if (name[i] === ' ') splits.push([name.slice(0, i), name.slice(i + 1)])
        else if (name[i] === '-') splits.push([name.slice(0, i + 1), name.slice(i + 1)])
    }
    // A name with nowhere to break still wraps, halfway, rather than shrinking to a sliver.
    if (!splits.length && name.length > 1) {
        const half = Math.ceil(name.length / 2)
        splits.push([name.slice(0, half), name.slice(half)])
    }

    return splits.filter(([a, b]) => a.trim() && b.trim())
}

export interface StickerText {
    lines: string[]
    size: number
    /** Baselines relative to the sticker centre, one per line. */
    ys: number[]
}

/** The name (or ghost text) inside the sticker: one line if it fits large enough, else two. */
export const fitStickerName = (name: string, measure: Measure): StickerText => {
    const { nameOne: one, nameTwo: two } = STICKER
    const oneSize = sizeToFit(name, measure, nameFont, one.width, one.max)
    if (oneSize >= one.min) return { lines: [name], size: oneSize, ys: [one.y] }

    let best: StickerText | undefined
    for (const lines of twoLineSplits(name)) {
        const size = Math.min(...lines.map((l) => sizeToFit(l, measure, nameFont, two.width, two.max)))
        if (!best || size > best.size) best = { lines, size, ys: [...two.ys] }
    }

    return best && best.size > oneSize ? best : { lines: [name], size: oneSize, ys: [one.y] }
}

/** The two label lines at one shared size that fits both. */
export const fitStickerLabel = (label: readonly string[], measure: Measure): StickerText => {
    const { label: l } = STICKER
    const size = Math.min(...label.map((line) => sizeToFit(line, measure, labelFont, l.width, l.size)))

    return { lines: [...label], size, ys: [...l.ys] }
}
