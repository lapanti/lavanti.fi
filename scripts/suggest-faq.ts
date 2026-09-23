/**
 * suggest-faq.ts
 *
 * Advisory, author-run: ranks the question-form headings of a post or
 * newsletter issue and of its related neighbours by whether the text answers
 * them and whether a voter would ask them, and flags existing faq entries the
 * text no longer answers. Prints Markdown tables; never writes frontmatter.
 * No receipt, no gate: a FAQ is optional content. Never part of the build or
 * the pipeline result.
 *
 * Usage:
 *   npm run suggest:faq -- <post|newsletter> <id>… [--lang fi|sv|en] [--answerable 0.7] [--doubtful 0.3] [--out <md>]
 *
 * Spec: .agents/specs/jev/faq.md
 */

import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { type Answer, createClient, type JevClient, NO_PROVIDER_NOTICE, resolveProvider } from './jev/client.ts'
import { bodyStateFor, buildCorpus, type DocKey, type DocKind, type Document, type Lang, LANGS } from './jev/corpus.ts'
import {
    ANSWERABLE_THRESHOLD,
    chunkQuestions,
    DOUBTFUL_THRESHOLD,
    doubtfulFaq,
    faqQuestions,
    harvest,
    NEIGHBOUR_COUNT,
    rank,
} from './jev/faq.ts'
import { renderTable } from './jev/links.ts'
import { readRelatedFile, RELATED_PATH, type RelatedFile } from './jev/related.ts'
/* eslint-enable import-x/extensions */

export const USAGE =
    'usage: npm run suggest:faq -- <post|newsletter> <id>… [--lang fi|sv|en] [--answerable 0.7] [--doubtful 0.3] [--out <md>]'

interface FaqDeps {
    client?: JevClient
    log?: (line: string) => void
    /** The parsed related.json; null when the file is missing. Defaults to reading relatedPath. */
    related?: RelatedFile | null
    /** Where related.json is read from when `related` is not injected; defaults to RELATED_PATH. */
    relatedPath?: string
    root?: string
}

interface Options {
    answerable: number
    doubtful: number
    lang: Lang
    out?: string
}

interface Target {
    id: number
    kind: DocKind
}

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value)
const isKind = (value: string): value is DocKind => value === 'post' || value === 'newsletter'
const inUnit = (value: number): boolean => Number.isFinite(value) && value > 0 && value <= 1
const fmt2 = (p: number): string => p.toFixed(2)

/** Positional `kind id` pairs; null on any malformed pair. */
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

/** One section for one document; the lines to print. */
async function suggestForDocument(
    client: JevClient,
    doc: Document,
    byKey: ReadonlyMap<DocKey, Document>,
    related: RelatedFile | null,
    opts: Options
): Promise<string[]> {
    const lines = [`## ${doc.key} — ${doc.title}`, '']
    const entry = related?.entries[doc.key]
    if (!entry) lines.push(`no related entry for ${doc.key}: own headings only`, '')
    const neighbours = (entry?.ranked ?? [])
        .slice(0, NEIGHBOUR_COUNT)
        .map((item) => byKey.get(item.key))
        .filter((d): d is Document => d !== undefined)
    const candidates = harvest(doc, neighbours)
    const faqLine = `faq entries: ${doc.faq.length} (FAQPage JSON-LD needs 2)`
    if (candidates.length === 0 && doc.faq.length === 0) return [...lines, 'no candidates', '', faqLine, '']
    const answers: Record<string, Answer> = {}
    const state = bodyStateFor(doc)
    for (const chunk of chunkQuestions(faqQuestions(doc, candidates))) {
        let res
        try {
            res = await client.ask(state, chunk)
        } catch (error) {
            throw new Error(`${doc.key}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
        }
        Object.assign(answers, res.answers)
    }
    let ranked
    let doubtful
    try {
        ranked = rank(candidates, answers, opts)
        doubtful = doubtfulFaq(doc, answers, opts)
    } catch (error) {
        throw new Error(`${doc.key}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    lines.push('### candidates', '')
    lines.push(
        ranked.length > 0
            ? renderTable(
                  ['question', 'source', 'answers', 'usefulness'],
                  ranked.map((c) => [c.question, c.source, fmt2(c.answers), c.usefulness.toFixed(1)])
              )
            : `no candidates above ${fmt2(opts.answerable)}`,
        ''
    )
    lines.push('### doubtful', '')
    lines.push(
        doubtful.length > 0
            ? renderTable(
                  ['question', 'answers'],
                  doubtful.map((f) => [f.question, fmt2(f.answers)])
              )
            : 'no doubtful faq entries',
        ''
    )
    lines.push(faqLine, '')

    return lines
}

/** Returns the process exit code: 0 done or skipped, 1 failed, 2 bad arguments. */
export async function runFaq(argv: string[], env: NodeJS.ProcessEnv, deps: FaqDeps = {}): Promise<number> {
    const log = deps.log ?? console.log
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        args: argv,
        options: {
            answerable: { type: 'string' },
            doubtful: { type: 'string' },
            lang: { type: 'string' },
            out: { type: 'string' },
        },
    })
    const lang = values.lang ?? 'fi'
    const answerable = values.answerable === undefined ? ANSWERABLE_THRESHOLD : Number(values.answerable)
    const doubtful = values.doubtful === undefined ? DOUBTFUL_THRESHOLD : Number(values.doubtful)
    const targets = parseTargets(positionals)
    if (!isLang(lang) || !inUnit(answerable) || !inUnit(doubtful) || targets === null) {
        log(USAGE)

        return 2
    }
    const opts: Options = { answerable, doubtful, lang, out: values.out }
    const provider = resolveProvider(env)
    if (!provider && !deps.client) {
        log(NO_PROVIDER_NOTICE)

        return 0
    }
    const client = deps.client ?? createClient(provider!)
    const corpus = buildCorpus({ lang, root: deps.root })
    const byKey = new Map<DocKey, Document>(corpus.map((d) => [d.key, d]))
    const missing = targets.filter((t) => !byKey.has(`${t.kind}:${t.id}`))
    if (missing.length > 0) {
        for (const t of missing) log(`${t.kind}:${t.id} not found`)

        return 2
    }
    let related = deps.related
    if (related === undefined) {
        const relatedPath = deps.relatedPath ?? RELATED_PATH
        related = readRelatedFile(relatedPath)
        if (related === null && existsSync(relatedPath)) {
            log(`${relatedPath} is malformed; run npm run check:related`)

            return 1
        }
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
            output.push(...(await suggestForDocument(client, byKey.get(`${t.kind}:${t.id}`)!, byKey, related, opts)))
        }
    } catch (error) {
        return finish(1, `failed at ${error instanceof Error ? error.message : String(error)}`)
    }

    return finish(0)
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = await runFaq(process.argv.slice(2), process.env)
}
