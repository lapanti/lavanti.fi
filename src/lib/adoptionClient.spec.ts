import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    isInAppBrowser,
    joinNames,
    loadWall,
    parseThanksParams,
    pollPayment,
    readStoredAdoption,
    resetWall,
    setSignName,
    STORAGE_KEY,
    thanksHref,
    writeStoredAdoption,
} from './adoptionClient'
import { estimateWidth, STICKER } from './signSticker'

describe('setSignName', () => {
    const page = () => {
        const { document } = new Window()
        document.body.innerHTML = `<figure data-sign data-ghost="Sinun nimesi"><svg><text data-sign-name data-fill-ghost="grey" data-fill-name="green">Sinun nimesi</text></svg></figure>`

        return document as unknown as Document
    }

    it('writes the name as text and switches to the name colour', () => {
        const doc = page()
        setSignName(doc, '<b>Sjoerd</b>')
        const text = doc.querySelector('[data-sign-name]')!
        expect(text.textContent).toBe('<b>Sjoerd</b>')
        expect(text.querySelector('b')).toBeNull()
        expect(text.getAttribute('fill')).toBe('green')
        setSignName(doc, '  ')
        expect(text.textContent).toBe('Sinun nimesi')
        expect(text.getAttribute('fill')).toBe('grey')
    })

    it('centres one line in the sticker', () => {
        const doc = page()
        setSignName(doc, 'Sjoerd', (t, font) => t.length * 0.5 * Number(/(\d+)px/.exec(font)?.[1]))
        const spans = doc.querySelectorAll('[data-sign-name] tspan')
        expect(spans).toHaveLength(1)
        expect(spans[0].getAttribute('x')).toBe(String(STICKER.cx))
        expect(spans[0].getAttribute('y')).toBe(String(STICKER.cy + STICKER.nameOne.y))
        expect(doc.querySelector('[data-sign-name]')!.getAttribute('font-size')).toBe(String(STICKER.nameOne.max))
    })

    it('wraps a long name onto two lines and shrinks it to fit the sticker', () => {
        const doc = page()
        setSignName(doc, 'Anna-Liisa Väisänen-Ødeg', (t, font) => t.length * 0.5 * Number(/([\d.]+)px/.exec(font)?.[1]))
        const spans = [...doc.querySelectorAll('[data-sign-name] tspan')]
        expect(spans.map((s) => s.textContent)).toEqual(['Anna-Liisa', 'Väisänen-Ødeg'])
        expect(spans.map((s) => s.getAttribute('y'))).toEqual(STICKER.nameTwo.ys.map((y) => String(STICKER.cy + y)))
        const size = Number(doc.querySelector('[data-sign-name]')!.getAttribute('font-size'))
        expect(13 * 0.5 * size).toBeLessThanOrEqual(STICKER.nameTwo.width)
    })

    it('falls back to the width estimate without a 2D canvas', () => {
        const doc = page()
        setSignName(doc, 'W'.repeat(24))
        const size = Number(doc.querySelector('[data-sign-name]')!.getAttribute('font-size'))
        expect(size).toBeGreaterThan(0)
        expect(estimateWidth('W'.repeat(12), `700 ${size}px "Big Shoulders Display"`)).toBeLessThanOrEqual(
            STICKER.nameTwo.width
        )
    })

    it('measures on a canvas when the browser has one', () => {
        const doc = page()
        const measureText = vi.fn((t: string) => ({ width: t.length * 10 }))
        vi.spyOn(doc, 'createElement').mockReturnValue({
            getContext: () => ({ font: '', measureText }),
        } as unknown as HTMLElement)
        setSignName(doc, 'Sjoerd')
        expect(measureText).toHaveBeenCalledWith('Sjoerd')
        // 60 units wide at any size: fits at the full size.
        expect(doc.querySelector('[data-sign-name]')!.getAttribute('font-size')).toBe(String(STICKER.nameOne.max))
    })
})

describe('loadWall', () => {
    afterEach(() => resetWall())

    it('fetches the wall once and shares the result', async () => {
        const body = { messages: [], municipalities: {}, names: ['A', 'B', 'C'], signs: 5 }
        const fetchFn = vi.fn(async () => new Response(JSON.stringify(body)))
        expect(await loadWall(fetchFn)).toEqual(body)
        expect(await loadWall(fetchFn)).toEqual(body)
        expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('reads a failed fetch as an empty wall', async () => {
        const empty = { messages: [], municipalities: {}, names: [], signs: null }
        expect(await loadWall(async () => new Response('', { status: 503 }))).toEqual(empty)
        resetWall()
        expect(
            await loadWall(async () => {
                throw new Error('offline')
            })
        ).toEqual(empty)
    })
})

describe('thanksHref', () => {
    it('carries the ref, count and company flag only', () => {
        expect(thanksHref('/fi/adoptoi/kiitos/', { company: true, quantity: 3, ref: 'K-12345' })).toBe(
            '/fi/adoptoi/kiitos/?ref=K-12345&n=3&y=1'
        )
        expect(thanksHref('/fi/adoptoi/kiitos/', { company: false, quantity: 1, ref: 'K-12345', unnamed: true })).toBe(
            '/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=0&u=1'
        )
    })

    it.each(['//evil.example/', 'javascript:alert(1)', 'https://evil.example/', '/\\evil.example/', 'fi/kiitos/'])(
        'refuses %s as the thanks path',
        (path) => {
            expect(() => thanksHref(path, { company: false, quantity: 1, ref: 'K-12345' })).toThrow('lomake')
        }
    )
})

const memory = () => {
    const data = new Map<string, string>()

    return {
        data,
        storage: () => ({
            getItem: (k: string) => data.get(k) ?? null,
            setItem: (k: string, v: string) => void data.set(k, v),
        }),
    }
}

describe('parseThanksParams', () => {
    it('accepts the three validated keys', () => {
        expect(parseThanksParams('?ref=K-48213&n=2&y=0')).toEqual({
            company: false,
            quantity: 2,
            ref: 'K-48213',
            unnamed: false,
        })
        expect(parseThanksParams('ref=K-48213&n=10&y=1')).toMatchObject({ company: true, quantity: 10, unnamed: false })
    })

    it('reads the optional no-name flag', () => {
        expect(parseThanksParams('?ref=K-48213&n=2&y=0&u=1')).toMatchObject({ unnamed: true })
        expect(parseThanksParams('?ref=K-48213&n=2&y=0&u=0')).toMatchObject({ unnamed: false })
    })

    it('reads the flag MobilePay returns with, and leaves it out of the thanks link', () => {
        const params = parseThanksParams('?ref=K-48213&n=5&y=0&u=1&mp=1')
        expect(params).toMatchObject({ quantity: 5, returned: true, unnamed: true })
        expect(parseThanksParams('?ref=K-48213&n=5&y=0')?.returned).toBeUndefined()
        expect(thanksHref('/fi/adoptoi/kiitos/', params!)).toBe('/fi/adoptoi/kiitos/?ref=K-48213&n=5&y=0&u=1')
    })

    it.each([
        '?ref=K-48213&n=1&y=0&mp=2',
        '?ref=K-48213&n=1&y=0&u=2',
        '?ref=K-48213&n=1&y=0&u=',
        '',
        '?ref=K-4821&n=1&y=0',
        '?ref=<script>&n=1&y=0',
        '?ref=K-48213&n=0&y=0',
        '?ref=K-48213&n=21&y=0',
        '?ref=K-48213&n=1&y=2',
        '?ref=K-48213&n=1',
        '?ref=K-48213&n=1&y=0&name=Sjoerd',
    ])('rejects %s', (search) => {
        expect(parseThanksParams(search)).toBeNull()
    })
})

describe('pollPayment', () => {
    const answers = (...states: (null | string)[]) => {
        const urls: string[] = []
        const fetchFn = (async (url: string) => {
            urls.push(url)
            const state = states.shift()
            if (state === null) throw new Error('offline')

            return Response.json({ state })
        }) as typeof fetch

        return { fetchFn, urls }
    }
    const noWait = async () => {}

    it('asks until MobilePay has an answer', async () => {
        const { fetchFn, urls } = answers('pending', null, 'paid')
        expect(await pollPayment('K-48213', fetchFn, 15, noWait)).toBe('paid')
        expect(urls).toEqual(Array(3).fill('/api/adoptoi/maksu?ref=K-48213'))
        expect(await pollPayment('K-48213', answers('failed').fetchFn, 15, noWait)).toBe('failed')
    })

    it('gives up as pending after the last try', async () => {
        const { fetchFn, urls } = answers('pending', 'pending', 'pending')
        expect(await pollPayment('K-48213', fetchFn, 3, noWait)).toBe('pending')
        expect(urls).toHaveLength(3)
    })
})

describe('stored adoption', () => {
    it('round-trips through storage', () => {
        const { data, storage } = memory()
        expect(writeStoredAdoption(storage, { name: 'Sjoerd', quantity: 2, ref: 'K-1', token: 't' })).toBe(true)
        expect(data.has(STORAGE_KEY)).toBe(true)
        expect(readStoredAdoption(storage)).toEqual({ name: 'Sjoerd', quantity: 2, ref: 'K-1', token: 't' })
    })

    it('returns null for empty, foreign or broken values and blocked storage', () => {
        const { data, storage } = memory()
        expect(readStoredAdoption(storage)).toBeNull()
        data.set(STORAGE_KEY, '{"name":1}')
        expect(readStoredAdoption(storage)).toBeNull()
        data.set(STORAGE_KEY, '{')
        expect(readStoredAdoption(storage)).toBeNull()
        data.set(STORAGE_KEY, '{"name":"A","ref":"K-1","token":"t"}')
        expect(readStoredAdoption(storage)?.quantity).toBe(1)
        const blocked = () => {
            throw new Error('SecurityError')
        }
        expect(readStoredAdoption(blocked)).toBeNull()
        expect(writeStoredAdoption(blocked, { name: 'A', quantity: 1, ref: 'K-1', token: 't' })).toBe(false)
    })
})

describe('joinNames', () => {
    it('joins with the language conjunction', () => {
        expect(joinNames(['Sjoerd', 'Anna', 'Mikko'], 'fi')).toBe('Sjoerd, Anna ja Mikko')
        expect(joinNames(['Sjoerd', 'Anna', 'Mikko'], 'sv')).toBe('Sjoerd, Anna och Mikko')
        expect(joinNames(['Sjoerd', 'Anna'], 'en')).toBe('Sjoerd and Anna')
    })
})

describe('share helpers', () => {
    it('spots the Instagram and Facebook in-app browsers', () => {
        expect(isInAppBrowser('Mozilla/5.0 (iPhone) Instagram 300.0')).toBe(true)
        expect(isInAppBrowser('Mozilla/5.0 [FBAN/FBIOS;FBAV/400.0]')).toBe(true)
        expect(isInAppBrowser('Mozilla/5.0 (iPhone) Safari/604.1')).toBe(false)
    })
})
