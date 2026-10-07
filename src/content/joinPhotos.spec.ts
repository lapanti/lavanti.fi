import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { jpegWidth } from '../../tests/jpegWidth'
import { joinPhotos } from './joinPhotos'

const langs = ['en', 'fi', 'sv'] as const
const originalsDir = path.resolve(__dirname, '../images/originals')

describe('joinPhotos', () => {
    it('has three photos with unique slugs', () => {
        expect(joinPhotos).toHaveLength(3)
        expect(new Set(joinPhotos.map(({ slug }) => slug)).size).toBe(joinPhotos.length)
    })

    it('gives every photo a non-empty alt and caption in every locale', () => {
        for (const { alt, caption } of joinPhotos) {
            for (const lang of langs) {
                expect(alt[lang].trim()).not.toBe('')
                expect(caption[lang].trim()).not.toBe('')
            }
        }
    })

    it('credits the kick-off photos and leaves the market photo uncredited', () => {
        expect(joinPhotos.map(({ photographer }) => photographer)).toEqual(['Erkki Laine', 'Erkki Laine', undefined])
    })

    it('lists ascending srcset widths for every photo', () => {
        for (const { widths } of joinPhotos) {
            expect(widths.length).toBeGreaterThan(0)
            expect([...widths].sort((a, b) => a - b)).toEqual(widths)
        }
    })

    // src/images/originals/ is gitignored, so this runs only where the originals exist.
    it.skipIf(!existsSync(originalsDir))('keeps every srcset width within the original pixel width', () => {
        for (const { slug, widths } of joinPhotos) {
            const file = path.join(originalsDir, `${slug}.jpg`)
            expect(existsSync(file), `missing original for ${slug}`).toBe(true)
            expect(Math.max(...widths)).toBeLessThanOrEqual(jpegWidth(file))
        }
    })
})
