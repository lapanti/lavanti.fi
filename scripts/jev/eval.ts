/**
 * eval.ts
 *
 * Measures Jev against decisions a human already made on this site:
 *   - tags:  one noul question per tag, scored against meta.json tags
 *   - links: one choice question per prose paragraph over every other document
 *            plus "none", scored against the internal links already in the text
 *
 * Author-run, paid and non-deterministic: never wired into build, hooks or CI.
 * Exits 0 with a notice when no API key is set.
 *
 * Usage: node --env-file-if-exists=.env --experimental-strip-types scripts/jev/eval.ts
 *        [--task tags|links]… [--lang en|fi|sv]… [--limit N] [--concurrency C] [--out report.json]
 *
 * Spec: .agents/specs/jev/spec.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { LocalTag } from '../../src/content/tags/types.ts'

import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

import { stripMarkup } from '../checks/mdx-deep.ts'
import {
    type Answer,
    createClient,
    type JevClient,
    mapConcurrent,
    NO_PROVIDER_NOTICE,
    type QuestionSpec,
    resolveProvider,
} from './client.ts'
import { buildCorpus, type DocKey, type Document, type Lang, LANGS, stateFor } from './corpus.ts'
import { linkOptions, linkTargets, NONE, rankedOptions, topChoice } from './links.ts'
/* eslint-enable import-x/extensions */

export const PREDICT_THRESHOLD = 0.5
export const THRESHOLDS = [0.5, 0.7] as const
export const CONCURRENCY_DEFAULT = 4
export const PILLAR_MIN_ID = 43
export const PILLAR_TAGS = [
    'artificial-intelligence',
    'digital-independence',
    'economy',
    'culture-and-education',
    'freedom',
]
export const TASKS = ['tags', 'links'] as const

export type Task = (typeof TASKS)[number]

export interface EvalReport {
    costUsd: number
    inputTokens: number
    lang: Lang
    metrics: Record<string, number>
    model: string
    perPost: Array<{ expected: string[]; key: DocKey; predicted: string[] }>
    perTag?: PerTag[]
    posts: number
    requests: number
    task: Task
}

export interface PerTag {
    id: string
    precision: number
    recall: number
    support: number
}

export interface TagLabel {
    description: string
    id: string
    name: string
}

export interface TagRow {
    expected: string[]
    id: number
    key: DocKey
    probabilities: Record<string, number>
}

export interface LinkRow {
    expected: DocKey[]
    key: DocKey
    paragraph: number
    probabilities: Record<string, number>
}

interface Usage {
    cost: number
    inputTokens: number
    model: string
    requests: number
}

interface RunOpts {
    concurrency: number
    lang: Lang
    limit?: number
}

// ── questions and ground truth ────────────────────────────────────────────────

const TAGS_DIR = join(fileURLToPath(import.meta.url), '..', '..', '..', 'src', 'content', 'tags')

const isLocalTag = (value: unknown): value is LocalTag =>
    typeof value === 'object' && value !== null && 'id' in value && 'names' in value && 'descriptions' in value

/**
 * English label per tag: option labels never change with --lang. Loads the
 * per-tag files one by one because src/content/tags.ts imports them without
 * extensions, which Node's strip-types loader cannot resolve.
 */
export async function loadTagLabels(dir = TAGS_DIR): Promise<TagLabel[]> {
    const files = readdirSync(dir)
        .filter((name) => name.endsWith('.ts') && name !== 'types.ts')
        .sort()
    const labels: TagLabel[] = []
    for (const file of files) {
        const mod = (await import(pathToFileURL(join(dir, file)).href)) as Record<string, unknown>
        const tag = Object.values(mod).find(isLocalTag)
        if (!tag) throw new Error(`no LocalTag export in ${file}`)
        labels.push({ description: tag.descriptions.en[0] ?? '', id: tag.id, name: tag.names.en })
    }

    return labels
}

export function tagQuestions(labels: TagLabel[]): Record<string, QuestionSpec> {
    const questions: Record<string, QuestionSpec> = {}
    for (const t of labels) {
        questions[t.id] = {
            instructions: `This article belongs in the category '${t.name}': ${t.description}`,
            type: 'noul',
        }
    }

    return questions
}

// ── metrics ───────────────────────────────────────────────────────────────────

const ratio = (num: number, den: number): number => (den === 0 ? 0 : num / den)

export function prf(tp: number, fp: number, fn: number): { f1: number; precision: number; recall: number } {
    const precision = ratio(tp, tp + fp)
    const recall = ratio(tp, tp + fn)

    return { f1: ratio(2 * precision * recall, precision + recall), precision, recall }
}

const setF1 = (rows: Array<{ expected: string[]; predicted: string[] }>): ReturnType<typeof prf> => {
    let tp = 0
    let fp = 0
    let fn = 0
    for (const { expected, predicted } of rows) {
        const exp = new Set(expected)
        for (const p of predicted)
            if (exp.has(p)) tp++
            else fp++
        for (const e of expected) if (!predicted.includes(e)) fn++
    }

    return prf(tp, fp, fn)
}

const mostCommon = (lists: string[][], n: number): string[] => {
    const counts = new Map<string, number>()
    for (const list of lists) for (const item of list) counts.set(item, (counts.get(item) ?? 0) + 1)

    return [...counts.entries()]
        .sort(([ka, a], [kb, b]) => b - a || ka.localeCompare(kb))
        .slice(0, n)
        .map(([key]) => key)
}

const predictedAt = (probabilities: Record<string, number>, threshold: number): string[] =>
    Object.entries(probabilities)
        .filter(([, p]) => p >= threshold)
        .map(([key]) => key)

const sameSet = (a: string[], b: string[]): boolean => {
    const sa = new Set(a)
    const sb = new Set(b)

    return sa.size === sb.size && [...sa].every((x) => sb.has(x))
}

export function tagMetrics(rows: TagRow[], labels: string[]): { metrics: Record<string, number>; perTag: PerTag[] } {
    const metrics: Record<string, number> = {}
    for (const t of THRESHOLDS) {
        const sets = rows.map((r) => ({ expected: r.expected, predicted: predictedAt(r.probabilities, t) }))
        const micro = setF1(sets)
        metrics[`microPrecision@${t}`] = micro.precision
        metrics[`microRecall@${t}`] = micro.recall
        metrics[`microF1@${t}`] = micro.f1
        const perLabel = labels
            .filter((id) => rows.some((r) => r.expected.includes(id)))
            .map((id) =>
                setF1(
                    sets.map((s) => ({
                        expected: s.expected.filter((e) => e === id),
                        predicted: s.predicted.filter((p) => p === id),
                    }))
                )
            )
        const mean = (pick: (m: ReturnType<typeof prf>) => number): number =>
            ratio(
                perLabel.reduce((sum, m) => sum + pick(m), 0),
                perLabel.length
            )
        metrics[`macroPrecision@${t}`] = mean((m) => m.precision)
        metrics[`macroRecall@${t}`] = mean((m) => m.recall)
        metrics[`macroF1@${t}`] = mean((m) => m.f1)
    }

    const baseline = mostCommon(
        rows.map((r) => r.expected),
        3
    )
    metrics.baselineF1 = setF1(rows.map((r) => ({ expected: r.expected, predicted: baseline }))).f1

    const pillarRows = rows.filter((r) => r.id >= PILLAR_MIN_ID)
    metrics.pillarPosts = pillarRows.length
    metrics.pillarAccuracy = ratio(
        pillarRows.filter((r) =>
            sameSet(
                r.expected.filter((e) => PILLAR_TAGS.includes(e)),
                predictedAt(r.probabilities, PREDICT_THRESHOLD).filter((p) => PILLAR_TAGS.includes(p))
            )
        ).length,
        pillarRows.length
    )

    const perTag: PerTag[] = labels
        .map((id) => {
            const support = rows.filter((r) => r.expected.includes(id)).length
            const m = setF1(
                rows.map((r) => ({
                    expected: r.expected.filter((e) => e === id),
                    predicted: predictedAt(r.probabilities, PREDICT_THRESHOLD).filter((p) => p === id),
                }))
            )

            return { id, precision: m.precision, recall: m.recall, support }
        })
        .sort((a, b) => b.support - a.support || a.id.localeCompare(b.id))

    return { metrics, perTag }
}

export function linkMetrics(rows: LinkRow[]): Record<string, number> {
    const linked = rows.filter((r) => r.expected.length > 0)
    const unlinked = rows.filter((r) => r.expected.length === 0)
    const hitAt = (k: number): number =>
        ratio(
            linked.filter((r) =>
                rankedOptions(r.probabilities)
                    .slice(0, k)
                    .some((key) => (r.expected as string[]).includes(key))
            ).length,
            linked.length
        )
    const popular = mostCommon(
        linked.map((r) => r.expected),
        3
    )

    return {
        abstainRate: ratio(unlinked.filter((r) => topChoice(r.probabilities) === NONE).length, unlinked.length),
        'baselineHit@3': ratio(
            linked.filter((r) => r.expected.some((key) => popular.includes(key))).length,
            linked.length
        ),
        'hit@1': hitAt(1),
        'hit@3': hitAt(3),
        linkedParagraphs: linked.length,
        unlinkedParagraphs: unlinked.length,
    }
}

// ── runners ───────────────────────────────────────────────────────────────────

const noulOf = (answer: Answer | undefined): number => (answer?.type === 'noul' ? answer.noul : 0)

const record = (usage: Usage, res: { model: string; usage: { cost?: number; input_tokens: number } }): void => {
    usage.requests++
    usage.inputTokens += res.usage.input_tokens
    usage.cost += res.usage.cost ?? 0
    usage.model = res.model
}

const newUsage = (): Usage => ({ cost: 0, inputTokens: 0, model: '', requests: 0 })

const postsOf = (corpus: Document[], limit?: number): Document[] => {
    const posts = corpus.filter((d) => d.kind === 'post')

    return limit ? posts.slice(0, limit) : posts
}

export async function runTagEval(client: JevClient, opts: RunOpts, root?: string): Promise<EvalReport> {
    const posts = postsOf(buildCorpus({ lang: opts.lang, root }), opts.limit)
    const labels = await loadTagLabels()
    const questions = tagQuestions(labels)
    const usage = newUsage()
    const rows = await mapConcurrent(posts, opts.concurrency, async (doc): Promise<TagRow> => {
        const res = await client.ask(stateFor(doc), questions)
        record(usage, res)
        const probabilities = Object.fromEntries(labels.map((l) => [l.id, noulOf(res.answers[l.id])]))

        return { expected: doc.tags, id: doc.id, key: doc.key, probabilities }
    })
    const { metrics, perTag } = tagMetrics(
        rows,
        labels.map((l) => l.id)
    )

    return {
        costUsd: usage.cost,
        inputTokens: usage.inputTokens,
        lang: opts.lang,
        metrics,
        model: usage.model,
        perPost: rows.map((r) => ({
            expected: r.expected,
            key: r.key,
            predicted: predictedAt(r.probabilities, PREDICT_THRESHOLD),
        })),
        perTag,
        posts: posts.length,
        requests: usage.requests,
        task: 'tags',
    }
}

export async function runLinkEval(client: JevClient, opts: RunOpts, root?: string): Promise<EvalReport> {
    const english = buildCorpus({ root })
    const localized = opts.lang === 'en' ? english : buildCorpus({ lang: opts.lang, root })
    const known: ReadonlySet<DocKey> = new Set(english.map((d) => d.key))
    const posts = postsOf(localized, opts.limit)
    const criteriaByDoc = new Map<DocKey, Record<string, string>>()
    for (const doc of posts) criteriaByDoc.set(doc.key, linkOptions(english, doc.key))
    const jobs = posts.flatMap((doc) => doc.paragraphs.map((paragraph, index) => ({ doc, index, paragraph })))
    const usage = newUsage()
    const rows = await mapConcurrent(jobs, opts.concurrency, async ({ doc, index, paragraph }): Promise<LinkRow> => {
        const question: QuestionSpec = {
            criteria: criteriaByDoc.get(doc.key) ?? {},
            instructions:
                'Which page should this paragraph link to, if any? Choose none when no page substantiates a claim made here.',
            type: 'choice',
        }
        const res = await client.ask(
            { paragraph: stripMarkup(paragraph).trim(), title: doc.title },
            { link_target: question }
        )
        record(usage, res)
        const answer = res.answers.link_target
        if (answer?.type !== 'choice') {
            throw new Error(`${doc.key} paragraph ${index}: expected a choice answer, got ${answer?.type ?? 'nothing'}`)
        }

        return {
            expected: linkTargets(paragraph, known),
            key: doc.key,
            paragraph: index,
            probabilities: answer.probabilities,
        }
    })
    const perPost = new Map<DocKey, { expected: Set<string>; predicted: Set<string> }>()
    for (const row of rows) {
        const entry = perPost.get(row.key) ?? { expected: new Set<string>(), predicted: new Set<string>() }
        for (const e of row.expected) entry.expected.add(e)
        for (const p of rankedOptions(row.probabilities).slice(0, 1))
            if (row.probabilities[p] >= PREDICT_THRESHOLD) entry.predicted.add(p)
        perPost.set(row.key, entry)
    }

    return {
        costUsd: usage.cost,
        inputTokens: usage.inputTokens,
        lang: opts.lang,
        metrics: linkMetrics(rows),
        model: usage.model,
        perPost: [...perPost.entries()].map(([key, v]) => ({
            expected: [...v.expected],
            key,
            predicted: [...v.predicted],
        })),
        posts: posts.length,
        requests: usage.requests,
        task: 'links',
    }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const PRIMARY: Record<Task, { baseline: string; metric: string }> = {
    links: { baseline: 'baselineHit@3', metric: 'hit@3' },
    tags: { baseline: 'baselineF1', metric: 'microF1@0.5' },
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(3))

export function formatTable(rows: string[][]): string {
    const widths = rows[0].map((_cell, i) => Math.max(...rows.map((r) => r[i].length)))

    return rows
        .map((r) =>
            r
                .map((cell, i) => cell.padEnd(widths[i]))
                .join('  ')
                .trimEnd()
        )
        .join('\n')
}

const summaryTable = (reports: EvalReport[]): string =>
    formatTable([
        ['task', 'lang', 'metric', 'value', 'baseline', 'posts', 'requests', 'tokens', 'cost USD'],
        ...reports.map((r) => [
            r.task,
            r.lang,
            PRIMARY[r.task].metric,
            fmt(r.metrics[PRIMARY[r.task].metric]),
            fmt(r.metrics[PRIMARY[r.task].baseline]),
            String(r.posts),
            String(r.requests),
            String(r.inputTokens),
            r.costUsd.toFixed(4),
        ]),
    ])

const detailLines = (r: EvalReport): string[] => {
    const lines = [`## ${r.task} / ${r.lang} (${r.model})`]
    for (const [key, value] of Object.entries(r.metrics)) lines.push(`${key.padEnd(22)} ${fmt(value)}`)
    if (r.perTag) {
        lines.push(
            '',
            formatTable([
                ['tag', 'support', 'precision', 'recall'],
                ...r.perTag.map((t) => [t.id, String(t.support), fmt(t.precision), fmt(t.recall)]),
            ])
        )
    }

    return lines
}

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value)
const isTask = (value: string): value is Task => (TASKS as readonly string[]).includes(value)

interface CliDeps {
    client?: JevClient
    log?: (line: string) => void
    root?: string
}

/** Returns the process exit code. A missing key is a skip (0), a bad flag is an error (2). */
export async function runCli(argv: string[], env: NodeJS.ProcessEnv, deps: CliDeps = {}): Promise<number> {
    const log = deps.log ?? console.log
    const { values } = parseArgs({
        args: argv,
        options: {
            concurrency: { type: 'string' },
            lang: { multiple: true, type: 'string' },
            limit: { type: 'string' },
            out: { type: 'string' },
            task: { multiple: true, type: 'string' },
        },
    })
    const tasks = values.task ?? ['tags', 'links']
    const langs = values.lang ?? ['en', 'fi']
    const bad = [...tasks.filter((t) => !isTask(t)), ...langs.filter((l) => !isLang(l))]
    if (bad.length > 0) {
        log(`unknown task or lang: ${bad.join(', ')}`)

        return 2
    }
    const positiveInt = (value: string | undefined): boolean => value === undefined || /^[1-9]\d*$/.test(value)
    if (!positiveInt(values.concurrency) || !positiveInt(values.limit)) {
        log('--concurrency and --limit take a positive integer')

        return 2
    }
    const provider = resolveProvider(env)
    if (!provider && !deps.client) {
        log(NO_PROVIDER_NOTICE)

        return 0
    }
    const client = deps.client ?? createClient(provider!)
    const opts = {
        concurrency: values.concurrency ? Number(values.concurrency) : CONCURRENCY_DEFAULT,
        limit: values.limit ? Number(values.limit) : undefined,
    }
    const reports: EvalReport[] = []
    for (const task of tasks.filter(isTask)) {
        for (const lang of langs.filter(isLang)) {
            const run = task === 'tags' ? runTagEval : runLinkEval
            const report = await run(client, { ...opts, lang }, deps.root)
            for (const line of detailLines(report)) log(line)
            log('')
            reports.push(report)
        }
    }
    log(summaryTable(reports))
    if (values.out) writeFileSync(values.out, JSON.stringify(reports, null, 2))

    return 0
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = await runCli(process.argv.slice(2), process.env)
}
