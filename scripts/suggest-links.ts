/**
 * suggest-links.ts
 *
 * Advisory, author-run: asks Jev which other post or newsletter issue
 * substantiates a claim made in each paragraph of a document, and, in backlink
 * mode, which paragraphs of which posts should link to a newsletter issue.
 * Prints Markdown tables; changes nothing. Never part of the build, hooks or
 * the pipeline result.
 *
 * Usage:
 *   npm run suggest:links -- <post|newsletter> <id>… [--lang fi|sv|en] [--threshold 0.5] [--concurrency 4] [--out <md>]
 *   npm run suggest:links -- --backlinks newsletter <id> [same flags]
 *   npm run suggest:links -- --changed-since <ref> [same flags]
 *
 * Spec: .agents/specs/jev/links.md
 */

import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { createClient, type JevClient, mapConcurrent, NO_PROVIDER_NOTICE, resolveProvider } from './jev/client.ts'
import { buildCorpus, type DocKey, type DocKind, type Document, type Lang, LANGS, stateFor } from './jev/corpus.ts'
import {
    alreadyLinked,
    backlinkQuestions,
    docsFromPaths,
    type DoubtfulRow,
    doubtfulRows,
    linkCount,
    linkOptions,
    paragraphState,
    renderTable,
    starts,
    SUGGEST_THRESHOLD,
    type SuggestionRow,
    suggestionRows,
    urlFor,
} from './jev/links.ts'
/* eslint-enable import-x/extensions */

export const CONCURRENCY_DEFAULT = 4
export const USAGE = [
    'usage: npm run suggest:links -- <post|newsletter> <id>… [--lang fi|sv|en] [--threshold 0.5] [--concurrency 4] [--out <md>]',
    '       npm run suggest:links -- --backlinks newsletter <id> [flags]',
    '       npm run suggest:links -- --changed-since <ref> [flags]',
].join('\n')
const LINK_QUESTION =
    'Which page should this paragraph link to, if any? Choose none when no page substantiates a claim made here.'

interface SuggestDeps {
    client?: JevClient
    git?: (args: string[]) => string
    log?: (line: string) => void
    root?: string
}

interface Target {
    id: number
    kind: DocKind
}

interface Options {
    concurrency: number
    lang: Lang
    out?: string
    threshold: number
}

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value)
const isKind = (value: string): value is DocKind => value === 'post' || value === 'newsletter'
const fmt = (p: number): string => p.toFixed(2)

const defaultGit = (args: string[]): string => execFileSync('git', args, { encoding: 'utf8' })

/** Positional `kind id kind id…` pairs; null on any malformed pair. */
const parseTargets = (positionals: string[]): Target[] | null => {
    if (positionals.length === 0 || positionals.length % 2 !== 0) return null
    const targets: Target[] = []
    for (let i = 0; i < positionals.length; i += 2) {
        const kind = positionals[i]
        const id = positionals[i + 1]
        if (!isKind(kind) || !/^\d+$/.test(id)) return null
        targets.push({ id: Number(id), kind })
    }

    return targets
}

const suggestionTable = (rows: SuggestionRow[]): string =>
    renderTable(
        ['paragraph', 'starts', 'target', 'title', 'url', 'p', 'none'],
        rows.map((r) => [
            String(r.index),
            r.starts,
            r.key,
            r.title,
            r.url,
            `${r.strong ? '★ ' : ''}${fmt(r.p)}`,
            fmt(r.none),
        ])
    )

const doubtfulTable = (rows: DoubtfulRow[]): string =>
    renderTable(
        ['paragraph', 'starts', 'current target', 'p'],
        rows.map((r) => [String(r.index), r.starts, r.current, fmt(r.p)])
    )

/** Per-document mode for one document; returns the Markdown section lines. */
async function suggestForDocument(
    client: JevClient,
    doc: Document,
    english: Document[],
    byKey: ReadonlyMap<DocKey, Document>,
    known: ReadonlySet<DocKey>,
    opts: Options
): Promise<string[]> {
    const lines = [`## ${doc.key} — ${doc.title}`, '']
    if (doc.paragraphs.length === 0) return [...lines, 'no paragraphs', '']
    const criteria = linkOptions(english, doc.key)
    const exclude = new Set<DocKey>([doc.key, ...alreadyLinked(doc, known)])
    const answers = await mapConcurrent(doc.paragraphs, opts.concurrency, async (paragraph, index) => {
        const where = `${doc.key} paragraph ${index}`
        let res
        try {
            res = await client.ask(paragraphState(doc, paragraph), {
                link_target: { criteria, instructions: LINK_QUESTION, type: 'choice' },
            })
        } catch (error) {
            throw new Error(`${where}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
        }
        const answer = res.answers.link_target
        if (answer?.type !== 'choice') {
            throw new Error(`${where}: expected a choice answer, got ${answer?.type ?? 'nothing'}`)
        }

        return answer.probabilities
    })
    const suggestions = answers.flatMap((probabilities, index) =>
        suggestionRows(index, doc.paragraphs[index], probabilities, { byKey, exclude, threshold: opts.threshold })
    )
    const doubtful = answers.flatMap((probabilities, index) =>
        doubtfulRows(index, doc.paragraphs[index], probabilities, known)
    )
    lines.push(suggestions.length > 0 ? suggestionTable(suggestions) : 'no new link targets', '')
    if (doubtful.length > 0) lines.push('### doubtful', '', doubtfulTable(doubtful), '')
    lines.push(`links now: ${linkCount(doc)} of 3–10`, '')

    return lines
}

/** Backlink mode: which post paragraphs should link to the issue. */
async function suggestBacklinks(
    client: JevClient,
    issue: Document,
    issueEnglish: Document,
    posts: Document[],
    known: ReadonlySet<DocKey>,
    opts: Options
): Promise<string[]> {
    const lines = [`## backlinks to ${issue.key} — ${issue.title}`, '']
    const linked = posts.filter((post) => alreadyLinked(post, known).has(issue.key))
    const candidates = posts.filter((post) => !linked.includes(post))
    const jobs = candidates.flatMap((post) => backlinkQuestions(post.paragraphs).map((chunk) => ({ chunk, post })))
    const state = stateFor(issueEnglish)
    const answered = await mapConcurrent(jobs, opts.concurrency, async ({ chunk, post }) => {
        const where = `${post.key} paragraphs ${chunk.indexes[0]}–${chunk.indexes.at(-1)}`
        let res
        try {
            res = await client.ask(state, chunk.questions)
        } catch (error) {
            throw new Error(`${where}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
        }

        return chunk.indexes.map((index) => {
            const answer = res.answers[`p${index}`]
            if (answer?.type !== 'noul') {
                throw new Error(
                    `${post.key} paragraph ${index}: expected a noul answer, got ${answer?.type ?? 'nothing'}`
                )
            }

            return { index, p: answer.noul, post }
        })
    })
    const rows = answered
        .flat()
        .filter((r) => r.p >= opts.threshold)
        .toSorted((a, b) => b.p - a.p)
        .map((r) => [
            r.post.key,
            r.post.title,
            urlFor(r.post),
            String(r.index),
            starts(r.post.paragraphs[r.index]),
            fmt(r.p),
        ])
    lines.push(
        rows.length > 0
            ? renderTable(['post', 'title', 'url', 'paragraph', 'starts', 'p'], rows)
            : 'no backlink candidates',
        ''
    )
    if (linked.length > 0)
        lines.push('### already linked', '', ...linked.map((post) => `- ${post.key} — ${post.title}`), '')

    return lines
}

/** Returns the process exit code: 0 done or skipped, 1 failed, 2 bad arguments. */
export async function runSuggest(argv: string[], env: NodeJS.ProcessEnv, deps: SuggestDeps = {}): Promise<number> {
    const log = deps.log ?? console.log
    const git = deps.git ?? defaultGit
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        args: argv,
        options: {
            backlinks: { type: 'boolean' },
            'changed-since': { type: 'string' },
            concurrency: { type: 'string' },
            lang: { type: 'string' },
            out: { type: 'string' },
            threshold: { type: 'string' },
        },
    })
    const lang = values.lang ?? 'fi'
    const threshold = values.threshold === undefined ? SUGGEST_THRESHOLD : Number(values.threshold)
    const concurrencyOk = values.concurrency === undefined || /^[1-9]\d*$/.test(values.concurrency)
    const thresholdOk = Number.isFinite(threshold) && threshold > 0 && threshold <= 1
    const changedSince = values['changed-since']
    const mode = values.backlinks ? 'backlinks' : changedSince === undefined ? 'docs' : 'changed'
    const conflict = (values.backlinks && changedSince !== undefined) || (mode === 'changed' && positionals.length > 0)
    const parsed = mode === 'changed' ? [] : parseTargets(positionals)
    const targetsOk =
        parsed !== null && (mode !== 'backlinks' || (parsed.length === 1 && parsed[0].kind === 'newsletter'))
    if (!isLang(lang) || !concurrencyOk || !thresholdOk || conflict || !targetsOk) {
        log(USAGE)

        return 2
    }
    const opts: Options = {
        concurrency: values.concurrency ? Number(values.concurrency) : CONCURRENCY_DEFAULT,
        lang,
        out: values.out,
        threshold,
    }
    const provider = resolveProvider(env)
    if (!provider && !deps.client) {
        log(NO_PROVIDER_NOTICE)

        return 0
    }
    const client = deps.client ?? createClient(provider!)
    const english = buildCorpus({ root: deps.root })
    const localized = lang === 'en' ? english : buildCorpus({ lang, root: deps.root })
    const byKey = new Map<DocKey, Document>(localized.map((d) => [d.key, d]))
    const byKeyEnglish = new Map<DocKey, Document>(english.map((d) => [d.key, d]))
    const known: ReadonlySet<DocKey> = new Set(byKey.keys())

    let targets: Target[] = parsed
    if (mode === 'changed') {
        const paths = git([
            'diff',
            '--name-only',
            `${changedSince}...HEAD`,
            '--',
            'src/content/posts',
            'src/content/newsletters',
        ])
        targets = docsFromPaths(paths.split('\n')).filter((t) => byKey.has(`${t.kind}:${t.id}`))
        if (targets.length === 0) {
            log('no content changes')

            return 0
        }
    }
    const missing = targets.filter((t) => !byKey.has(`${t.kind}:${t.id}`))
    if (missing.length > 0) {
        for (const t of missing) log(`${t.kind}:${t.id} not found`)

        return 2
    }

    const output: string[] = []
    const finish = (code: number, error?: string): number => {
        if (error) output.push(error)
        for (const line of output) log(line)
        if (opts.out) writeFileSync(opts.out, `${output.join('\n')}\n`)

        return code
    }
    try {
        for (const t of targets) {
            const doc = byKey.get(`${t.kind}:${t.id}`)!
            const section = values.backlinks
                ? await suggestBacklinks(
                      client,
                      doc,
                      byKeyEnglish.get(doc.key)!,
                      localized.filter((d) => d.kind === 'post'),
                      known,
                      opts
                  )
                : await suggestForDocument(client, doc, english, byKey, known, opts)
            output.push(...section)
        }
    } catch (error) {
        return finish(1, `failed at ${error instanceof Error ? error.message : String(error)}`)
    }

    return finish(0)
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = await runSuggest(process.argv.slice(2), process.env)
}
