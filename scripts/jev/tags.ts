/**
 * tags.ts
 *
 * Network-free helpers shared by the tag eval (scripts/jev/eval.ts) and the
 * tag-suggestion script (scripts/suggest-tags.ts): the English tag labels and
 * noul questions, the registry of tag ids, partitioning of an answer into
 * consider / doubtful / pillar, and the editorial tags that are never
 * suggested. No CLI.
 *
 * Spec: .agents/specs/jev/tags.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { LocalTag } from '../../src/content/tags/types.ts'
import type { QuestionSpec } from './client.ts'

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
/* eslint-enable import-x/extensions */

const TAGS_DIR = join(fileURLToPath(import.meta.url), '..', '..', '..', 'src', 'content', 'tags')
const TAGS_REGISTRY = join(TAGS_DIR, '..', 'tags.ts')
/** Tags not assigned to a post are suggested at or above this. Provisional. */
export const CONSIDER_THRESHOLD = 0.7
/** Assigned tags scoring below this are flagged. Provisional. */
export const DOUBTFUL_THRESHOLD = 0.2
/** The pillar tags content.sh:183 requires at least one of on posts with id ≥ 43. */
export const PILLAR_TAGS = [
    'artificial-intelligence',
    'digital-independence',
    'economy',
    'culture-and-education',
    'freedom',
]

/**
 * Tags that describe the post's occasion rather than its text, never suggested.
 * Measured in the eval (recall 0.08–0.28): municipal-elections-2025,
 * parliamentary-elections-2027, regional-elections-2025. Judged to be the same
 * kind: coop-elections, council-motion, green-party, marketgreen,
 * regional-elections-2022.
 */
export const EDITORIAL_TAGS = [
    'coop-elections',
    'council-motion',
    'green-party',
    'marketgreen',
    'municipal-elections-2025',
    'parliamentary-elections-2027',
    'regional-elections-2022',
    'regional-elections-2025',
]

export interface TagLabel {
    description: string
    id: string
    name: string
}

const isLocalTag = (value: unknown): value is LocalTag =>
    typeof value === 'object' && value !== null && 'id' in value && 'names' in value && 'descriptions' in value

/**
 * English label per tag: option labels never change with --lang. Loads the
 * per-tag files one by one because src/content/tags.ts imports them without
 * extensions, which Node's strip-types loader cannot resolve. Throws a
 * descriptive error on a file without a LocalTag export or English fields.
 */
export async function loadTagLabels(dir = TAGS_DIR): Promise<TagLabel[]> {
    const files = readdirSync(dir)
        .filter((name) => name.endsWith('.ts') && name !== 'types.ts')
        .sort()
    const labels: TagLabel[] = []
    for (const file of files) {
        const mod = (await import(pathToFileURL(join(dir, file)).href)) as Record<string, unknown>
        const tag = Object.values(mod).find(isLocalTag)
        if (!tag) throw new Error(`${file}: no LocalTag export`)
        if (typeof tag.names?.en !== 'string') throw new Error(`${file}: missing names.en`)
        if (typeof tag.descriptions?.en?.[0] !== 'string') throw new Error(`${file}: missing descriptions.en`)
        labels.push({ description: tag.descriptions.en[0], id: tag.id, name: tag.names.en })
    }

    return labels
}

/** One noul per tag, English label and first English description paragraph. */
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

/** Ids the taxonomy registers: the `from './tags/<id>'` import lines of src/content/tags.ts. */
export function registeredTagIds(registry = TAGS_REGISTRY): Set<string> {
    const source = readFileSync(registry, 'utf8')

    return new Set(
        [...source.matchAll(/from '\.\/tags\/([a-z0-9-]+)'/g)].map((m) => m[1]).filter((id) => id !== 'types')
    )
}

/** Keys at or above the threshold. */
export const predictedAt = (probabilities: Record<string, number>, threshold: number): string[] =>
    Object.entries(probabilities)
        .filter(([, p]) => p >= threshold)
        .map(([key]) => key)

export interface TagPartition {
    consider: Array<{ id: string; p: number }>
    doubtful: Array<{ id: string; p: number }>
    pillar: Array<{ assigned: boolean; id: string; p: number }>
}

/**
 * Split an answer for one post. Consider: not assigned, not editorial, not a
 * pillar, p ≥ consider, best first. Doubtful: assigned, not editorial, p <
 * doubtful. Pillar: the five pillar tags in fixed order with p and whether
 * they are assigned.
 */
export function partition(
    probabilities: Record<string, number>,
    assigned: string[],
    opts: { consider: number; doubtful: number }
): TagPartition {
    const p = (id: string): number => probabilities[id] ?? 0
    const excluded = (id: string): boolean => EDITORIAL_TAGS.includes(id) || PILLAR_TAGS.includes(id)
    const consider = Object.keys(probabilities)
        .filter((id) => !assigned.includes(id) && !excluded(id) && p(id) >= opts.consider)
        .map((id) => ({ id, p: p(id) }))
        .toSorted((a, b) => b.p - a.p || a.id.localeCompare(b.id))
    const doubtful = assigned
        .filter((id) => !EDITORIAL_TAGS.includes(id) && p(id) < opts.doubtful)
        .map((id) => ({ id, p: p(id) }))
        .toSorted((a, b) => a.p - b.p || a.id.localeCompare(b.id))
    const pillar = PILLAR_TAGS.map((id) => ({ assigned: assigned.includes(id), id, p: p(id) }))

    return { consider, doubtful, pillar }
}

/** Tag ids named by content paths, types.ts excluded, unique, path order. */
export function tagIdsFromPaths(paths: string[]): string[] {
    const out: string[] = []
    for (const path of paths) {
        const match = /(?:^|\/)src\/content\/tags\/([a-z0-9-]+)\.ts$/.exec(path)
        if (!match || match[1] === 'types' || out.includes(match[1])) continue
        out.push(match[1])
    }

    return out
}

/** sha256 over the tag file, hex; the receipt of a retro-scan. */
export const hashTagFile = (id: string, dir = TAGS_DIR): string =>
    createHash('sha256')
        .update(readFileSync(join(dir, `${id}.ts`)))
        .digest('hex')
