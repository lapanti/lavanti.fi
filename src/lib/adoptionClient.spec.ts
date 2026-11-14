import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    isInAppBrowser,
    joinNames,
    loadWall,
    parseThanksParams,
    readStoredAdoption,
    resetWall,
    setSignName,
    shareUrl,
    STORAGE_KEY,
    thanksHref,
    writeStoredAdoption,
} from './adoptionClient'

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

    it('shrinks a name wider than the band', () => {
        const doc = page()
        const text = doc.querySelector('[data-sign-name]') as unknown as { getComputedTextLength: () => number }
        text.getComputedTextLength = () => 1040
        setSignName(doc, 'Anna-Liisa Kuusiniemi-Ab')
        expect(doc.querySelector('[data-sign-name]')!.getAttribute('font-size')).toBe('23')
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
            '/fi/adoptoi/kiitos/?n=3&ref=K-12345&y=1'
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
        expect(parseThanksParams('?ref=K-48213&n=2&y=0')).toEqual({ company: false, quantity: 2, ref: 'K-48213' })
        expect(parseThanksParams('ref=K-48213&n=20&y=1')).toEqual({ company: true, quantity: 20, ref: 'K-48213' })
    })

    it.each([
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
    it('tags the share URL', () => {
        expect(shareUrl('https://lavanti.fi', '/fi/adoptoi/', 'story')).toBe(
            'https://lavanti.fi/fi/adoptoi/?utm_source=adoptoi&utm_medium=story&utm_campaign=adoptoi-kyltti'
        )
    })

    it('spots the Instagram and Facebook in-app browsers', () => {
        expect(isInAppBrowser('Mozilla/5.0 (iPhone) Instagram 300.0')).toBe(true)
        expect(isInAppBrowser('Mozilla/5.0 [FBAN/FBIOS;FBAV/400.0]')).toBe(true)
        expect(isInAppBrowser('Mozilla/5.0 (iPhone) Safari/604.1')).toBe(false)
    })
})
