import { describe, expect, it } from 'vitest'

import { changedSlugs, checkChange, PAGES_FILE } from './adoption-pages'

const json = (...slugs: string[]) => JSON.stringify(slugs.map((slug) => ({ lang: 'fi', name: slug, slug })))
const pages = (status = 'M') => ({ path: PAGES_FILE, status })

describe('changedSlugs', () => {
    it('lists added, removed and changed entries', () => {
        expect(changedSlugs(json('a', 'b'), json('a', 'c'))).toEqual(['b', 'c'])
        expect(changedSlugs(json('a'), json('a'))).toEqual([])
        expect(changedSlugs(null, json('a'))).toEqual(['a'])
        const edited = JSON.stringify([{ lang: 'fi', message: 'Hei', name: 'a', slug: 'a' }])
        expect(changedSlugs(json('a'), edited)).toEqual(['a'])
    })

    it('treats broken or non-array JSON as opaque', () => {
        expect(changedSlugs(json('a'), '{')).toEqual(['(unparseable)', 'a'])
        expect(changedSlugs('{}', '[]')).toEqual([])
    })
})

describe('checkChange', () => {
    it('allows one entry in a commit of its own', () => {
        expect(checkChange([pages()], json('a'), json('a', 'b'))).toEqual([])
        expect(checkChange([pages()], json('a', 'b'), json('a'))).toEqual([])
    })

    it('ignores commits that do not touch the file, and the one that creates it', () => {
        expect(checkChange([{ path: 'src/x.ts', status: 'M' }], null, null)).toEqual([])
        expect(checkChange([pages('A'), { path: 'src/x.ts', status: 'A' }], null, '[]')).toEqual([])
    })

    it('fails a commit that mixes the file with other paths', () => {
        expect(checkChange([pages(), { path: 'src/x.ts', status: 'M' }], json('a'), json('a', 'b'))).toEqual([
            `${PAGES_FILE} changes together with src/x.ts`,
        ])
    })

    it('fails a commit that changes two entries', () => {
        expect(checkChange([pages()], json('a'), json('b', 'c'))).toEqual([`${PAGES_FILE} changes 3 entries (a, b, c)`])
    })

    it('counts a deletion of the file as a change', () => {
        expect(checkChange([pages('D'), { path: 'README.md', status: 'M' }], json('a'), null)).toHaveLength(1)
    })
})
