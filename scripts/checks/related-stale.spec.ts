import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { buildCorpus } from '../jev/corpus'
import { candidateSetHash, type RelatedFile, serialize } from '../jev/related'
import { runCheck } from './related-stale'

const writeDoc = (root: string, kind: 'newsletters' | 'posts', id: number, body: string): void => {
    const dir = join(root, kind, String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate: '2026-01-01', tags: ['economy'] }))
    for (const lang of ['en', 'fi', 'sv']) {
        writeFileSync(join(dir, `${lang}.mdx`), `---\ntitle: 'Doc ${id}'\ndescription: 'About ${id}'\n---\n\n${body}\n`)
    }
}

describe('runCheck', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-check-'))
    const path = join(root, 'related.json')
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    writeDoc(root, 'posts', 1, 'One.')
    writeDoc(root, 'posts', 2, 'Two.')
    writeDoc(root, 'newsletters', 1, 'Issue.')

    const inSync = (): RelatedFile => {
        const corpus = buildCorpus({ root })

        return {
            candidateSetHash: candidateSetHash(corpus),
            entries: Object.fromEntries(
                corpus.map((d) => [
                    d.key,
                    {
                        ranked:
                            d.kind === 'post'
                                ? [{ key: d.id === 1 ? ('post:2' as const) : ('post:1' as const), p: 0.5 }]
                                : [],
                        sourceHash: d.sourceHash,
                    },
                ])
            ),
            generatedAt: '2026-09-23',
            model: 'typesafe/jev-1.13-20260917',
        }
    }

    it('exits 0 silently when in sync', () => {
        writeFileSync(path, serialize(inSync()))
        const lines: string[] = []

        expect(runCheck({ log: (l) => lines.push(l), path, root })).toBe(0)
        expect(lines).toEqual([])
    })

    it('exits 1 naming the regen command when the file is missing', () => {
        rmSync(path, { force: true })
        const lines: string[] = []

        expect(runCheck({ log: (l) => lines.push(l), path, root })).toBe(1)
        expect(lines[0]).toContain('missing or malformed')
        expect(lines.at(-1)).toContain('npm run generate:related')
    })

    it('exits 1 naming the edited document', () => {
        writeFileSync(path, serialize(inSync()))
        writeDoc(root, 'posts', 2, 'Two, edited.')
        const lines: string[] = []

        expect(runCheck({ log: (l) => lines.push(l), path, root })).toBe(1)
        expect(lines[0]).toBe('related.json stale: post:2: content changed since generation')
        writeDoc(root, 'posts', 2, 'Two.')
    })

    it('exits 1 on a deleted document (dangling entry) and on an added one (candidate set)', () => {
        writeFileSync(path, serialize(inSync()))
        writeDoc(root, 'posts', 3, 'Three.')
        const added: string[] = []

        expect(runCheck({ log: (l) => added.push(l), path, root })).toBe(1)
        expect(added).toEqual([
            'related.json stale: candidate set changed (a document was added or removed)',
            'related.json stale: post:3: no entry',
            expect.stringContaining('npm run generate:related'),
        ])

        rmSync(join(root, 'posts', '3'), { force: true, recursive: true })
        rmSync(join(root, 'posts', '2'), { force: true, recursive: true })
        const removed: string[] = []

        expect(runCheck({ log: (l) => removed.push(l), path, root })).toBe(1)
        expect(removed).toContain('related.json stale: post:2: entry for a document that no longer exists')
        expect(removed).toContain('related.json stale: post:1: ranked key post:2 no longer exists')
        writeDoc(root, 'posts', 2, 'Two.')
    })
})
