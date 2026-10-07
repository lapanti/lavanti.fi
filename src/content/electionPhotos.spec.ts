import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { jpegWidth } from '../../tests/jpegWidth'
import { electionPhotos } from './electionPhotos'

const langs = ['en', 'fi', 'sv'] as const
const originalsDir = path.resolve(__dirname, '../images/originals')

describe('electionPhotos', () => {
    it('has three photos with unique slugs, so the strip renders as a grid', () => {
        expect(electionPhotos).toHaveLength(3)
        expect(new Set(electionPhotos.map(({ slug }) => slug)).size).toBe(electionPhotos.length)
    })

    it('gives every photo a non-empty alt and caption in every locale', () => {
        for (const { alt, caption } of electionPhotos) {
            for (const lang of langs) {
                expect(alt[lang].trim()).not.toBe('')
                expect(caption[lang].trim()).not.toBe('')
            }
        }
    })

    it('credits only the kick-off photo', () => {
        expect(electionPhotos.map(({ photographer }) => photographer)).toEqual([undefined, undefined, 'Erkki Laine'])
    })

    // src/images/originals/ is gitignored, so this runs only where the originals exist.
    it.skipIf(!existsSync(originalsDir))('keeps every srcset width within the original pixel width', () => {
        for (const { slug, widths } of electionPhotos) {
            const file = path.join(originalsDir, `${slug}.jpg`)
            expect(existsSync(file), `missing original for ${slug}`).toBe(true)
            expect(Math.max(...widths)).toBeLessThanOrEqual(jpegWidth(file))
        }
    })
})
