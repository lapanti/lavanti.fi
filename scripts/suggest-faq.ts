/**
 * suggest-faq.ts
 *
 * Advisory, author-run: ranks the question-form headings of a post or
 * newsletter issue and of its related neighbours by whether the text answers
 * them and whether a voter would ask them, and flags existing faq entries the
 * text no longer answers. Prints Markdown tables; never writes frontmatter.
 * `tag <id>` harvests the faq questions and question headings of every post
 * carrying the tag and ranks them as category FAQ candidates: is the question
 * about the topic as a whole, and would a voter on the category page ask it.
 * No receipt, no gate: a FAQ is optional content. Never part of the build or
 * the pipeline result.
 *
 * Usage:
 *   npm run suggest:faq -- <post|newsletter|tag> <id>… [--lang fi|sv|en] [--answerable 0.7] [--doubtful 0.3] [--category-wide 0.5] [--out <md>]
 *
 * Spec: .agents/specs/jev/faq.md
 */

// A type-only import: strip-types erases it, so it needs no extension.
import type { LocalTag } from '../src/content/tags/types'

import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { type Answer, createClient, type JevClient, NO_PROVIDER_NOTICE, resolveProvider } from './jev/client.ts'
import { bodyStateFor, buildCorpus, type DocKey, type DocKind, type Document, type Lang, LANGS } from './jev/corpus.ts'
import {
    ANSWERABLE_THRESHOLD,
    CATEGORY_WIDE_THRESHOLD,
    chunkQuestions,
    DOUBTFUL_THRESHOLD,
    doubtfulFaq,
    faqQuestions,
    harvest,
    harvestTag,
    NEIGHBOUR_COUNT,
    rank,
    rankTag,
    tagFaqQuestions,
} from './jev/faq.ts'
import { renderTable } from './jev/links.ts'
import { readRelatedFile, RELATED_PATH, type RelatedFile } from './jev/related.ts'
import { loadLocalTag, registeredTagIds } from './jev/tags.ts'
/* eslint-enable import-x/extensions */

export const USAGE =
    'usage: npm run suggest:faq -- <post|newsletter|tag> <id>… [--lang fi|sv|en] [--answerable 0.7] [--doubtful 0.3] [--category-wide 0.5] [--out <md>]'

interface FaqDeps {
    client?: JevClient
    log?: (line: string) => void
    /** The parsed related.json; null when the file is missing. Defaults to reading relatedPath. */
    related?: RelatedFile | null
    /** Where related.json is read from when `related` is not injected; defaults to RELATED_PATH. */
    relatedPath?: string
    root?: string
    /** Where tag files are read from; defaults to <root>/tags. */
    tagsDir?: string
}

interface Options {
    answerable: number
    categoryWide: number
    doubtful: number
    lang: Lang
    out?: string
}

type Target = { id: number; kind: DocKind } | { id: string; kind: 'tag' }

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value)
const isKind = (value: string): value is DocKind => value === 'post' || value === 'newsletter'
const inUnit = (value: number): boolean => Number.isFinite(value) && value > 0 && value <= 1
const fmt2 = (p: number): string => p.toFixed(2)
/** A tag id: kebab-case starting with a letter, so `tag 1` is a usage error rather than an unknown tag. */
const TAG_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/** Positional `kind id` pairs (`tag <id>` takes a tag id); null on any malformed pair. */
const parseTargets = (positionals: string[]): Target[] | null => {
    if (positionals.length === 0 || positionals.length % 2 !== 0) return null
    const targets: Target[] = []
    for (let i = 0; i < positionals.length; i += 2) {
        const kind = positionals[i]
        const id = positionals[i + 1]
        if (kind === 'tag' && TAG_ID.test(id)) targets.push({ id, kind })
        else if (isKind(kind) && /^\d+$/.test(id)) targets.push({ id: Number(id), kind })
        else return null
    }

    return targets
}

/**
 * One section for one category: candidates harvested from every post carrying
 * the tag, scored against the category (name, description, post titles).
 */
async function suggestForTag(client: JevClient, tag: LocalTag, corpus: Document[], opts: Options): Promise<string[]> {
    const lines = [`## tag ${tag.id} — ${tag.names[opts.lang]}`, '']
    const posts = corpus
        .filter((d) => d.kind === 'post' && d.tags.includes(tag.id))
        .toSorted((a, b) => b.publishDate.localeCompare(a.publishDate) || b.id - a.id)
    const existing = (tag.faq?.[opts.lang] ?? []).map((item) => item.q)
    const faqLine = `faq entries: ${existing.length} (FAQPage JSON-LD needs 2) · posts: ${posts.length}`
    const candidates = harvestTag(existing, posts)
    if (candidates.length === 0) return [...lines, 'no candidates', '', faqLine, '']
    const state = {
        category: tag.names[opts.lang],
        description: tag.descriptions[opts.lang].join('\n\n'),
        posts: posts.map((p) => p.title).join('\n'),
    }
    const answers: Record<string, Answer> = {}
    for (const chunk of chunkQuestions(tagFaqQuestions(candidates))) {
        let res
        try {
            res = await client.ask(state, chunk)
        } catch (error) {
            throw new Error(`tag ${tag.id}: ${error instanceof Error ? error.message : String(error)}`, {
                cause: error,
            })
        }
        Object.assign(answers, res.answers)
    }
    let ranked
    try {
        ranked = rankTag(candidates, answers, { categoryWide: opts.categoryWide })
    } catch (error) {
        throw new Error(`tag ${tag.id}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
    }
    lines.push('### candidates', '')
    lines.push(
        ranked.length > 0
            ? renderTable(
                  ['question', 'source', 'category-wide', 'usefulness'],
                  ranked.map((c) => [c.question, c.source, fmt2(c.categoryWide), c.usefulness.toFixed(1)])
              )
            : `no candidates above ${fmt2(opts.categoryWide)}`,
        ''
    )
    lines.push(faqLine, '')

    return lines
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
            'category-wide': { type: 'string' },
            doubtful: { type: 'string' },
            lang: { type: 'string' },
            out: { type: 'string' },
        },
    })
    const lang = values.lang ?? 'fi'
    const answerable = values.answerable === undefined ? ANSWERABLE_THRESHOLD : Number(values.answerable)
    const doubtful = values.doubtful === undefined ? DOUBTFUL_THRESHOLD : Number(values.doubtful)
    const categoryWide =
        values['category-wide'] === undefined ? CATEGORY_WIDE_THRESHOLD : Number(values['category-wide'])
    const targets = parseTargets(positionals)
    if (!isLang(lang) || !inUnit(answerable) || !inUnit(doubtful) || !inUnit(categoryWide) || targets === null) {
        log(USAGE)

        return 2
    }
    const opts: Options = { answerable, categoryWide, doubtful, lang, out: values.out }
    const provider = resolveProvider(env)
    if (!provider && !deps.client) {
        log(NO_PROVIDER_NOTICE)

        return 0
    }
    const client = deps.client ?? createClient(provider!)
    const corpus = buildCorpus({ lang, root: deps.root })
    const byKey = new Map<DocKey, Document>(corpus.map((d) => [d.key, d]))
    const tagsDir = deps.tagsDir ?? join(deps.root ?? 'src/content', 'tags')
    // Only a tag target reads the registry; post and newsletter runs never touch the tag files.
    const registry = targets.some((t) => t.kind === 'tag')
        ? registeredTagIds(join(tagsDir, '..', 'tags.ts'))
        : new Set<string>()
    const missing = targets.filter((t) =>
        t.kind === 'tag'
            ? !registry.has(t.id) || !existsSync(join(tagsDir, `${t.id}.ts`))
            : !byKey.has(`${t.kind}:${t.id}`)
    )
    if (missing.length > 0) {
        for (const t of missing) log(`${t.kind}:${t.id} not found`)

        return 2
    }
    const tags = new Map<string, LocalTag>()
    for (const t of targets) if (t.kind === 'tag') tags.set(t.id, await loadLocalTag(tagsDir, `${t.id}.ts`))
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
            output.push(
                ...(t.kind === 'tag'
                    ? await suggestForTag(client, tags.get(t.id)!, corpus, opts)
                    : await suggestForDocument(client, byKey.get(`${t.kind}:${t.id}`)!, byKey, related, opts))
            )
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
