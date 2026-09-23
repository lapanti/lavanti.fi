import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
    EDITORIAL_TAGS,
    hashTagFile,
    loadTagLabels,
    partition,
    PILLAR_TAGS,
    predictedAt,
    registeredTagIds,
    tagIdsFromPaths,
    tagQuestions,
} from './tags'

describe('labels and registry', () => {
    it('loads 34 English labels from the real tag files and every editorial and pillar tag exists', async () => {
        const labels = await loadTagLabels()
        const ids = labels.map((l) => l.id)

        expect(labels).toHaveLength(34)
        expect(tagQuestions(labels).economy).toEqual({
            instructions: expect.stringMatching(/^This article belongs in the category 'Economy': Finland/),
            type: 'noul',
        })
        for (const id of [...EDITORIAL_TAGS, ...PILLAR_TAGS]) expect(ids).toContain(id)
        expect(registeredTagIds()).toEqual(new Set(ids))
    })

    it('rejects a tag file without a LocalTag export or English fields', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'jev-tags-'))
        const noEnglish = join(dir, 'no-english')
        mkdirSync(noEnglish)
        writeFileSync(join(dir, 'broken.ts'), 'export const nothing = 1\n')
        writeFileSync(
            join(noEnglish, 'x.ts'),
            "export const t = { id: 'x', names: { fi: 'x' }, descriptions: { fi: ['x'] } }\n"
        )

        await expect(loadTagLabels(dir)).rejects.toThrow('broken.ts: no LocalTag export')
        await expect(loadTagLabels(noEnglish)).rejects.toThrow('x.ts: missing names.en')
        rmSync(dir, { force: true, recursive: true })
    })

    it('reads the registry from the import lines of tags.ts', () => {
        const dir = mkdtempSync(join(tmpdir(), 'jev-registry-'))
        const registry = join(dir, 'tags.ts')
        writeFileSync(
            registry,
            "import type { LocalTag } from './tags/types'\n\nimport { aTag } from './tags/a-tag'\nimport { bTag } from './tags/b-tag'\n"
        )

        expect(registeredTagIds(registry)).toEqual(new Set(['a-tag', 'b-tag']))
        rmSync(dir, { force: true, recursive: true })
    })
})

describe('partition', () => {
    const probabilities = {
        'artificial-intelligence': 0.9,
        'coop-elections': 0.95,
        economy: 0.1,
        immigration: 0.85,
        infrastructure: 0.72,
        kirkkonummi: 0.05,
        'municipal-elections-2025': 0.01,
        transportation: 0.4,
    }

    it('splits into consider, doubtful and pillar; editorial tags never, pillar tags only as doubtful', () => {
        const result = partition(
            probabilities,
            ['economy', 'kirkkonummi', 'municipal-elections-2025', 'transportation'],
            {
                consider: 0.7,
                doubtful: 0.2,
            }
        )

        expect(result.consider).toEqual([
            { id: 'immigration', p: 0.85 },
            { id: 'infrastructure', p: 0.72 },
        ])
        expect(result.doubtful).toEqual([
            { id: 'kirkkonummi', p: 0.05 },
            { id: 'economy', p: 0.1 },
        ])
        expect(result.pillar).toEqual([
            { assigned: false, id: 'artificial-intelligence', p: 0.9 },
            { assigned: false, id: 'digital-independence', p: 0 },
            { assigned: true, id: 'economy', p: 0.1 },
            { assigned: false, id: 'culture-and-education', p: 0 },
            { assigned: false, id: 'freedom', p: 0 },
        ])
    })

    it('honours custom thresholds', () => {
        const result = partition(probabilities, ['transportation'], { consider: 0.3, doubtful: 0.5 })

        expect(result.consider.map((c) => c.id)).toEqual(['immigration', 'infrastructure'])
        expect(result.doubtful).toEqual([{ id: 'transportation', p: 0.4 }])
    })

    it('predictedAt keeps keys at or above the threshold', () => {
        expect(predictedAt({ a: 0.7, b: 0.69, c: 1 }, 0.7)).toEqual(['a', 'c'])
    })
})

describe('paths and hashing', () => {
    it('extracts unique tag ids and ignores types.ts and other files', () => {
        expect(
            tagIdsFromPaths([
                'src/content/tags/economy.ts',
                'src/content/tags/types.ts',
                'src/content/tags.ts',
                'src/content/posts/1/fi.mdx',
                'src/content/tags/economy.ts',
                'src/content/tags/nature.ts',
            ])
        ).toEqual(['economy', 'nature'])
    })

    it('hashes the tag file and changes with its content', () => {
        const dir = mkdtempSync(join(tmpdir(), 'jev-taghash-'))
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'x.ts'), 'a')
        const before = hashTagFile('x', dir)
        writeFileSync(join(dir, 'x.ts'), 'b')

        expect(before).toHaveLength(64)
        expect(hashTagFile('x', dir)).not.toBe(before)
        rmSync(dir, { force: true, recursive: true })
    })
})
