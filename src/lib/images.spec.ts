import { describe, expect, it, vi } from 'vitest'

import { getDownloadUrl, getHeroPreload, getImage, getImageSrcset, HERO_CONFIGS } from './images'

vi.unmock('./images')

const BASE = 'https://lavanti.fi/images'

describe('getImage', () => {
    it('returns correct URL for 1x1 variant', () => {
        const result = getImage('test-slug', '1x1')
        expect(result.src).toBe(`${BASE}/test-slug/w=1680,h=1680,fit=crop,gravity=face,format=auto`)
        expect(result.width).toBe(1680)
        expect(result.height).toBe(1680)
    })

    it('returns correct URL for og variant', () => {
        const result = getImage('test-slug', 'og')
        expect(result.src).toBe(`${BASE}/test-slug/w=1200,h=630,fit=crop,gravity=face,format=auto`)
        expect(result.width).toBe(1200)
        expect(result.height).toBe(630)
    })

    it('returns correct URL for hero variant', () => {
        const result = getImage('test-slug', 'hero')
        expect(result.src).toBe(`${BASE}/test-slug/w=1728,h=1320,fit=crop,gravity=face,format=auto`)
        expect(result.width).toBe(1728)
        expect(result.height).toBe(1320)
    })

    it('returns a small face-cropped square for the avatar variant', () => {
        const result = getImage('test-slug', 'avatar')
        expect(result.src).toBe(`${BASE}/test-slug/w=384,h=384,fit=crop,gravity=face,format=auto`)
    })

    it('encodes slug with special characters', () => {
        const result = getImage('slug with spaces & chars', '1x1')
        expect(result.src).toContain('slug%20with%20spaces%20%26%20chars')
    })

    it('throws on unknown variant', () => {
        expect(() => getImage('test-slug', 'nonexistent')).toThrow('Unknown image variant: nonexistent')
    })
})

describe('getDownloadUrl', () => {
    it('returns a full-resolution scale-down JPEG URL with defaults', () => {
        expect(getDownloadUrl('test-slug')).toBe(`${BASE}/test-slug/w=3000,fit=scale-down,quality=90,format=jpeg`)
    })

    it('forces format=jpeg rather than format=auto', () => {
        const url = getDownloadUrl('test-slug')
        expect(url).toContain('format=jpeg')
        expect(url).not.toContain('format=auto')
    })

    it('honours custom width and quality', () => {
        expect(getDownloadUrl('test-slug', 2000, 80)).toBe(
            `${BASE}/test-slug/w=2000,fit=scale-down,quality=80,format=jpeg`
        )
    })

    it('encodes slug with special characters', () => {
        expect(getDownloadUrl('slug with spaces & chars')).toContain('slug%20with%20spaces%20%26%20chars')
    })
})

describe('getImageSrcset', () => {
    it('returns correct srcset for 1x1 variant', () => {
        const result = getImageSrcset('test-slug', '1x1', [560, 1120, 1680])
        expect(result.srcset).toBe(
            `${BASE}/test-slug/w=560,h=560,fit=crop,gravity=face,format=auto 560w, ${BASE}/test-slug/w=1120,h=1120,fit=crop,gravity=face,format=auto 1120w, ${BASE}/test-slug/w=1680,h=1680,fit=crop,gravity=face,format=auto 1680w`
        )
        expect(result.width).toBe(1680)
        expect(result.height).toBe(1680)
        expect(result.src).toBe(`${BASE}/test-slug/w=1680,h=1680,fit=crop,gravity=face,format=auto`)
    })

    it('computes correct heights for non-square variants', () => {
        const result = getImageSrcset('test-slug', 'hero', [864, 1728])
        expect(result.srcset).toContain('w=864,h=660')
        expect(result.srcset).toContain('w=1728,h=1320')
        expect(result.height).toBe(1320)
        expect(result.width).toBe(1728)
    })

    it('uses auto gravity for background variant', () => {
        const result = getImageSrcset('test-slug', 'background', [960, 1920])
        expect(result.srcset).toContain('gravity=auto')
    })

    it('keeps the video variant at 16:9 so a poster matches the player box', () => {
        const result = getImageSrcset('test-slug', 'video', [640, 1280])
        expect(result.srcset).toContain('w=640,h=360')
        expect(result.srcset).toContain('w=1280,h=720')
    })

    it('throws on unknown variant', () => {
        expect(() => getImageSrcset('test-slug', 'nonexistent', [560])).toThrow('Unknown image variant: nonexistent')
    })
})

describe('getHeroPreload', () => {
    it.each(Object.entries(HERO_CONFIGS))('mirrors the %s config markup byte-for-byte', (_name, config) => {
        const preload = getHeroPreload('test-slug', config)
        const markup = getImageSrcset('test-slug', config.variant, [...config.widths])
        expect(preload.imagesrcset).toBe(markup.srcset)
        expect(preload.imagesizes).toBe(config.sizes)
    })

    it('builds the post hero preload from the hero variant', () => {
        const preload = getHeroPreload('test-slug', HERO_CONFIGS.postHero)
        expect(preload.imagesrcset).toContain(`${BASE}/test-slug/w=864,h=660,fit=crop,gravity=face,format=auto 864w`)
        expect(preload.imagesrcset).toContain('w=1728,h=1320')
        expect(preload.imagesizes).toBe('(max-width: 1223px) 100vw, 1224px')
    })

    it('keeps the art-directed pair mutually exclusive by sizes', () => {
        expect(getHeroPreload('s', HERO_CONFIGS.landscape).imagesizes).toBe('100vw')
        expect(getHeroPreload('s', HERO_CONFIGS.portrait).imagesizes).toBe('470px')
    })
})
