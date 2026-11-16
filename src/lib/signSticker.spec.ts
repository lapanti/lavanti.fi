import { describe, expect, it } from 'vitest'

import {
    estimateWidth,
    fitStickerLabel,
    fitStickerName,
    labelFont,
    type Measure,
    nameFont,
    STICKER,
    twoLineSplits,
} from './signSticker'

/** Big Shoulders Display bold widths (em) measured in Chrome, for names that exercise the fit. */
const MEASURED: Record<string, number> = {
    'Anna-Liisa Väisänen-Ødeg': 8.95,
    'Sinun nimesi': 4.42,
    'Väisänen-Ødeg': 5.12,
    WWWWWWWWWWWWWWWWWWWWWWWW: 15.97,
}

const size = (font: string) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1])

/** Half a unit per character at the font size, like the share image recorder. */
const halfEm: Measure = (text, font) => text.length * 0.5 * size(font)

/** Half-chord of the sticker circle at `dy` from its centre. */
const halfChord = (dy: number) => Math.sqrt(STICKER.r ** 2 - dy ** 2)

describe('STICKER', () => {
    it('keeps every line width inside the circle at the line’s outermost edge', () => {
        // Cap height about 0.75 em above the baseline, descenders 0.25 em below.
        const extent = (y: number, s: number) => Math.max(Math.abs(y - 0.75 * s), Math.abs(y + 0.25 * s))
        const { label, nameOne, nameTwo } = STICKER
        expect(nameOne.width).toBeLessThan(2 * halfChord(extent(nameOne.y, nameOne.max)))
        for (const y of nameTwo.ys) expect(nameTwo.width).toBeLessThan(2 * halfChord(extent(y, nameTwo.max)))
        for (const y of label.ys) expect(label.width).toBeLessThan(2 * halfChord(extent(y, label.size)))
    })

    it('stays on the sign', () => {
        expect(STICKER.cx + STICKER.r).toBeLessThanOrEqual(600)
        expect(STICKER.cy + STICKER.r).toBeLessThan(860)
    })
})

describe('estimateWidth', () => {
    it.each(Object.entries(MEASURED))('never under-estimates %s', (text, em) => {
        expect(estimateWidth(text, nameFont(40))).toBeGreaterThanOrEqual(em * 40)
        expect(estimateWidth(text, nameFont(40))).toBeLessThan(em * 40 * 1.25)
    })

    it('reads body text wider than display text', () => {
        expect(estimateWidth('Den här skylten', labelFont(15))).toBeGreaterThan(
            estimateWidth('Den här skylten', nameFont(15))
        )
        expect(estimateWidth('x', 'bold serif')).toBeGreaterThan(0)
    })
})

describe('twoLineSplits', () => {
    it('breaks at spaces and after hyphens', () => {
        expect(twoLineSplits('Anna-Liisa Väisänen')).toEqual([
            ['Anna-', 'Liisa Väisänen'],
            ['Anna-Liisa', 'Väisänen'],
        ])
    })

    it('halves a name with nowhere to break', () => {
        expect(twoLineSplits('Abcdefgh')).toEqual([['Abcd', 'efgh']])
        expect(twoLineSplits('A')).toEqual([])
    })
})

describe('fitStickerName', () => {
    const real: Measure = (text, font) => (MEASURED[text] ?? estimateWidth(text, font) / size(font)) * size(font)

    it('keeps a short name on one line at full size', () => {
        expect(fitStickerName('Sjoerd', halfEm)).toEqual({ lines: ['Sjoerd'], size: 40, ys: [STICKER.nameOne.y] })
    })

    it('keeps the ghost text on one line', () => {
        const fit = fitStickerName('Sinun nimesi', real)
        expect(fit.lines).toEqual(['Sinun nimesi'])
        expect(fit.size).toBeGreaterThanOrEqual(STICKER.nameOne.min)
    })

    it('wraps a 24-character name onto two lines that both fit', () => {
        const fit = fitStickerName('Anna-Liisa Väisänen-Ødeg', real)
        expect(fit.lines).toEqual(['Anna-Liisa', 'Väisänen-Ødeg'])
        expect(fit.ys).toEqual([...STICKER.nameTwo.ys])
        for (const line of fit.lines) expect(real(line, nameFont(fit.size))).toBeLessThanOrEqual(STICKER.nameTwo.width)
    })

    it('fits 24 of the widest letter, on the server estimate too', () => {
        for (const measure of [real, estimateWidth]) {
            const fit = fitStickerName('W'.repeat(24), measure)
            expect(fit.lines).toHaveLength(2)
            const width = fit.lines.length === 1 ? STICKER.nameOne.width : STICKER.nameTwo.width
            for (const line of fit.lines) expect(measure(line, nameFont(fit.size))).toBeLessThanOrEqual(width)
        }
    })

    it('shrinks a slightly long name on one line before wrapping it', () => {
        const fit = fitStickerName('Ab', (text, font) => 4 * size(font))
        expect(fit).toEqual({ lines: ['Ab'], size: 39, ys: [STICKER.nameOne.y] })
    })

    it('stays on one line when wrapping would not make it larger', () => {
        const fit = fitStickerName('Ab', (text, font) => (text === 'Ab' ? 6 : 100) * size(font))
        expect(fit).toEqual({ lines: ['Ab'], size: 26, ys: [STICKER.nameOne.y] })
    })
})

describe('fitStickerLabel', () => {
    it('uses the label size when both lines fit and one shared smaller size when not', () => {
        expect(fitStickerLabel(['Tämän kyltin', 'adoptoi'], halfEm).size).toBe(STICKER.label.size)
        const long = fitStickerLabel(['Den här skylten adopterades', 'av'], halfEm)
        expect(long.size).toBeLessThan(STICKER.label.size)
        expect(halfEm('Den här skylten adopterades', labelFont(long.size))).toBeLessThanOrEqual(STICKER.label.width)
        expect(long.ys).toEqual([...STICKER.label.ys])
    })
})
