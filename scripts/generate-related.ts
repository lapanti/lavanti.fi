/**
 * generate-related.ts
 *
 * Asks Jev, once per post and newsletter, which other document of the same kind
 * is the best next read, and writes the ranking to src/content/related.json.
 * Incremental: only documents whose content hash changed are asked, unless a
 * document was added or removed (or --force), in which case everything is
 * re-asked and rewritten. Author-run; never part of the build, hooks or CI.
 *
 * Usage: node --env-file-if-exists=.env --experimental-strip-types scripts/generate-related.ts [--force] [--concurrency C]
 *
 * Spec: .agents/specs/jev/related.md
 */

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { helsinkiDateOf } from '../src/lib/publishing.ts'
import {
    CHOICE_OPTION_MAX,
    createClient,
    type JevClient,
    mapConcurrent,
    NO_PROVIDER_NOTICE,
    resolveProvider,
} from './jev/client.ts'
import { buildCorpus, type DocKey, type Document, labelFor, stateFor } from './jev/corpus.ts'
import {
    candidateSetHash,
    candidatesFor,
    mergeEntry,
    planRequests,
    rankAnswer,
    readRelatedFile,
    RELATED_PATH,
    type RelatedEntry,
    type RelatedFile,
    serialize,
} from './jev/related.ts'
/* eslint-enable import-x/extensions */

export const CONCURRENCY_DEFAULT = 4
const INSTRUCTIONS = 'Which of these is the best next read for someone who has just finished this article?'

interface GenerateDeps {
    client?: JevClient
    log?: (line: string) => void
    path?: string
    root?: string
    today?: () => string
}

const today = (): string => helsinkiDateOf(new Date())

/** Throws before any request when some kind has more candidates than one choice question can hold. */
export const assertOptionCap = (corpus: Pick<Document, 'kind'>[]): void => {
    for (const kind of ['post', 'newsletter'] as const) {
        const count = corpus.filter((d) => d.kind === kind).length - 1
        if (count > CHOICE_OPTION_MAX) {
            throw new Error(`${count} ${kind} candidates exceed CHOICE_OPTION_MAX=${CHOICE_OPTION_MAX}`)
        }
    }
}

/** Returns the process exit code. */
export async function runGenerate(argv: string[], env: NodeJS.ProcessEnv, deps: GenerateDeps = {}): Promise<number> {
    const log = deps.log ?? console.log
    const path = deps.path ?? RELATED_PATH
    const { values } = parseArgs({
        args: argv,
        options: { concurrency: { type: 'string' }, force: { type: 'boolean' } },
    })
    if (values.concurrency !== undefined && !/^[1-9]\d*$/.test(values.concurrency)) {
        log('--concurrency takes a positive integer')

        return 2
    }
    const provider = resolveProvider(env)
    if (!provider && !deps.client) {
        log(NO_PROVIDER_NOTICE)
        log('a regeneration was requested and cannot run without a key')

        return 1
    }
    const client = deps.client ?? createClient(provider!)
    const corpus = buildCorpus({ root: deps.root })
    const previous = readRelatedFile(path)
    const { keys, rewriteAll } = planRequests(previous, corpus, values.force ?? false)
    if (keys.length === 0) {
        log(`${path} is in sync; nothing to ask`)

        return 0
    }
    assertOptionCap(corpus)
    const byKey = new Map(corpus.map((d) => [d.key, d]))
    const concurrency = values.concurrency ? Number(values.concurrency) : CONCURRENCY_DEFAULT
    let model = previous?.model ?? ''
    let cost = 0
    let failedKey: DocKey | null = null
    let results: Array<{ entry: RelatedEntry; key: DocKey }>
    try {
        results = await mapConcurrent(keys, concurrency, async (key) => {
            const doc = byKey.get(key)!
            const candidates = candidatesFor(doc, corpus)
            const criteria = Object.fromEntries(candidates.map((c) => [c.key, labelFor(c)]))
            let answer
            try {
                const res = await client.ask(stateFor(doc), {
                    next_read: { criteria, instructions: INSTRUCTIONS, type: 'choice' },
                })
                model = res.model
                cost += res.usage.cost ?? 0
                answer = res.answers.next_read
            } catch (error) {
                failedKey ??= key
                throw error
            }
            if (answer?.type !== 'choice') {
                failedKey ??= key
                throw new Error(`${key}: expected a choice answer, got ${answer?.type ?? 'nothing'}`)
            }

            return { entry: { ranked: rankAnswer(answer.probabilities, candidates), sourceHash: doc.sourceHash }, key }
        })
    } catch (error) {
        log(`generation failed at ${failedKey ?? 'unknown'}: ${error instanceof Error ? error.message : String(error)}`)
        log(`${path} left untouched`)

        return 1
    }
    const entries: Record<string, RelatedEntry> = rewriteAll ? {} : { ...previous!.entries }
    let rewritten = 0
    for (const { entry, key } of results) {
        const merged = mergeEntry(previous?.entries[key], entry, { rewriteAll })
        if (merged === entry) rewritten++
        entries[key] = merged
    }
    const file: RelatedFile = {
        candidateSetHash: candidateSetHash(corpus),
        entries,
        generatedAt: (deps.today ?? today)(),
        model,
    }
    writeFileSync(path, serialize(file))
    log(
        `asked ${keys.length} document(s) (${rewriteAll ? 'full rewrite' : 'incremental'}), rewrote ${rewritten}, kept ${keys.length - rewritten}, cost $${cost.toFixed(4)}`
    )
    log(`wrote ${path}`)

    return 0
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = await runGenerate(process.argv.slice(2), process.env)
}
