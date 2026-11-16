import { describe, expect, it } from 'vitest'

import {
    type CanvasLike,
    drawShareImage,
    drawSign,
    fitFontSize,
    SHARE_PAD,
    SHARE_SIZES,
    shareLayout,
    SIGN,
    SIGN_COLORS,
    type SignDrawing,
    STRIPE_RUN,
    wrapText,
} from './adoptionShareImage'
import { STICKER } from './signSticker'
import { colors } from './styles'

interface Call {
    args: unknown[]
    fill?: unknown
    font?: string
    op: string
}

/** Records every call; text is 0.5 em per character at the current font size. */
const recorder = () => {
    const calls: Call[] = []
    const ctx = {
        fillStyle: '' as CanvasLike['fillStyle'],
        font: '10px x',
        textAlign: 'left' as CanvasTextAlign,
        textBaseline: 'alphabetic' as CanvasTextBaseline,
    } as CanvasLike
    const record =
        (op: string) =>
        (...args: unknown[]) =>
            void calls.push({ args, fill: ctx.fillStyle, font: ctx.font, op })
    Object.assign(ctx, {
        arc: record('arc'),
        beginPath: record('beginPath'),
        drawImage: record('drawImage'),
        fill: record('fill'),
        fillRect: record('fillRect'),
        fillText: record('fillText'),
        measureText: (text: string) => ({ width: text.length * 0.5 * Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 10) }),
        restore: record('restore'),
        rotate: record('rotate'),
        save: record('save'),
        transform: record('transform'),
        translate: record('translate'),
    })

    return { calls, ctx }
}

const sign: SignDrawing = {
    ghost: 'Sinun nimesi',
    image: null,
    name: 'Sjoerd',
    text: {
        firstName: 'Lauri',
        lastName: 'Lavanti',
        payer: ['Mainoksen maksaja:', 'Digitaalisen itsenäisyyden puolesta ry'],
        sticker: ['Tämän kyltin', 'adoptoi'],
    },
}

describe('wrapText', () => {
    it('wraps greedily and keeps a long word on its own line', () => {
        const { ctx } = recorder()
        ctx.font = '20px x'
        expect(wrapText(ctx, 'aa bb cc dd', 60)).toEqual(['aa bb', 'cc dd'])
        expect(wrapText(ctx, 'abcdefghijkl x', 60)).toEqual(['abcdefghijkl', 'x'])
        expect(wrapText(ctx, '  ', 60)).toEqual([])
    })
})

describe('fitFontSize', () => {
    it('shrinks until the text fits, never below the minimum', () => {
        const { ctx } = recorder()
        const font = (s: number) => `${s}px x`
        expect(fitFontSize(ctx, 'abcd', font, 100, 46, 24)).toBe(46)
        expect(fitFontSize(ctx, 'a'.repeat(8), font, 100, 46, 24)).toBe(24)
        expect(fitFontSize(ctx, 'a'.repeat(7), font, 100, 46, 24)).toBe(28)
        expect(fitFontSize(ctx, 'a'.repeat(50), font, 100, 46, 24)).toBe(24)
        expect(ctx.font).toBe('24px x')
    })
})

describe('shareLayout', () => {
    it.each(['story', 'feed'] as const)('keeps the %s sign inside the padding and above the call to action', (f) => {
        const { height, width } = SHARE_SIZES[f]
        const l = shareLayout(f, 2)
        expect(l.sign.x).toBeGreaterThanOrEqual(SHARE_PAD - 0.001)
        expect(l.sign.x + SIGN.width * l.sign.scale).toBeLessThanOrEqual(width - SHARE_PAD + 0.001)
        expect(l.sign.y).toBeGreaterThan(l.headline.y + 2 * l.headline.lineHeight)
        expect(l.sign.y + SIGN.height * l.sign.scale).toBeLessThan(l.cta.y - l.cta.size)
        expect(l.stripe.y + STRIPE_RUN.length * l.stripe.band).toBe(height)
    })
})

describe('drawSign', () => {
    it('draws the name in the sticker, or the ghost text when the name is empty', () => {
        const { calls, ctx } = recorder()
        drawSign(ctx, 10, 20, 0.5, sign)
        const texts = calls.filter((c) => c.op === 'fillText').map((c) => c.args[0])
        expect(texts).toEqual(['Tämän kyltin', 'adoptoi', 'Sjoerd', ...sign.text.payer])
        expect(calls[0].op).toBe('save')
        expect(calls.at(-1)?.op).toBe('restore')
        const arc = calls.find((c) => c.op === 'arc')
        expect(arc?.args.slice(0, 3)).toEqual([STICKER.cx, STICKER.cy, STICKER.r])
        expect(arc?.fill).toBe(SIGN_COLORS.sticker)
        const name = calls.filter((c) => c.op === 'fillText')[2]
        expect(name.args.slice(1)).toEqual([STICKER.cx, STICKER.cy + STICKER.nameOne.y])
        expect(name.fill).toBe(SIGN_COLORS.name)

        const ghost = recorder()
        drawSign(ghost.ctx, 0, 0, 1, { ...sign, name: '  ' })
        // At the recorder's wide half-em letters the ghost text takes two lines.
        const nameCalls = ghost.calls.filter((c) => c.op === 'fillText').slice(2, -2)
        expect(nameCalls.map((c) => c.args[0]).join(' ')).toBe('Sinun nimesi')
        for (const c of nameCalls) expect(c.fill).toBe('rgba(22, 62, 53, 0.55)')
    })

    it('wraps a 24-character name onto two lines inside the sticker', () => {
        const { calls, ctx } = recorder()
        drawSign(ctx, 0, 0, 1, { ...sign, name: 'Anna-Liisa Väisänen-Ødeg' })
        const lines = calls.filter((c) => c.op === 'fillText').slice(2, 4)
        expect(lines.map((c) => c.args[0])).toEqual(['Anna-Liisa', 'Väisänen-Ødeg'])
        for (const line of lines) {
            expect(line.font).toMatch(/^700 [\d.]+px/)
            const size = Number(/(\d+(?:\.\d+)?)px/.exec(line.font ?? '')?.[1])
            expect(String(line.args[0]).length * 0.5 * size).toBeLessThanOrEqual(STICKER.nameTwo.width)
        }
        expect(lines.map((c) => c.args[2])).toEqual(STICKER.nameTwo.ys.map((y) => STICKER.cy + y))
    })

    it('draws the draft over the ground, then masks its stray font label', () => {
        const { calls, ctx } = recorder()
        const image = { height: 1400, width: 987 } as unknown as SignDrawing['image']
        drawSign(ctx, 0, 0, 1, { ...sign, image })
        const draws = calls.filter((c) => ['drawImage', 'fillRect'].includes(c.op))
        expect(draws.map((c) => c.op)).toEqual(['fillRect', 'drawImage', 'fillRect'])
        expect(draws[1].args.slice(1)).toEqual([0, 0, SIGN.width, SIGN.height])
        const { mask } = SIGN
        expect(draws[2]).toMatchObject({ args: [mask.x, mask.y, mask.w, mask.h], fill: SIGN_COLORS.ground })
        // The label ("BIG SHOULDERS") spans x 1152–1309, y 34–49 on the draft.
        expect(mask.x).toBeLessThan(1152)
        expect(mask.x + mask.w).toBeGreaterThan(1309)
        expect(mask.y).toBeLessThan(34)
        expect(mask.y + mask.h).toBeGreaterThan(49)
    })

    it('keeps the payer line between the party logo and LAVANTI.FI, under the stripes', () => {
        const { calls, ctx } = recorder()
        drawSign(ctx, 0, 0, 1, sign)
        const payer = calls.filter((c) => c.op === 'fillText').slice(-2)
        expect(payer.map((c) => c.args.slice(1))).toEqual(SIGN.payer.ys.map((y) => [SIGN.payer.x, y]))
        for (const line of sign.text.payer) {
            const half = (line.length * 0.5 * SIGN.payer.size) / 2
            expect(SIGN.payer.x - half).toBeGreaterThan(338)
            expect(SIGN.payer.x + half).toBeLessThan(930)
        }
        expect(SIGN.payer.ys[0] - SIGN.payer.size).toBeGreaterThan(1872) // the stripe's lowest edge
        expect(SIGN.payer.ys[1]).toBeLessThan(SIGN.height - 0.25 * SIGN.payer.size)
    })
})

describe('drawShareImage', () => {
    it('draws the chrome, headline, sign, call to action and one stripe run', () => {
        const { calls, ctx } = recorder()
        const logo = { height: 410, width: 1316 } as unknown as SignDrawing['image']
        const layout = drawShareImage(ctx, 'story', {
            ...sign,
            cta: 'Adoptoi sinäkin: lavanti.fi/adoptoi',
            headline: 'Adoptoin Lauri Lavannin vaalikyltin',
            logo,
        })
        expect(calls[0]).toMatchObject({ args: [0, 0, 1080, 1920], fill: '#163E35', op: 'fillRect' })
        const texts = calls.filter((c) => c.op === 'fillText').map((c) => c.args[0])
        expect(texts).toContain('Adoptoi sinäkin: lavanti.fi/adoptoi')
        expect(texts.join(' ')).toContain('Adoptoin Lauri')
        const stripes = calls.slice(-STRIPE_RUN.length)
        expect(stripes.map((c) => c.fill)).toEqual(STRIPE_RUN)
        expect(stripes.at(-1)?.fill).toBe(colors.darkGreen)
        const logoCall = calls.find((c) => c.op === 'drawImage')
        expect(logoCall?.args[3]).toBeCloseTo((1316 / 410) * layout.logo.height)
    })

    it('never draws dark green text', () => {
        const { calls, ctx } = recorder()
        drawShareImage(ctx, 'feed', { ...sign, cta: 'x', headline: 'y', logo: null })
        for (const c of calls.filter((x) => x.op === 'fillText')) expect(c.fill).not.toBe(colors.darkGreen)
    })
})
