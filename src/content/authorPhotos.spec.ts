import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { authorPhotos, resolveAuthorImage } from './authorPhotos'

const originalsDir = path.resolve(__dirname, '../images/originals')

/*
 * The eras already published. A post's author photo must never change after it goes
 * live, so this list may only grow: append the new era here and in authorPhotos.ts.
 * Changing a line that is already here is changing the photo on published posts.
 */
const FROZEN = [
    { from: '2021-01-01', image: 'Lauri-Lavanti-kadet-puuskassa-ulkona' },
    { from: '2024-09-25', image: 'Lauri-Lavanti-nojaamassa-kasiin' },
    { from: '2025-10-06', image: 'Lauri-Lavanti-seisoo-suorassa-sinisella-taustalla' },
    { from: '2026-08-26', image: 'Lauri-Lavanti-virallinen-puoluekuva' },
]

describe('authorPhotos', () => {
    it('keeps every published era unchanged; new eras are appended', () => {
        expect(authorPhotos.slice(0, FROZEN.length)).toEqual(FROZEN)
    })

    it('is in strictly ascending date order', () => {
        const dates = authorPhotos.map(({ from }) => from)
        for (let i = 1; i < dates.length; i++) expect(dates[i] > dates[i - 1]).toBe(true)
    })

    // src/images/originals/ is gitignored, so this runs only where the originals exist.
    it.skipIf(!existsSync(originalsDir))('has an original for every portrait', () => {
        const missing = authorPhotos.filter(
            ({ image }) => !['jpg', 'png'].some((ext) => existsSync(path.join(originalsDir, `${image}.${ext}`)))
        )
        expect(missing).toEqual([])
    })
})

describe('resolveAuthorImage', () => {
    it('picks the era covering the publish date, inclusive of its start', () => {
        expect(resolveAuthorImage('2024-09-24')).toBe('Lauri-Lavanti-kadet-puuskassa-ulkona')
        expect(resolveAuthorImage('2024-09-25')).toBe('Lauri-Lavanti-nojaamassa-kasiin')
        expect(resolveAuthorImage('2025-10-05')).toBe('Lauri-Lavanti-nojaamassa-kasiin')
        expect(resolveAuthorImage('2025-10-06')).toBe('Lauri-Lavanti-seisoo-suorassa-sinisella-taustalla')
        expect(resolveAuthorImage('2026-08-26')).toBe('Lauri-Lavanti-virallinen-puoluekuva')
    })

    it('gives posts before the first era the first portrait', () => {
        expect(resolveAuthorImage('2019-05-01')).toBe(authorPhotos[0].image)
    })

    it('gives future posts the latest portrait', () => {
        expect(resolveAuthorImage('2099-01-01')).toBe(authorPhotos.at(-1)?.image)
    })

    it('lets a per-post authorImage override the era', () => {
        expect(resolveAuthorImage('2021-09-27', 'Some-other-photo')).toBe('Some-other-photo')
    })
})
