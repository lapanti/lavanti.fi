import type { DocKey, Document } from './corpus'

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import {
    emptyReceipts,
    findUnchecked,
    hasReceipt,
    readReceipts,
    recordReceipt,
    serializeReceipts,
    writeReceipts,
} from './suggestions'

const doc = (key: DocKey, contentHash = `c-${key}`): Document => ({
    body: '',
    contentHash,
    description: '',
    h2s: [],
    id: Number(key.split(':')[1]),
    key,
    kind: key.startsWith('post') ? 'post' : 'newsletter',
    lang: 'fi',
    lead: '',
    paragraphs: [],
    publishDate: '2026-01-01',
    slug: 's',
    sourceHash: 'h',
    tags: [],
    title: key,
})

describe('receipts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jev-receipts-'))
    afterAll(() => rmSync(dir, { force: true, recursive: true }))

    it('records, matches on content hash only, and round-trips in canonical order', () => {
        const file = emptyReceipts()
        recordReceipt(file, 'links', doc('post:9'), 'm', '2026-09-23')
        recordReceipt(file, 'links', doc('post:2'), 'm', '2026-09-23')
        recordReceipt(file, 'backlinks', doc('newsletter:2'), 'm', '2026-09-23')

        expect(hasReceipt(file, 'links', doc('post:9'))).toBe(true)
        expect(hasReceipt(file, 'links', doc('post:9', 'edited'))).toBe(false)
        expect(hasReceipt(file, 'backlinks', doc('post:9'))).toBe(false)
        expect(hasReceipt(null, 'links', doc('post:9'))).toBe(false)
        const path = join(dir, 'suggestions.json')
        writeReceipts(path, file)
        const text = serializeReceipts(file)

        expect(text.startsWith('{\n  "backlinks": {\n    "newsletter:2"')).toBe(true)
        expect(Object.keys(readReceipts(path)!.links)).toEqual(['post:2', 'post:9'])
        expect(serializeReceipts(readReceipts(path)!)).toBe(text)
    })

    it('returns null for a missing, unparseable or misshapen file', () => {
        const bad = join(dir, 'bad.json')
        writeFileSync(bad, '{')
        const misshapen = join(dir, 'misshapen.json')
        writeFileSync(misshapen, JSON.stringify({ links: { 'post:1': { contentHash: 1 } } }))

        expect(readReceipts(join(dir, 'none.json'))).toBeNull()
        expect(readReceipts(bad)).toBeNull()
        expect(readReceipts(misshapen)).toBeNull()
    })

    it('lists missing and stale receipts per changed document, newsletters needing backlinks too', () => {
        const file = emptyReceipts()
        recordReceipt(file, 'links', doc('post:1'), 'm', '2026-09-23')
        recordReceipt(file, 'links', doc('post:2', 'old'), 'm', '2026-09-23')
        recordReceipt(file, 'links', doc('newsletter:3'), 'm', '2026-09-23')

        expect(findUnchecked(file, [doc('post:1')])).toEqual([])
        expect(findUnchecked(file, [doc('post:2'), doc('post:4'), doc('newsletter:3')])).toEqual([
            'post:2: links changed since the last run — npm run suggest:links -- post 2',
            'post:4: links never run — npm run suggest:links -- post 4',
            'newsletter:3: backlinks never run — npm run suggest:links -- --backlinks newsletter 3',
        ])
        expect(findUnchecked(null, [doc('post:1')])).toEqual([
            'post:1: links never run — npm run suggest:links -- post 1',
        ])
    })
})
