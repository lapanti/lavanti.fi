import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { buildCorpus } from '../jev/corpus'
import { emptyReceipts, recordReceipt, writeReceipts } from '../jev/suggestions'
import { runCheck } from './suggestions-stale'

const writeDoc = (root: string, kind: 'newsletters' | 'posts', id: number, body: string): void => {
    const dir = join(root, kind, String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, publishDate: '2026-01-01', tags: ['economy'] }))
    for (const lang of ['en', 'fi', 'sv']) {
        writeFileSync(
            join(dir, `${lang}.mdx`),
            `---\ntitle: 'Doc ${id}'\nslug: 's${id}'\ndescription: 'd'\n---\n\n${body}\n`
        )
    }
}

describe('runCheck', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-suggestions-check-'))
    const path = join(root, 'suggestions.json')
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    writeDoc(root, 'posts', 1, 'One.')
    writeDoc(root, 'posts', 2, 'Two.')
    writeDoc(root, 'newsletters', 3, 'Issue.')

    const receiptsFor = (
        ...keys: Array<'links:post:1' | 'links:post:2' | 'links:newsletter:3' | 'backlinks:newsletter:3'>
    ): void => {
        const file = emptyReceipts()
        const corpus = buildCorpus({ root })
        for (const entry of keys) {
            const [kind, ...rest] = entry.split(':')
            const doc = corpus.find((d) => d.key === rest.join(':'))!
            recordReceipt(file, kind as 'backlinks' | 'links', doc, 'm', '2026-09-23')
        }
        writeReceipts(path, file)
    }

    it('passes when nothing content-related changed, even without a receipts file', () => {
        rmSync(path, { force: true })

        expect(runCheck(['src/content/tags/economy.ts', 'src/pages/fi/about.mdx'], { log: () => {}, path, root })).toBe(
            0
        )
        expect(runCheck([], { log: () => {}, path, root })).toBe(0)
    })

    it('passes when every changed document has a matching receipt', () => {
        receiptsFor('links:post:1', 'links:newsletter:3', 'backlinks:newsletter:3')
        const lines: string[] = []

        expect(
            runCheck(['src/content/posts/1/fi.mdx', 'src/content/newsletters/3/en.mdx'], {
                log: (l) => lines.push(l),
                path,
                root,
            })
        ).toBe(0)
        expect(lines).toEqual([])
    })

    it('fails naming the command for a never-run, a stale and a missing-backlinks document', () => {
        receiptsFor('links:post:1', 'links:newsletter:3')
        writeDoc(root, 'posts', 1, 'One, edited.')
        const lines: string[] = []

        expect(
            runCheck(['src/content/posts/1/fi.mdx', 'src/content/posts/2/sv.mdx', 'src/content/newsletters/3/fi.mdx'], {
                log: (l) => lines.push(l),
                path,
                root,
            })
        ).toBe(1)
        expect(lines).toEqual([
            'link suggestions not run on the final text: post:1: links changed since the last run — npm run suggest:links -- post 1',
            'link suggestions not run on the final text: post:2: links never run — npm run suggest:links -- post 2',
            'link suggestions not run on the final text: newsletter:3: backlinks never run — npm run suggest:links -- --backlinks newsletter 3',
            expect.stringContaining('commit src/content/suggestions.json'),
        ])
        writeDoc(root, 'posts', 1, 'One.')
    })

    it('reads the changed paths from git with --base and skips deleted documents', () => {
        receiptsFor('links:post:2')
        const git = (args: string[]): string => {
            expect(args).toEqual([
                'diff',
                '--name-only',
                '--diff-filter=ACMR',
                'origin/main...HEAD',
                '--',
                'src/content/posts',
                'src/content/newsletters',
            ])

            return 'src/content/posts/2/fi.mdx\nsrc/content/posts/99/fi.mdx\n'
        }

        expect(runCheck(['--base', 'origin/main'], { git, log: () => {}, path, root })).toBe(0)
        expect(runCheck(['--base'], { git, log: () => {}, path, root })).toBe(2)
        expect(runCheck(['--base', 'x', 'file'], { git, log: () => {}, path, root })).toBe(2)
    })
})
