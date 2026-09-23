import type { DocKey, Document } from './corpus'

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import {
    candidateSetHash,
    candidatesFor,
    findStale,
    mergeEntry,
    planRequests,
    rankAnswer,
    RANKED_MAX,
    readRelatedFile,
    type RelatedFile,
    serialize,
    sortKeys,
} from './related'

const doc = (key: DocKey, publishDate = '2026-01-01', sourceHash = `h-${key}`): Document => ({
    description: `${key} description`,
    h2s: [],
    id: Number(key.split(':')[1]),
    key,
    kind: key.startsWith('post') ? 'post' : 'newsletter',
    lang: 'en',
    lead: '',
    paragraphs: [],
    publishDate,
    sourceHash,
    tags: [],
    title: key,
})

const corpus = [
    doc('post:10'),
    doc('post:2', '2026-02-01'),
    doc('post:9', '2026-02-01'),
    doc('newsletter:1'),
    doc('newsletter:3'),
]

const inSync = (): RelatedFile => ({
    candidateSetHash: candidateSetHash(corpus),
    entries: Object.fromEntries(corpus.map((d) => [d.key, { ranked: [], sourceHash: d.sourceHash }])),
    generatedAt: '2026-09-23',
    model: 'typesafe/jev-1.13-20260917',
})

describe('ordering and hashing', () => {
    it('sorts keys by kind then numeric id', () => {
        expect(sortKeys(['post:10', 'newsletter:3', 'post:9', 'post:2', 'newsletter:1'])).toEqual([
            'newsletter:1',
            'newsletter:3',
            'post:2',
            'post:9',
            'post:10',
        ])
    })

    it('hashes the candidate set independent of corpus order and changes when a document is added', () => {
        const shuffled = [...corpus].reverse()

        expect(candidateSetHash(shuffled)).toBe(candidateSetHash(corpus))
        expect(candidateSetHash([...corpus, doc('post:11')])).not.toBe(candidateSetHash(corpus))
    })

    it('picks candidates of the same kind, excluding self, in canonical order', () => {
        expect(candidatesFor(doc('post:9'), corpus).map((d) => d.key)).toEqual(['post:2', 'post:10'])
        expect(candidatesFor(doc('newsletter:1'), corpus).map((d) => d.key)).toEqual(['newsletter:3'])
    })
})

describe('rankAnswer', () => {
    it('rounds, drops zeros, ignores unknown keys and breaks ties by date then id', () => {
        const candidates = candidatesFor(doc('newsletter:1'), [...corpus, doc('post:11'), doc('post:12', '2026-03-01')])
        const posts = candidatesFor(doc('post:10'), [...corpus, doc('post:11'), doc('post:12', '2026-03-01')])

        expect(candidates.map((d) => d.key)).toEqual(['newsletter:3'])
        expect(
            rankAnswer({ 'post:2': 0.3, 'post:9': 0.3, 'post:11': 0.004, 'post:12': 0.3, stray: 0.9 }, posts)
        ).toEqual([
            { key: 'post:12', p: 0.3 },
            { key: 'post:9', p: 0.3 },
            { key: 'post:2', p: 0.3 },
        ])
    })

    it('keeps at most RANKED_MAX items', () => {
        const many = Array.from({ length: 15 }, (_unused, i) => doc(`post:${i + 20}`))
        const probabilities = Object.fromEntries(many.map((d, i) => [d.key, (i + 1) / 100]))

        expect(rankAnswer(probabilities, many)).toHaveLength(RANKED_MAX)
        expect(rankAnswer(probabilities, many)[0]).toEqual({ key: 'post:34', p: 0.15 })
    })
})

describe('mergeEntry', () => {
    const stored = {
        ranked: [
            { key: 'post:2' as const, p: 0.5 },
            { key: 'post:9' as const, p: 0.3 },
            { key: 'post:10' as const, p: 0.1 },
            { key: 'post:11' as const, p: 0.05 },
        ],
        sourceHash: 'old',
    }
    const sameTopDrift = {
        ranked: [
            { key: 'post:2' as const, p: 0.48 },
            { key: 'post:9' as const, p: 0.33 },
            { key: 'post:10' as const, p: 0.12 },
        ],
        sourceHash: 'new',
    }
    const reordered = {
        ranked: [
            { key: 'post:9' as const, p: 0.5 },
            { key: 'post:2' as const, p: 0.3 },
        ],
        sourceHash: 'new',
    }

    it('keeps the stored list and updates the hash when the top three is unchanged on an edit-only run', () => {
        expect(mergeEntry(stored, sameTopDrift, { rewriteAll: false })).toEqual({
            ranked: stored.ranked,
            sourceHash: 'new',
        })
    })

    it('takes the fresh list when the top three changed, when rewriting everything, or without a stored entry', () => {
        expect(mergeEntry(stored, reordered, { rewriteAll: false })).toBe(reordered)
        expect(mergeEntry(stored, sameTopDrift, { rewriteAll: true })).toBe(sameTopDrift)
        expect(mergeEntry(undefined, sameTopDrift, { rewriteAll: false })).toBe(sameTopDrift)
    })
})

describe('planRequests', () => {
    it('asks nothing when the file is in sync', () => {
        expect(planRequests(inSync(), corpus, false)).toEqual({ keys: [], rewriteAll: false })
    })

    it('asks only the changed documents on an edit', () => {
        const edited = corpus.map((d) => (d.key === 'post:9' ? doc('post:9', d.publishDate, 'changed') : d))

        expect(planRequests(inSync(), edited, false)).toEqual({ keys: ['post:9'], rewriteAll: false })
    })

    it('asks everything when the candidate set changed, the file is missing, or --force is given', () => {
        const all = ['newsletter:1', 'newsletter:3', 'post:2', 'post:9', 'post:10']

        expect(planRequests(inSync(), [...corpus, doc('post:11')], false)).toEqual({
            keys: [...all, 'post:11'],
            rewriteAll: true,
        })
        expect(planRequests(null, corpus, false)).toEqual({ keys: all, rewriteAll: true })
        expect(planRequests(inSync(), corpus, true)).toEqual({ keys: all, rewriteAll: true })
    })
})

describe('findStale', () => {
    it('is empty when in sync', () => {
        expect(findStale(inSync(), corpus)).toEqual([])
    })

    it('names a missing file, a wrong model, a changed candidate set, missing and stale entries, and dangling keys', () => {
        expect(findStale(null, corpus)[0]).toContain('missing or malformed')

        const file = inSync()
        file.model = 'jev-2.0'
        file.entries['post:9'].sourceHash = 'stale'
        delete file.entries['post:2']
        file.entries['post:99'] = { ranked: [{ key: 'post:98', p: 0.5 }], sourceHash: 'x' }
        const problems = findStale(file, corpus)

        expect(problems).toEqual([
            expect.stringContaining('model jev-2.0 is not jev-1.13'),
            'post:2: no entry',
            'post:9: content changed since generation',
            'post:99: entry for a document that no longer exists',
            'post:99: ranked key post:98 no longer exists',
        ])
        expect(findStale({ ...inSync(), candidateSetHash: 'other' }, corpus)).toEqual([
            'candidate set changed (a document was added or removed)',
        ])
    })
})

describe('readRelatedFile and serialize', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jev-related-'))
    afterAll(() => rmSync(dir, { force: true, recursive: true }))

    it('round-trips a file with entries in canonical order and a trailing newline', () => {
        const file = inSync()
        const path = join(dir, 'related.json')
        writeFileSync(path, serialize(file))
        const text = serialize(file)

        expect(text.endsWith('}\n')).toBe(true)
        expect(Object.keys(readRelatedFile(path)!.entries)).toEqual([
            'newsletter:1',
            'newsletter:3',
            'post:2',
            'post:9',
            'post:10',
        ])
        expect(serialize(readRelatedFile(path)!)).toBe(text)
    })

    it('returns null for a missing, unparseable or misshapen file', () => {
        const bad = join(dir, 'bad.json')
        writeFileSync(bad, '{ not json')
        const misshapen = join(dir, 'misshapen.json')
        writeFileSync(misshapen, JSON.stringify({ entries: { 'post:1': { ranked: 'nope' } } }))
        const badItem = join(dir, 'bad-item.json')
        writeFileSync(badItem, serialize(inSync()).replace('"ranked": []', '"ranked": [{ "key": 3 }]'))
        const arrayEntries = join(dir, 'array-entries.json')
        writeFileSync(arrayEntries, JSON.stringify({ ...inSync(), entries: [] }))

        expect(readRelatedFile(join(dir, 'none.json'))).toBeNull()
        expect(readRelatedFile(bad)).toBeNull()
        expect(readRelatedFile(misshapen)).toBeNull()
        expect(readRelatedFile(badItem)).toBeNull()
        expect(readRelatedFile(arrayEntries)).toBeNull()
    })
})
