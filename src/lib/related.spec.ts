import { describe, expect, it } from 'vitest'

import { rankedKeys, type RelatedFile, relatedNewsletterIds, relatedPostIds } from './related'

const file: RelatedFile = {
    entries: {
        'newsletter:2': {
            ranked: [
                { key: 'newsletter:7', p: 0.6 },
                { key: 'newsletter:4', p: 0.3 },
            ],
            sourceHash: 'b',
        },
        'post:57': {
            ranked: [
                { key: 'post:71', p: 0.5 },
                { key: 'post:76', p: 0.3 },
                { key: 'newsletter:2', p: 0.1 },
                { key: 'post:12', p: 0.1 },
            ],
            sourceHash: 'a',
        },
    },
}

describe('related.json reader', () => {
    it('returns ranked keys best first and nothing for an unknown document', () => {
        expect(rankedKeys('post:57', file)).toEqual(['post:71', 'post:76', 'newsletter:2', 'post:12'])
        expect(rankedKeys('post:1', file)).toEqual([])
    })

    it('keeps only ids of the requested kind, in ranked order', () => {
        expect(relatedPostIds(57, file)).toEqual([71, 76, 12])
        expect(relatedNewsletterIds(2, file)).toEqual([7, 4])
        expect(relatedPostIds(1, file)).toEqual([])
    })

    it('reads the committed file by default and finds an entry for post 10', () => {
        expect(relatedPostIds(10).length).toBeGreaterThan(0)
        expect(relatedPostIds(10)).not.toContain(10)
    })
})
