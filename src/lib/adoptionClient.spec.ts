import { describe, expect, it } from 'vitest'

import {
    isInAppBrowser,
    joinNames,
    parseThanksParams,
    readStoredAdoption,
    shareUrl,
    STORAGE_KEY,
    writeStoredAdoption,
} from './adoptionClient'

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
