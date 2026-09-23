/**
 * suggestions.ts
 *
 * Receipts proving that a Jev suggestion script was run on the final text of
 * a document. suggest-links.ts writes one per document it completes (kind
 * "links") and one per issue it scanned for backlinks (kind "backlinks");
 * scripts/checks/suggestions-stale.ts requires them for every post or
 * newsletter a commit or pull request changes. The hash covers the three
 * locale files only, so the mandatory updatedDate bump in meta.json does not
 * invalidate a receipt. Network-free; no CLI.
 *
 * Spec: .agents/specs/jev/links.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { Document } from './corpus.ts'

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
/* eslint-enable import-x/extensions */

export const RECEIPTS_PATH = 'src/content/suggestions.json'
const RECEIPT_KINDS = ['links', 'backlinks'] as const

export type ReceiptKind = (typeof RECEIPT_KINDS)[number]

export interface Receipt {
    checkedAt: string
    contentHash: string
    model: string
}

export type ReceiptsFile = Record<ReceiptKind, Record<string, Receipt>>

export const emptyReceipts = (): ReceiptsFile => ({ backlinks: {}, links: {} })

const isReceipt = (value: unknown): value is Receipt =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Receipt).checkedAt === 'string' &&
    typeof (value as Receipt).contentHash === 'string' &&
    typeof (value as Receipt).model === 'string'

const isReceiptMap = (value: unknown): value is Record<string, Receipt> =>
    typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isReceipt)

/** Parse the receipts file; null when it is missing or does not have the expected shape. */
export function readReceipts(path: string): ReceiptsFile | null {
    if (!existsSync(path)) return null
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ReceiptsFile>

        return RECEIPT_KINDS.every((kind) => isReceiptMap(parsed[kind])) ? (parsed as ReceiptsFile) : null
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
    `${JSON.stringify({ backlinks: sorted(file.backlinks), links: sorted(file.links) }, null, 2)}\n`

export const writeReceipts = (path: string, file: ReceiptsFile): void => writeFileSync(path, serializeReceipts(file))

/** Record that `kind` ran on the document's current content. */
export function recordReceipt(
    file: ReceiptsFile,
    kind: ReceiptKind,
    doc: Document,
    model: string,
    checkedAt: string
): void {
    file[kind][doc.key] = { checkedAt, contentHash: doc.contentHash, model }
}

/** Whether the document has a receipt of that kind matching its current content. */
export const hasReceipt = (file: ReceiptsFile | null, kind: ReceiptKind, doc: Document): boolean =>
    file?.[kind][doc.key]?.contentHash === doc.contentHash

/** Which receipt kinds a changed document must carry. */
const requiredKinds = (doc: Document): ReceiptKind[] => (doc.kind === 'newsletter' ? ['links', 'backlinks'] : ['links'])

/** The command that produces a missing receipt. */
const commandFor = (kind: ReceiptKind, doc: Document): string =>
    kind === 'links'
        ? `npm run suggest:links -- ${doc.kind} ${doc.id}`
        : `npm run suggest:links -- --backlinks newsletter ${doc.id}`

/** One line per missing or stale receipt among the changed documents; empty means every changed document was checked. */
export function findUnchecked(file: ReceiptsFile | null, changed: Document[]): string[] {
    const problems: string[] = []
    for (const doc of changed) {
        for (const kind of requiredKinds(doc)) {
            if (hasReceipt(file, kind, doc)) continue
            const state = file?.[kind][doc.key] ? 'changed since the last run' : 'never run'
            problems.push(`${doc.key}: ${kind} ${state} — ${commandFor(kind, doc)}`)
        }
    }

    return problems
}
