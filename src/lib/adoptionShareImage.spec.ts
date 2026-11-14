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
    type SignDrawing,
    STRIPE_RUN,
    wrapText,
} from './adoptionShareImage'
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
        drawImage: record('drawImage'),
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
    name: 'Sjoerd',
    payer: 'Mainoksen maksaja: Digitaalisen itsenäisyyden puolesta ry',
    photo: null,
    text: { firstName: 'Lauri', lastName: 'Lavanti', tagline: 'Eduskuntavaalit 2027 · Uusimaa' },
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
    it('draws the name, or the ghost text when the name is empty', () => {
        const { calls, ctx } = recorder()
        drawSign(ctx, 10, 20, 0.5, sign)
        const texts = calls.filter((c) => c.op === 'fillText').map((c) => c.args[0])
        expect(texts).toEqual(['LAURI', 'LAVANTI', sign.text.tagline, 'Sjoerd', sign.payer])
        expect(calls[0].op).toBe('save')
        expect(calls.at(-1)?.op).toBe('restore')

        const ghost = recorder()
        drawSign(ghost.ctx, 0, 0, 1, { ...sign, name: '  ' })
        const nameCall = ghost.calls.filter((c) => c.op === 'fillText')[3]
        expect(nameCall.args[0]).toBe('Sinun nimesi')
        expect(nameCall.fill).toBe('rgba(22, 62, 53, 0.55)')
    })

    it('crops the photo to cover its box', () => {
        const { calls, ctx } = recorder()
        const photo = { height: 480, width: 800 } as unknown as SignDrawing['photo']
        drawSign(ctx, 0, 0, 1, { ...sign, photo })
        const draw = calls.find((c) => c.op === 'drawImage')
        // 800 × 480 into 600 × 440: scale by height (440/480), crop the sides evenly.
        const sw = 600 / (440 / 480)
        expect(draw?.args.slice(1)).toEqual([(800 - sw) / 2, 0, sw, 480, 0, 0, 600, 440])
    })
})

describe('drawShareImage', () => {
    it('draws the chrome, headline, sign, call to action and one stripe run', () => {
        const { calls, ctx } = recorder()
        const logo = { height: 410, width: 1316 } as unknown as SignDrawing['photo']
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
