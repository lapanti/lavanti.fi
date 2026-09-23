import type { JevClient, QuestionSpec, SystemOneResponse } from './jev/client'

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { assertOptionCap, runGenerate } from './generate-related'
import { CHOICE_OPTION_MAX } from './jev/client'
import { readRelatedFile, type RelatedFile } from './jev/related'

const writeDoc = (
    root: string,
    kind: 'newsletters' | 'posts',
    id: number,
    body: string,
    publishDate = '2026-01-01'
): void => {
    const dir = join(root, kind, String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(
        join(dir, 'meta.json'),
        JSON.stringify({ id, publishDate, tags: kind === 'posts' ? ['economy'] : undefined })
    )
    for (const lang of ['en', 'fi', 'sv']) {
        writeFileSync(
            join(dir, `${lang}.mdx`),
            `---\ntitle: 'Doc ${id} ${lang}'\ndescription: 'About ${id}'\n---\n\n${body}\n`
        )
    }
}

/** Answers every choice with a fixed preference order, optionally perturbed per call; records calls. */
const fakeClient = (
    prefer: (candidates: string[]) => Record<string, number>,
    opts: { failOn?: string } = {}
): { calls: Array<{ state: unknown; keys: string[] }>; client: JevClient } => {
    const calls: Array<{ state: unknown; keys: string[] }> = []
    const client: JevClient = {
        ask: async (state, questions): Promise<SystemOneResponse> => {
            const q = questions.next_read as Extract<QuestionSpec, { type: 'choice' }>
            const keys = Object.keys(q.criteria)
            calls.push({ keys, state })
            const title = (state as { title: string }).title
            if (opts.failOn && title.includes(opts.failOn)) throw new Error('boom')
            const probabilities = prefer(keys)

            return {
                answers: { next_read: { choice: keys[0], confidence: 0.9, probabilities, type: 'choice' } },
                id: 'r',
                model: 'typesafe/jev-1.13-20260917',
                usage: { cost: 0.0002, input_tokens: 500, output_tokens: 10 },
            }
        },
        provider: { apiKey: 'k', baseUrl: 'http://x', model: 'jev-1.13', name: 'openrouter' },
    }

    return { calls, client }
}

/** Highest probability to the lowest id, then descending. */
const byIdAsc = (keys: string[]): Record<string, number> => {
    const sorted = [...keys].toSorted((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1]))

    return Object.fromEntries(sorted.map((k, i) => [k, Math.max(0.01, 0.5 - i * 0.1)]))
}

describe('assertOptionCap', () => {
    it('allows CHOICE_OPTION_MAX + 1 documents of a kind (self excluded) and throws above that', () => {
        const posts = (n: number): Array<{ kind: 'post' }> => Array.from({ length: n }, () => ({ kind: 'post' }))

        expect(() => assertOptionCap(posts(CHOICE_OPTION_MAX + 1))).not.toThrow()
        expect(() => assertOptionCap(posts(CHOICE_OPTION_MAX + 2))).toThrow('exceed CHOICE_OPTION_MAX=255')
    })
})

describe('runGenerate', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-generate-'))
    const path = join(root, 'related.json')
    const today = (): string => '2026-09-23'
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    beforeEach(() => {
        rmSync(path, { force: true })
        rmSync(join(root, 'posts'), { force: true, recursive: true })
        rmSync(join(root, 'newsletters'), { force: true, recursive: true })
        writeDoc(root, 'posts', 1, 'One.')
        writeDoc(root, 'posts', 2, 'Two.')
        writeDoc(root, 'posts', 3, 'Three.')
        writeDoc(root, 'newsletters', 1, 'Issue one.')
        writeDoc(root, 'newsletters', 2, 'Issue two.')
    })

    it('exits 1 with the notice when no key is set and no file is written', async () => {
        const lines: string[] = []

        expect(await runGenerate([], {}, { log: (l) => lines.push(l), path, root })).toBe(1)
        expect(lines[0]).toContain('skipped: no OPENROUTER_API_KEY')
        expect(readRelatedFile(path)).toBeNull()
    })

    it('rejects a bad --concurrency', async () => {
        expect(
            await runGenerate(['--concurrency', 'x'], { OPENROUTER_API_KEY: 'k' }, { log: () => {}, path, root })
        ).toBe(2)
    })

    it('asks each document over the other documents of its kind and writes a canonical file', async () => {
        const { calls, client } = fakeClient(byIdAsc)
        const lines: string[] = []
        const code = await runGenerate([], {}, { client, log: (l) => lines.push(l), path, root, today })

        expect(code).toBe(0)
        expect(calls).toHaveLength(5)
        const post2 = calls.find(
            (c) => (c.state as { title: string }).title === 'Doc 2 en' && c.keys[0].startsWith('post:')
        )

        expect(post2?.keys).toEqual(['post:1', 'post:3'])
        expect(post2?.state).toMatchObject({ description: 'About 2', title: 'Doc 2 en' })
        const file = readRelatedFile(path)!

        expect(Object.keys(file.entries)).toEqual(['newsletter:1', 'newsletter:2', 'post:1', 'post:2', 'post:3'])
        expect(file.entries['post:2'].ranked).toEqual([
            { key: 'post:1', p: 0.5 },
            { key: 'post:3', p: 0.4 },
        ])
        expect(file.entries['newsletter:2'].ranked).toEqual([{ key: 'newsletter:1', p: 0.5 }])
        expect(file.generatedAt).toBe('2026-09-23')
        expect(file.model).toBe('typesafe/jev-1.13-20260917')
        expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true)
        expect(lines.at(-2)).toContain('asked 5 document(s) (full rewrite), rewrote 5')
    })

    it('sends nothing and leaves the file byte-identical when in sync', async () => {
        const first = fakeClient(byIdAsc)
        await runGenerate([], {}, { client: first.client, log: () => {}, path, root, today })
        const before = readFileSync(path, 'utf8')
        const second = fakeClient(byIdAsc)
        const lines: string[] = []

        expect(await runGenerate([], {}, { client: second.client, log: (l) => lines.push(l), path, root, today })).toBe(
            0
        )
        expect(second.calls).toHaveLength(0)
        expect(readFileSync(path, 'utf8')).toBe(before)
        expect(lines[0]).toContain('in sync')
    })

    it('re-asks only an edited document and keeps its list when the top three did not move', async () => {
        await runGenerate([], {}, { client: fakeClient(byIdAsc).client, log: () => {}, path, root, today })
        writeDoc(root, 'posts', 2, 'Two, edited.')
        const drifted = (keys: string[]): Record<string, number> =>
            Object.fromEntries(Object.entries(byIdAsc(keys)).map(([k, p]) => [k, p - 0.03]))
        const { calls, client } = fakeClient(drifted)
        const lines: string[] = []

        expect(await runGenerate([], {}, { client, log: (l) => lines.push(l), path, root, today })).toBe(0)
        expect(calls.map((c) => (c.state as { title: string }).title)).toEqual(['Doc 2 en'])
        const file = readRelatedFile(path)!

        expect(file.entries['post:2'].ranked).toEqual([
            { key: 'post:1', p: 0.5 },
            { key: 'post:3', p: 0.4 },
        ])
        expect(lines.at(-2)).toContain('(incremental), rewrote 0, kept 1')
    })

    it('rewrites an edited entry whose top three changed', async () => {
        await runGenerate([], {}, { client: fakeClient(byIdAsc).client, log: () => {}, path, root, today })
        writeDoc(root, 'posts', 2, 'Two, now about three.')
        const reversed = (keys: string[]): Record<string, number> =>
            Object.fromEntries([...keys].reverse().map((k, i) => [k, 0.6 - i * 0.2]))
        const { client } = fakeClient(reversed)
        await runGenerate([], {}, { client, log: () => {}, path, root, today })

        expect(readRelatedFile(path)!.entries['post:2'].ranked).toEqual([
            { key: 'post:3', p: 0.6 },
            { key: 'post:1', p: 0.4 },
        ])
    })

    it('re-asks and rewrites everything when a document is added or removed, dropping dangling keys', async () => {
        await runGenerate([], {}, { client: fakeClient(byIdAsc).client, log: () => {}, path, root, today })
        rmSync(join(root, 'posts', '1'), { force: true, recursive: true })
        writeDoc(root, 'posts', 4, 'Four.')
        const { calls, client } = fakeClient(byIdAsc)
        const lines: string[] = []

        expect(await runGenerate([], {}, { client, log: (l) => lines.push(l), path, root, today })).toBe(0)
        expect(calls).toHaveLength(5)
        const file = readRelatedFile(path)!

        expect(Object.keys(file.entries)).toEqual(['newsletter:1', 'newsletter:2', 'post:2', 'post:3', 'post:4'])
        expect(JSON.stringify(file)).not.toContain('post:1')
        expect(file.entries['post:2'].ranked.map((r) => r.key)).toEqual(['post:3', 'post:4'])
        expect(lines.at(-2)).toContain('full rewrite')
    })

    it('--force re-asks everything and replaces every entry', async () => {
        await runGenerate([], {}, { client: fakeClient(byIdAsc).client, log: () => {}, path, root, today })
        const drifted = (keys: string[]): Record<string, number> =>
            Object.fromEntries(Object.entries(byIdAsc(keys)).map(([k, p]) => [k, p - 0.03]))
        const { calls, client } = fakeClient(drifted)
        await runGenerate(['--force'], {}, { client, log: () => {}, path, root, today })

        expect(calls).toHaveLength(5)
        expect(readRelatedFile(path)!.entries['post:2'].ranked[0]).toEqual({ key: 'post:1', p: 0.47 })
    })

    it('exits 1 and leaves the previous file untouched when a request fails', async () => {
        await runGenerate([], {}, { client: fakeClient(byIdAsc).client, log: () => {}, path, root, today })
        const before = readFileSync(path, 'utf8')
        writeDoc(root, 'posts', 5, 'Five.')
        const { client } = fakeClient(byIdAsc, { failOn: 'Doc 3' })
        const lines: string[] = []

        expect(await runGenerate([], {}, { client, log: (l) => lines.push(l), path, root, today })).toBe(1)
        expect(lines[0]).toContain('generation failed at post:3')
        expect(readFileSync(path, 'utf8')).toBe(before)
    })

    it('treats a malformed file as a first generation', async () => {
        writeFileSync(path, '{ nope')
        const { calls, client } = fakeClient(byIdAsc)

        expect(await runGenerate([], {}, { client, log: () => {}, path, root, today })).toBe(0)
        expect(calls).toHaveLength(5)
        expect((readRelatedFile(path) as RelatedFile).candidateSetHash).toHaveLength(64)
    })
})
