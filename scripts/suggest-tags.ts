/**
 * suggest-tags.ts
 *
 * Advisory, author-run: asks Jev, per post, how well each tag in the taxonomy
 * fits, and, per tag, which posts lack it. Prints Markdown tables; never
 * writes meta.json. Tags stay a human decision: the eval's F1 (0.46 en) is
 * under the gate threshold. A retro-scan writes a receipt to
 * src/content/suggestions.json that scripts/checks/suggestions-stale.ts
 * requires for every changed tag file. Never part of the build or the
 * pipeline result.
 *
 * Usage:
 *   npm run suggest:tags -- post <id>… [--lang fi|sv|en] [--consider 0.7] [--doubtful 0.2] [--concurrency 4] [--out <md>]
 *   npm run suggest:tags -- --tag <id> [same flags]
 *   npm run suggest:tags -- --changed-since <ref> [same flags]
 *
 * Spec: .agents/specs/jev/tags.md
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { helsinkiDateOf } from '../src/lib/publishing.ts'
import { createClient, type JevClient, mapConcurrent, NO_PROVIDER_NOTICE, resolveProvider } from './jev/client.ts'
import { buildCorpus, type Document, type Lang, LANGS, stateFor } from './jev/corpus.ts'
import { docsFromPaths, renderTable } from './jev/links.ts'
import { emptyReceipts, readReceipts, RECEIPTS_PATH, recordTagReceipt, writeReceipts } from './jev/suggestions.ts'
import {
    CONSIDER_THRESHOLD,
    DOUBTFUL_THRESHOLD,
    EDITORIAL_TAGS,
    hashTagFile,
    loadTagLabels,
    partition,
    registeredTagIds,
    tagIdsFromPaths,
    type TagLabel,
    tagQuestions,
} from './jev/tags.ts'
/* eslint-enable import-x/extensions */

export const CONCURRENCY_DEFAULT = 4
export const USAGE = [
    'usage: npm run suggest:tags -- post <id>… [--lang fi|sv|en] [--consider 0.7] [--doubtful 0.2] [--concurrency 4] [--out <md>]',
    '       npm run suggest:tags -- --tag <id> [flags]',
    '       npm run suggest:tags -- --changed-since <ref> [flags]',
].join('\n')
const EDITORIAL_NOTICE =
    'is an editorial tag: it describes the occasion, not the text. Recall in the eval was 0.08–0.28.'

interface TagDeps {
    client?: JevClient
    git?: (args: string[]) => string
    log?: (line: string) => void
    /** Where receipts are written; defaults to RECEIPTS_PATH. */
    receipts?: string
    /** Content root; defaults to src/content. */
    root?: string
    /** Tag files; defaults to <root>/tags, with the registry at <root>/tags.ts. */
    tagsDir?: string
    today?: () => string
}

interface Options {
    concurrency: number
    consider: number
    doubtful: number
    lang: Lang
    out?: string
}

interface Section {
    lines: string[]
    /** Model id from the last response, '' when nothing was asked. */
    model: string
}

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value)
const fmt = (p: number): string => p.toFixed(2)
const inUnit = (value: number): boolean => Number.isFinite(value) && value > 0 && value <= 1

const defaultGit = (args: string[]): string => execFileSync('git', args, { encoding: 'utf8' })

/** Positional `post <id>` pairs; null on any malformed pair. */
const parsePostIds = (positionals: string[]): number[] | null => {
    if (positionals.length === 0 || positionals.length % 2 !== 0) return null
    const ids: number[] = []
    for (let i = 0; i < positionals.length; i += 2) {
        if (positionals[i] !== 'post' || !/^\d+$/.test(positionals[i + 1])) return null
        ids.push(Number(positionals[i + 1]))
    }

    return ids
}

const wrapError = (where: string, error: unknown): Error =>
    new Error(`${where}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })

/** Per-post mode: every tag as a noul, one request. */
async function suggestForPost(client: JevClient, post: Document, labels: TagLabel[], opts: Options): Promise<Section> {
    const lines = [`## ${post.key} — ${post.title}`, '', `assigned: ${post.tags.join(', ') || 'none'}`, '']
    let res
    try {
        res = await client.ask(stateFor(post), tagQuestions(labels))
    } catch (error) {
        throw wrapError(post.key, error)
    }
    const probabilities: Record<string, number> = {}
    for (const label of labels) {
        const answer = res.answers[label.id]
        if (answer?.type !== 'noul') {
            throw new Error(`${post.key}: expected a noul answer for ${label.id}, got ${answer?.type ?? 'nothing'}`)
        }
        probabilities[label.id] = answer.noul
    }
    const parts = partition(probabilities, post.tags, opts)
    const pairs = (rows: Array<{ id: string; p: number }>): string[][] => rows.map((r) => [r.id, fmt(r.p)])
    lines.push('### consider', '')
    lines.push(parts.consider.length > 0 ? renderTable(['tag', 'p'], pairs(parts.consider)) : 'no tags to consider', '')
    lines.push('### doubtful', '')
    lines.push(parts.doubtful.length > 0 ? renderTable(['tag', 'p'], pairs(parts.doubtful)) : 'no doubtful tags', '')
    lines.push('### pillar', '')
    lines.push(
        renderTable(
            ['tag', 'p', 'assigned'],
            parts.pillar.map((r) => [r.id, fmt(r.p), r.assigned ? '✓' : ''])
        ),
        ''
    )
    lines.push(`not suggested: ${EDITORIAL_TAGS.join(', ')}`, '')

    return { lines, model: res.model }
}

/** Retro-scan: the single noul for one tag, one request per post lacking it. */
async function scanTag(client: JevClient, label: TagLabel, posts: Document[], opts: Options): Promise<Section> {
    const lines = [`## tag ${label.id} — ${label.name}`, '']
    if (EDITORIAL_TAGS.includes(label.id)) lines.push(`notice: ${label.id} ${EDITORIAL_NOTICE}`, '')
    const question = tagQuestions([label])
    const tagged = posts.filter((post) => post.tags.includes(label.id))
    const candidates = posts.filter((post) => !tagged.includes(post))
    let model = ''
    const answered = await mapConcurrent(candidates, opts.concurrency, async (post) => {
        let res
        try {
            res = await client.ask(stateFor(post), question)
        } catch (error) {
            throw wrapError(post.key, error)
        }
        model = res.model
        const answer = res.answers[label.id]
        if (answer?.type !== 'noul') {
            throw new Error(`${post.key}: expected a noul answer, got ${answer?.type ?? 'nothing'}`)
        }

        return { p: answer.noul, post }
    })
    const rows = answered
        .filter((r) => r.p >= opts.consider)
        .toSorted((a, b) => b.post.publishDate.localeCompare(a.post.publishDate) || b.post.id - a.post.id)
        .map((r) => [r.post.key, r.post.title, r.post.publishDate, fmt(r.p), r.post.tags.join(', ')])
    lines.push(
        rows.length > 0
            ? renderTable(['post', 'title', 'publishDate', 'p', 'current tags'], rows)
            : 'no posts to consider',
        ''
    )
    lines.push(`already tagged: ${tagged.length} of ${posts.length} posts`, '')

    return { lines, model }
}

/** Returns the process exit code: 0 done or skipped, 1 failed, 2 bad arguments. */
export async function runTags(argv: string[], env: NodeJS.ProcessEnv, deps: TagDeps = {}): Promise<number> {
    const log = deps.log ?? console.log
    const git = deps.git ?? defaultGit
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        args: argv,
        options: {
            'changed-since': { type: 'string' },
            concurrency: { type: 'string' },
            consider: { type: 'string' },
            doubtful: { type: 'string' },
            lang: { type: 'string' },
            out: { type: 'string' },
            tag: { type: 'string' },
        },
    })
    const lang = values.lang ?? 'fi'
    const consider = values.consider === undefined ? CONSIDER_THRESHOLD : Number(values.consider)
    const doubtful = values.doubtful === undefined ? DOUBTFUL_THRESHOLD : Number(values.doubtful)
    const concurrencyOk = values.concurrency === undefined || /^[1-9]\d*$/.test(values.concurrency)
    const changedSince = values['changed-since']
    const mode = values.tag !== undefined ? 'tag' : changedSince === undefined ? 'posts' : 'changed'
    const conflict =
        (values.tag !== undefined && changedSince !== undefined) || (mode !== 'posts' && positionals.length > 0)
    const postIds = mode === 'posts' ? parsePostIds(positionals) : []
    if (!isLang(lang) || !concurrencyOk || !inUnit(consider) || !inUnit(doubtful) || conflict || postIds === null) {
        log(USAGE)

        return 2
    }
    const opts: Options = {
        concurrency: values.concurrency ? Number(values.concurrency) : CONCURRENCY_DEFAULT,
        consider,
        doubtful,
        lang,
        out: values.out,
    }
    const provider = resolveProvider(env)
    if (!provider && !deps.client) {
        log(NO_PROVIDER_NOTICE)

        return 0
    }
    const client = deps.client ?? createClient(provider!)
    const tagsDir = deps.tagsDir ?? join(deps.root ?? 'src/content', 'tags')
    let labels: TagLabel[]
    try {
        labels = await loadTagLabels(tagsDir)
    } catch (error) {
        log(`tag files: ${error instanceof Error ? error.message : String(error)}`)

        return 1
    }
    const byId = new Map(labels.map((l) => [l.id, l]))
    const posts = buildCorpus({ lang, root: deps.root }).filter((d) => d.kind === 'post')
    const byKey = new Map(posts.map((p) => [p.id, p]))

    let ids = postIds
    let tagIds = mode === 'tag' ? [values.tag!] : []
    if (mode === 'changed') {
        const paths = git([
            'diff',
            '--name-only',
            `${changedSince}...HEAD`,
            '--',
            'src/content/posts',
            'src/content/tags',
        ])
        ids = docsFromPaths(paths.split('\n'))
            .filter((t) => t.kind === 'post' && byKey.has(t.id))
            .map((t) => t.id)
        tagIds = tagIdsFromPaths(paths.split('\n')).filter((id) => byId.has(id))
        if (ids.length === 0 && tagIds.length === 0) {
            log('no content changes')

            return 0
        }
    }
    const missing = ids.filter((id) => !byKey.has(id))
    if (missing.length > 0) {
        for (const id of missing) log(`post:${id} not found`)

        return 2
    }
    const registry = registeredTagIds(join(tagsDir, '..', 'tags.ts'))
    for (const id of tagIds) {
        if (!byId.has(id)) {
            log(`tag ${id} not found`)

            return 2
        }
        if (!registry.has(id)) {
            log(`tag ${id} is not registered in src/content/tags.ts`)

            return 2
        }
    }

    const receiptsPath = deps.receipts ?? RECEIPTS_PATH
    const receipts = readReceipts(receiptsPath) ?? emptyReceipts()
    const checkedAt = (deps.today ?? (() => helsinkiDateOf(new Date())))()
    let recorded = 0
    const output: string[] = []
    const finish = (code: number, error?: string): number => {
        if (error) output.push(error)
        for (const line of output) log(line)
        if (opts.out) writeFileSync(opts.out, `${output.join('\n')}\n`)
        // Receipts of the retro-scans that completed are kept even when a later one failed.
        if (recorded > 0) writeReceipts(receiptsPath, receipts)

        return code
    }
    try {
        for (const id of ids) {
            const section = await suggestForPost(client, byKey.get(id)!, labels, opts)
            output.push(...section.lines)
        }
        for (const id of tagIds) {
            const section = await scanTag(client, byId.get(id)!, posts, opts)
            output.push(...section.lines)
            recordTagReceipt(receipts, { hash: hashTagFile(id, tagsDir), id }, section.model || 'no request', checkedAt)
            recorded++
        }
    } catch (error) {
        return finish(1, `failed at ${error instanceof Error ? error.message : String(error)}`)
    }

    return finish(0)
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = await runTags(process.argv.slice(2), process.env)
}
