/**
 * related.ts
 *
 * Shared, network-free pieces of the ranked related-posts feature: the shape
 * of src/content/related.json, candidate selection, ranking of a Jev answer,
 * the stabilisation rule, request planning and the staleness check. Used by
 * scripts/generate-related.ts and scripts/checks/related-stale.ts; no CLI.
 *
 * Spec: .agents/specs/jev/related.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { DocKey, DocKind, Document } from './corpus.ts'

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
/* eslint-enable import-x/extensions */

const MODEL_FAMILY = 'jev-1.13'
export const RANKED_MAX = 10
const STABLE_TOP = 3
export const RELATED_PATH = 'src/content/related.json'
export const REGEN_HINT = 'run `npm run generate:related` and commit src/content/related.json'

export interface RankedItem {
    key: DocKey
    p: number
}

export interface RelatedEntry {
    ranked: RankedItem[]
    sourceHash: string
}

export interface RelatedFile {
    candidateSetHash: string
    entries: Record<string, RelatedEntry>
    generatedAt: string
    model: string
}

const KEY_RE = /^(post|newsletter):(\d+)$/

const parseKey = (key: string): { id: number; kind: DocKind } | null => {
    const match = KEY_RE.exec(key)

    return match ? { id: Number(match[2]), kind: match[1] as DocKind } : null
}

/** Order documents (or keys) by kind then numeric id, so every list in the file is deterministic. */
const byKindThenId = (a: Pick<Document, 'id' | 'kind'>, b: Pick<Document, 'id' | 'kind'>): number =>
    a.kind.localeCompare(b.kind) || a.id - b.id

export const sortKeys = (keys: string[]): string[] =>
    keys
        .map((key) => ({ key, parsed: parseKey(key) }))
        .toSorted((a, b) => (a.parsed && b.parsed ? byKindThenId(a.parsed, b.parsed) : a.key.localeCompare(b.key)))
        .map(({ key }) => key)

/** sha256 over the document keys in canonical order; changes whenever a document is added or removed. */
export function candidateSetHash(corpus: Document[]): string {
    const keys = corpus.toSorted(byKindThenId).map((d) => d.key)

    return createHash('sha256').update(keys.join('\n')).digest('hex')
}

/** Every other document of the same kind, in canonical order. */
export const candidatesFor = (doc: Document, corpus: Document[]): Document[] =>
    corpus.filter((d) => d.kind === doc.kind && d.key !== doc.key).toSorted(byKindThenId)

const round2 = (p: number): number => Math.round(p * 100) / 100

/**
 * Rank the candidates by the answer's probabilities: p rounded to 2 decimals, zero dropped,
 * ties by publishDate desc then id desc, at most RANKED_MAX. Keys the answer names that are
 * not candidates are ignored; candidates the answer omits count as zero.
 */
export function rankAnswer(probabilities: Record<string, number>, candidates: Document[]): RankedItem[] {
    return candidates
        .map((doc) => ({ doc, p: round2(probabilities[doc.key] ?? 0) }))
        .filter(({ p }) => p > 0)
        .toSorted((a, b) => b.p - a.p || b.doc.publishDate.localeCompare(a.doc.publishDate) || b.doc.id - a.doc.id)
        .slice(0, RANKED_MAX)
        .map(({ doc, p }) => ({ key: doc.key, p }))
}

const sameTop = (a: RankedItem[], b: RankedItem[]): boolean => {
    const topA = a.slice(0, STABLE_TOP).map((r) => r.key)
    const topB = b.slice(0, STABLE_TOP).map((r) => r.key)

    return topA.length === topB.length && topA.every((key, i) => key === topB[i])
}

/**
 * Stabilisation rule: on an edit-only run keep the stored list when the top three did not
 * change (Jev drifts between runs); when everything is being rewritten, or there is no stored
 * entry, or the top three changed, take the fresh ranking.
 */
export function mergeEntry(
    previous: RelatedEntry | undefined,
    fresh: RelatedEntry,
    opts: { rewriteAll: boolean }
): RelatedEntry {
    if (opts.rewriteAll || !previous || !sameTop(previous.ranked, fresh.ranked)) return fresh

    return { ranked: previous.ranked, sourceHash: fresh.sourceHash }
}

/** Which documents to ask. A changed candidate set (or --force) re-asks and rewrites everything. */
export function planRequests(
    file: RelatedFile | null,
    corpus: Document[],
    force: boolean
): { keys: DocKey[]; rewriteAll: boolean } {
    const all = corpus.toSorted(byKindThenId).map((d) => d.key)
    if (force || !file || file.candidateSetHash !== candidateSetHash(corpus)) return { keys: all, rewriteAll: true }
    const keys = corpus
        .toSorted(byKindThenId)
        .filter((d) => file.entries[d.key]?.sourceHash !== d.sourceHash)
        .map((d) => d.key)

    return { keys, rewriteAll: false }
}

/** Every reason the file does not match the content on disk; empty means in sync. */
export function findStale(file: RelatedFile | null, corpus: Document[]): string[] {
    if (!file) return [`${RELATED_PATH} is missing or malformed`]
    const problems: string[] = []
    if (!file.model.includes(MODEL_FAMILY)) {
        problems.push(`model ${file.model} is not ${MODEL_FAMILY}; run \`npm run generate:related -- --force\``)
    }
    if (file.candidateSetHash !== candidateSetHash(corpus))
        problems.push('candidate set changed (a document was added or removed)')
    const known = new Set(corpus.map((d) => d.key))
    for (const doc of corpus.toSorted(byKindThenId)) {
        const entry = file.entries[doc.key]
        if (!entry) problems.push(`${doc.key}: no entry`)
        else if (entry.sourceHash !== doc.sourceHash) problems.push(`${doc.key}: content changed since generation`)
    }
    for (const key of sortKeys(Object.keys(file.entries))) {
        if (!known.has(key as DocKey)) problems.push(`${key}: entry for a document that no longer exists`)
        for (const item of file.entries[key].ranked) {
            if (!known.has(item.key)) problems.push(`${key}: ranked key ${item.key} no longer exists`)
        }
    }

    return problems
}

const isItem = (value: unknown): value is RankedItem =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RankedItem).key === 'string' &&
    typeof (value as RankedItem).p === 'number'

const isEntry = (value: unknown): value is RelatedEntry =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RelatedEntry).sourceHash === 'string' &&
    Array.isArray((value as RelatedEntry).ranked) &&
    (value as RelatedEntry).ranked.every(isItem)

/** Parse the file; null when it is missing or does not have the expected shape. */
export function readRelatedFile(path: string): RelatedFile | null {
    if (!existsSync(path)) return null
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RelatedFile>
        const shapeOk =
            typeof parsed.candidateSetHash === 'string' &&
            typeof parsed.generatedAt === 'string' &&
            typeof parsed.model === 'string' &&
            typeof parsed.entries === 'object' &&
            parsed.entries !== null &&
            !Array.isArray(parsed.entries) &&
            Object.values(parsed.entries).every(isEntry)

        return shapeOk ? (parsed as RelatedFile) : null
    } catch {
        return null
    }
}

/** Canonical text of the file: entries by kind then id, 2-space indent, trailing newline. */
export function serialize(file: RelatedFile): string {
    const entries: Record<string, RelatedEntry> = {}
    for (const key of sortKeys(Object.keys(file.entries))) entries[key] = file.entries[key]

    return `${JSON.stringify(
        { candidateSetHash: file.candidateSetHash, entries, generatedAt: file.generatedAt, model: file.model },
        null,
        2
    )}\n`
}
