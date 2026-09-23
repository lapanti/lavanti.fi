/**
 * links.ts
 *
 * Network-free helpers shared by the link eval (scripts/jev/eval.ts) and the
 * link-suggestion script (scripts/suggest-links.ts): which documents a
 * paragraph already links, the choice options for "which page substantiates
 * this paragraph", probability ranking, suggestion and doubtful rows, the
 * backlink question chunks, changed-document parsing and Markdown tables.
 * No CLI.
 *
 * Spec: .agents/specs/jev/links.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { NEWSLETTER_SEGMENTS, newsletterPath } from '../../src/lib/newsletterRoutes.ts'
import { stripMarkup } from '../checks/mdx-deep.ts'
import { CHOICE_OPTION_MAX, type QuestionSpec } from './client.ts'
import { type DocKey, type DocKind, type Document, labelFor } from './corpus.ts'
/* eslint-enable import-x/extensions */

export const NONE = 'none'
/** Rows below this probability are noise and not shown. */
const SUGGEST_FLOOR = 0.1
/** Rows at or above this are marked strong. Provisional: the eval measured hit@k, not calibration. */
export const SUGGEST_THRESHOLD = 0.5
/** An existing link whose target scores below this is flagged as doubtful. Provisional. */
const DOUBTFUL_THRESHOLD = 0.2
const SUGGEST_TOP = 3
export const BACKLINK_QUESTIONS_MAX = 40
const STARTS_WORDS = 8

const SEGMENT_KIND: Record<string, DocKind> = Object.fromEntries([
    ['blog', 'post'],
    ...Object.values(NEWSLETTER_SEGMENTS).map((segment) => [segment, 'newsletter']),
])

/** Documents a paragraph links to via /<lang>/blog/<id>/ or /<lang>/<newsletter segment>/<id>/; other links ignored. */
export function linkTargets(paragraph: string, known: ReadonlySet<DocKey>): DocKey[] {
    const out = new Set<DocKey>()
    for (const match of paragraph.matchAll(/\]\(\/(?:en|fi|sv)\/([a-z]+)\/(\d+)\//g)) {
        const kind = SEGMENT_KIND[match[1]]
        if (!kind) continue
        const key: DocKey = `${kind}:${Number(match[2])}`
        if (known.has(key)) out.add(key)
    }

    return [...out]
}

/** Choice criteria for one paragraph: every other document labelled in English, plus "none". Throws above the option cap. */
export function linkOptions(english: Document[], self: DocKey): Record<string, string> {
    if (english.length > CHOICE_OPTION_MAX) {
        throw new Error(
            `corpus has ${english.length} documents; a choice question allows CHOICE_OPTION_MAX=${CHOICE_OPTION_MAX} options`
        )
    }
    const criteria: Record<string, string> = {}
    for (const doc of english) if (doc.key !== self) criteria[doc.key] = labelFor(doc)
    criteria[NONE] = 'No page on the site substantiates a claim made in this paragraph'

    return criteria
}

/** Option keys by probability, best first, "none" excluded. */
export const rankedOptions = (probabilities: Record<string, number>): string[] =>
    Object.entries(probabilities)
        .filter(([key]) => key !== NONE)
        .sort(([, a], [, b]) => b - a)
        .map(([key]) => key)

/** The single most probable option, "none" included. */
export const topChoice = (probabilities: Record<string, number>): string =>
    Object.entries(probabilities).sort(([, a], [, b]) => b - a)[0]?.[0] ?? NONE

// ── suggestion helpers ────────────────────────────────────────────────────────

const plain = (paragraph: string): string => stripMarkup(paragraph).replace(/\s+/g, ' ').trim()

/** The first words of a paragraph, markup stripped, for a table cell. */
export function starts(paragraph: string): string {
    const words = plain(paragraph).split(' ')

    return words.length > STARTS_WORDS ? `${words.slice(0, STARTS_WORDS).join(' ')}…` : words.join(' ')
}

/** The state for one paragraph question: the paragraph without markup plus the document's localized title. */
export const paragraphState = (doc: Document, paragraph: string): { paragraph: string; title: string } => ({
    paragraph: plain(paragraph),
    title: doc.title,
})

/** Canonical URL in the document's locale; throws when the frontmatter has no slug. */
export function urlFor(doc: Document): string {
    if (!doc.slug) throw new Error(`${doc.key} has no slug in ${doc.lang}.mdx`)

    return doc.kind === 'post' ? `/${doc.lang}/blog/${doc.id}/${doc.slug}/` : newsletterPath(doc.lang, doc.id, doc.slug)
}

/** Every corpus document the document links anywhere in its prose. */
export function alreadyLinked(doc: Document, known: ReadonlySet<DocKey>): Set<DocKey> {
    const out = new Set<DocKey>()
    for (const paragraph of doc.paragraphs) for (const key of linkTargets(paragraph, known)) out.add(key)

    return out
}

/** Internal link count the way scripts/checks/content.sh counts it: every [text](/path) in the body. */
export const linkCount = (doc: Document): number => (doc.body.match(/\[[^\]]*\]\(\/[^)]*\)/g) ?? []).length

export interface SuggestionRow {
    index: number
    key: DocKey
    none: number
    p: number
    starts: string
    strong: boolean
    title: string
    url: string
}

export interface DoubtfulRow {
    current: DocKey
    index: number
    p: number
    starts: string
}

/** The top options for one paragraph that are worth showing: above the floor, not excluded, at most SUGGEST_TOP. */
export function suggestionRows(
    index: number,
    paragraph: string,
    probabilities: Record<string, number>,
    opts: { byKey: ReadonlyMap<DocKey, Document>; exclude: ReadonlySet<DocKey>; threshold: number }
): SuggestionRow[] {
    const none = probabilities[NONE] ?? 0
    const first = starts(paragraph)

    return rankedOptions(probabilities)
        .filter((key): key is DocKey => opts.byKey.has(key as DocKey) && !opts.exclude.has(key as DocKey))
        .filter((key) => probabilities[key] >= SUGGEST_FLOOR)
        .slice(0, SUGGEST_TOP)
        .map((key) => {
            const target = opts.byKey.get(key)!

            return {
                index,
                key,
                none,
                p: probabilities[key],
                starts: first,
                strong: probabilities[key] >= opts.threshold,
                title: target.title,
                url: urlFor(target),
            }
        })
}

/** Existing corpus links in the paragraph whose target Jev scores below DOUBTFUL_THRESHOLD. */
export function doubtfulRows(
    index: number,
    paragraph: string,
    probabilities: Record<string, number>,
    known: ReadonlySet<DocKey>
): DoubtfulRow[] {
    return linkTargets(paragraph, known)
        .map((current) => ({ current, index, p: probabilities[current] ?? 0, starts: starts(paragraph) }))
        .filter((row) => row.p < DOUBTFUL_THRESHOLD)
}

/** One noul per paragraph, chunked so a request never carries more than BACKLINK_QUESTIONS_MAX questions. */
export function backlinkQuestions(
    paragraphs: string[]
): Array<{ indexes: number[]; questions: Record<string, QuestionSpec> }> {
    const chunks: Array<{ indexes: number[]; questions: Record<string, QuestionSpec> }> = []
    for (let start = 0; start < paragraphs.length; start += BACKLINK_QUESTIONS_MAX) {
        const indexes: number[] = []
        const questions: Record<string, QuestionSpec> = {}
        for (let i = start; i < Math.min(start + BACKLINK_QUESTIONS_MAX, paragraphs.length); i++) {
            indexes.push(i)
            questions[`p${i}`] = {
                instructions: `This paragraph makes a claim that the newsletter issue substantiates: ${plain(paragraphs[i])}`,
                type: 'noul',
            }
        }
        chunks.push({ indexes, questions })
    }

    return chunks
}

/** Unique documents named by content paths, in path order. */
export function docsFromPaths(paths: string[]): Array<{ id: number; kind: DocKind }> {
    const seen = new Set<string>()
    const out: Array<{ id: number; kind: DocKind }> = []
    for (const path of paths) {
        const match = /(?:^|\/)src\/content\/(posts|newsletters)\/(\d+)\//.exec(path)
        if (!match) continue
        const kind: DocKind = match[1] === 'posts' ? 'post' : 'newsletter'
        const key = `${kind}:${match[2]}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ id: Number(match[2]), kind })
    }

    return out
}

/** A Markdown table; pipes inside cells are escaped. */
export function renderTable(headers: string[], rows: string[][]): string {
    const cell = (value: string): string => value.replaceAll('|', '\\|')
    const line = (values: string[]): string => `| ${values.map(cell).join(' | ')} |`

    return [line(headers), `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(line)].join('\n')
}
