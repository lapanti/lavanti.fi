/**
 * suggestions.ts
 *
 * Receipts proving that a Jev suggestion script was run on the final text of
 * a document or the current version of a tag file. suggest-links.ts writes one
 * per document it completes (kind "links") and one per issue it scanned for
 * backlinks (kind "backlinks"); suggest-tags.ts writes one per tag it
 * retro-scanned (kind "tags", keyed by tag id, hashed over the tag file).
 * scripts/checks/suggestions-stale.ts requires them for every post,
 * newsletter or tag file a commit or pull request changes. The document hash
 * covers the three locale files only, so the mandatory updatedDate bump in
 * meta.json does not invalidate a receipt. Network-free; no CLI.
 *
 * Specs: .agents/specs/jev/links.md, .agents/specs/jev/tags.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { Document } from './corpus.ts'

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
/* eslint-enable import-x/extensions */

export const RECEIPTS_PATH = 'src/content/suggestions.json'
const RECEIPT_KINDS = ['links', 'backlinks', 'tags'] as const

type ReceiptKind = (typeof RECEIPT_KINDS)[number]

export interface Receipt {
    checkedAt: string
    contentHash: string
    model: string
}

export type ReceiptsFile = Record<ReceiptKind, Record<string, Receipt>>

export interface ChangedTag {
    hash: string
    id: string
}

export const emptyReceipts = (): ReceiptsFile => ({ backlinks: {}, links: {}, tags: {} })

const isReceipt = (value: unknown): value is Receipt =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Receipt).checkedAt === 'string' &&
    typeof (value as Receipt).contentHash === 'string' &&
    typeof (value as Receipt).model === 'string'

const isReceiptMap = (value: unknown): value is Record<string, Receipt> =>
    typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isReceipt)

/**
 * Parse the receipts file. A kind absent from the file reads as an empty map, so
 * a file written before a kind existed stays valid; null only for a missing file,
 * unparseable JSON, or a kind that is present but malformed.
 */
export function readReceipts(path: string): ReceiptsFile | null {
    if (!existsSync(path)) return null
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Record<ReceiptKind, unknown>>
        if (typeof parsed !== 'object' || parsed === null) return null
        const file = emptyReceipts()
        for (const kind of RECEIPT_KINDS) {
            const value = parsed[kind]
            if (value === undefined) continue
            if (!isReceiptMap(value)) return null
            file[kind] = value
        }

        return file
    } catch {
        return null
    }
}

const sorted = (map: Record<string, Receipt>): Record<string, Receipt> =>
    Object.fromEntries(
        Object.keys(map)
            .toSorted()
            .map((key) => [key, map[key]])
    )

/** Canonical text: kinds in fixed order, keys sorted, 2-space indent, trailing newline. */
export const serializeReceipts = (file: ReceiptsFile): string =>
    `${JSON.stringify({ backlinks: sorted(file.backlinks), links: sorted(file.links), tags: sorted(file.tags) }, null, 2)}\n`

export const writeReceipts = (path: string, file: ReceiptsFile): void => writeFileSync(path, serializeReceipts(file))

/** Record that a document-level kind ran on the document's current content. */
export function recordReceipt(
    file: ReceiptsFile,
    kind: 'backlinks' | 'links',
    doc: Document,
    model: string,
    checkedAt: string
): void {
    file[kind][doc.key] = { checkedAt, contentHash: doc.contentHash, model }
}

/** Record that the retro-scan ran against the current version of a tag file. */
export function recordTagReceipt(file: ReceiptsFile, tag: ChangedTag, model: string, checkedAt: string): void {
    file.tags[tag.id] = { checkedAt, contentHash: tag.hash, model }
}

/** Whether the document has a receipt of that kind matching its current content. */
export const hasReceipt = (file: ReceiptsFile | null, kind: 'backlinks' | 'links', doc: Document): boolean =>
    file?.[kind][doc.key]?.contentHash === doc.contentHash

/** Which receipt kinds a changed document must carry. */
const requiredKinds = (doc: Document): Array<'backlinks' | 'links'> =>
    doc.kind === 'newsletter' ? ['links', 'backlinks'] : ['links']

/** The command that produces a missing receipt. */
const commandFor = (kind: 'backlinks' | 'links', doc: Document): string =>
    kind === 'links'
        ? `npm run suggest:links -- ${doc.kind} ${doc.id}`
        : `npm run suggest:links -- --backlinks newsletter ${doc.id}`

/**
 * One line per missing or stale receipt among the changed documents and tag
 * files; empty means everything changed was checked.
 */
export function findUnchecked(
    file: ReceiptsFile | null,
    changed: Document[],
    changedTags: ChangedTag[] = []
): string[] {
    const problems: string[] = []
    for (const doc of changed) {
        for (const kind of requiredKinds(doc)) {
            if (hasReceipt(file, kind, doc)) continue
            const state = file?.[kind][doc.key] ? 'changed since the last run' : 'never run'
            problems.push(`${doc.key}: ${kind} ${state} — ${commandFor(kind, doc)}`)
        }
    }
    for (const tag of changedTags) {
        const receipt = file?.tags[tag.id]
        if (receipt?.contentHash === tag.hash) continue
        const state = receipt ? 'changed since the last run' : 'never run'
        problems.push(`tag ${tag.id}: retro-scan ${state} — npm run suggest:tags -- --tag ${tag.id}`)
    }

    return problems
}
