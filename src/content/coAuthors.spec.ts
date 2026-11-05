import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { coAuthors, expandCoAuthor } from './coAuthors'

const postsDir = path.resolve(__dirname, 'posts')

const metaAuthors = (): unknown[] =>
    readdirSync(postsDir).flatMap((id) => {
        const meta = JSON.parse(readFileSync(path.join(postsDir, id, 'meta.json'), 'utf-8')) as { authors?: unknown[] }

        return meta.authors ?? []
    })

describe('coAuthors', () => {
    it('keys every entry by the kebab-case ASCII form of its name', () => {
        for (const [id, { name }] of Object.entries(coAuthors)) {
            const expected = name
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .toLowerCase()
                .replace(/\s+/g, '-')
            expect(id).toBe(expected)
        }
    })

    it('resolves every meta.json author id', () => {
        const coAuthorEntries = metaAuthors().filter((author) => author !== 'lauri') as string[]
        for (const author of coAuthorEntries) expect(() => expandCoAuthor(author)).not.toThrow()
    })
})

describe('expandCoAuthor', () => {
    it('expands a bare id to the registry entry', () => {
        expect(expandCoAuthor('arttu-laitinen')).toEqual({
            id: 'arttu-laitinen',
            name: 'Arttu Laitinen',
            url: 'https://markkinavihreat.fi/ketka/arttu-laitinen/',
        })
    })

    it('keeps the post role next to the registry entry', () => {
        expect(expandCoAuthor({ id: 'ronja-karkinen', role: { fi: 'valtuutettu' } })).toEqual({
            id: 'ronja-karkinen',
            name: 'Ronja Karkinen',
            role: { fi: 'valtuutettu' },
        })
    })

    it('passes an inline entry through', () => {
        expect(expandCoAuthor({ name: 'Guest Writer', role: 'yrittäjä' })).toEqual({
            name: 'Guest Writer',
            role: 'yrittäjä',
        })
    })

    it('throws on an unknown id', () => {
        expect(() => expandCoAuthor('no-such-person')).toThrow(/Unknown co-author id "no-such-person"/)
    })
})
