import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { aboutPhotos, aboutPhotosBySection } from './aboutPhotos'

const langs = ['en', 'fi', 'sv'] as const
const originalsDir = path.resolve(__dirname, '../images/originals')

/** Pixel width from the first SOF marker of a baseline or progressive JPEG. */
const jpegWidth = (file: string): number => {
    const buf = readFileSync(file)
    let offset = 2
    while (offset < buf.length) {
        if (buf[offset] !== 0xff) throw new Error(`${file}: bad JPEG marker at ${offset}`)
        const marker = buf[offset + 1]
        const length = buf.readUInt16BE(offset + 2)
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
            return buf.readUInt16BE(offset + 7)
        }
        offset += 2 + length
    }
    throw new Error(`${file}: no SOF marker`)
}

describe('aboutPhotos', () => {
    it('has twelve photos with unique slugs', () => {
        expect(aboutPhotos).toHaveLength(12)
        expect(new Set(aboutPhotos.map(({ slug }) => slug)).size).toBe(aboutPhotos.length)
    })

    it('gives every photo a non-empty alt and caption in every locale', () => {
        for (const { alt, caption } of aboutPhotos) {
            for (const lang of langs) {
                expect(alt[lang].trim()).not.toBe('')
                expect(caption[lang].trim()).not.toBe('')
            }
        }
    })

    it('starts every caption with the photo year', () => {
        for (const { caption, year } of aboutPhotos) {
            for (const lang of langs) {
                expect(caption[lang].startsWith(`${year} – `)).toBe(true)
            }
        }
    })

    it('is in chronological order from 2005 to 2026', () => {
        const years = aboutPhotos.map(({ year }) => year)
        expect(years).toEqual([...years].sort((a, b) => a - b))
        expect(years[0]).toBe(2005)
        expect(years.at(-1)).toBe(2026)
    })

    it('splits into three strips of four, each in chronological order', () => {
        for (const photos of Object.values(aboutPhotosBySection)) {
            expect(photos).toHaveLength(4)
            const years = photos.map(({ year }) => year)
            expect(years).toEqual([...years].sort((a, b) => a - b))
        }
        expect(Object.values(aboutPhotosBySection).flat()).toHaveLength(aboutPhotos.length)
    })

    it('credits only the Finland–Japan photo', () => {
        const credited = aboutPhotos.filter(({ photographer }) => photographer).map(({ slug }) => slug)
        expect(credited).toEqual(['Lauri-Lavanti-maajoukkue-Suomi-Japani-2015-vaaka'])
    })

    it('never uses the Helsingin yliopisto photo', () => {
        expect(aboutPhotos.some(({ slug }) => /yliopistolla/i.test(slug))).toBe(false)
    })

    it('lists ascending srcset widths for every photo', () => {
        for (const { widths } of aboutPhotos) {
            expect(widths.length).toBeGreaterThan(0)
            expect([...widths].sort((a, b) => a - b)).toEqual(widths)
        }
    })

    // src/images/originals/ is gitignored, so this runs only where the originals exist.
    it.skipIf(!existsSync(originalsDir))('keeps every srcset width within the original pixel width', () => {
        for (const { slug, widths } of aboutPhotos) {
            const file = path.join(originalsDir, `${slug}.jpg`)
            expect(existsSync(file), `missing original for ${slug}`).toBe(true)
            expect(Math.max(...widths)).toBeLessThanOrEqual(jpegWidth(file))
        }
    })
})
