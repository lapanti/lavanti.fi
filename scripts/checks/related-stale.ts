/**
 * related-stale.ts
 *
 * Fails when src/content/related.json does not match the posts and newsletters
 * on disk: a document was added, edited or removed, or the file was generated
 * by another model family. Pure hash comparison — never calls Jev.
 *
 * Usage: node --experimental-strip-types scripts/checks/related-stale.ts
 *
 * Spec: .agents/specs/jev/related.md
 */

import { fileURLToPath } from 'node:url'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { buildCorpus } from '../jev/corpus.ts'
import { findStale, readRelatedFile, REGEN_HINT, RELATED_PATH } from '../jev/related.ts'
/* eslint-enable import-x/extensions */

interface CheckDeps {
    log?: (line: string) => void
    path?: string
    root?: string
}

/** Returns the process exit code: 0 in sync, 1 with one line per problem. */
export function runCheck(deps: CheckDeps = {}): number {
    const log = deps.log ?? console.log
    const path = deps.path ?? RELATED_PATH
    const problems = findStale(readRelatedFile(path), buildCorpus({ root: deps.root }))
    if (problems.length === 0) return 0
    for (const problem of problems) log(`related.json stale: ${problem}`)
    log(REGEN_HINT)

    return 1
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = runCheck()
}
