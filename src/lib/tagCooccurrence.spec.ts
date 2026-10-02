import { describe, expect, it } from 'vitest'

import { relatedTags } from './tagCooccurrence'

const known = new Set(['economy', 'freedom', 'kirkkonummi', 'nature', 'privacy', 'technology'])

describe('relatedTags', () => {
    it('ranks by Jaccard over unique post ids, so a ubiquitous tag does not win on raw counts', () => {
        const posts = [
            { id: 1, tags: ['economy', 'kirkkonummi'] },
            { id: 1, tags: ['economy', 'kirkkonummi'] }, // another locale of post 1
            { id: 2, tags: ['economy', 'kirkkonummi', 'technology'] },
            { id: 3, tags: ['economy', 'technology'] },
            { id: 4, tags: ['kirkkonummi'] },
            { id: 5, tags: ['kirkkonummi'] },
            { id: 6, tags: ['kirkkonummi'] },
            { id: 7, tags: ['kirkkonummi'] },
        ]

        expect(relatedTags(posts, 'economy', known)).toEqual([
            { id: 'technology', shared: 2 },
            { id: 'kirkkonummi', shared: 2 },
        ])
    })

    it('breaks ties by shared count, then id, and caps the list', () => {
        const posts = [
            { id: 1, tags: ['economy', 'privacy', 'nature', 'freedom', 'technology', 'kirkkonummi'] },
            { id: 2, tags: ['economy', 'freedom', 'technology'] },
        ]

        expect(relatedTags(posts, 'economy', known, 3)).toEqual([
            { id: 'freedom', shared: 2 },
            { id: 'technology', shared: 2 },
            { id: 'kirkkonummi', shared: 1 },
        ])
    })

    it('ignores unknown tags and returns nothing for a tag no post carries', () => {
        const posts = [{ id: 1, tags: ['economy', 'gone', 'nature'] }]

        expect(relatedTags(posts, 'economy', known)).toEqual([{ id: 'nature', shared: 1 }])
        expect(relatedTags(posts, 'privacy', known)).toEqual([])
    })
})
