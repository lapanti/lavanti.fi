/**
 * suggestions-stale.ts
 *
 * Fails when a changed post or newsletter has no matching receipt in
 * src/content/suggestions.json, i.e. `npm run suggest:links` was not run on
 * its final text (and, for a newsletter, `--backlinks` was not run either).
 * Pure file comparison — never calls Jev.
 *
 * Usage:
 *   node --experimental-strip-types scripts/checks/suggestions-stale.ts <changed file>…   (pre-commit, from lint-staged)
 *   node --experimental-strip-types scripts/checks/suggestions-stale.ts --base <ref>       (CI: documents changed since the merge base)
 *
 * Spec: .agents/specs/jev/links.md
 */

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { buildCorpus, type Document } from '../jev/corpus.ts'
import { docsFromPaths } from '../jev/links.ts'
import { findUnchecked, readReceipts, RECEIPTS_PATH } from '../jev/suggestions.ts'
/* eslint-enable import-x/extensions */

interface CheckDeps {
    git?: (args: string[]) => string
    log?: (line: string) => void
    path?: string
    root?: string
}

const defaultGit = (args: string[]): string => execFileSync('git', args, { encoding: 'utf8' })

/** The changed documents that still exist, from explicit paths or from a git range. */
export function changedDocuments(paths: string[], corpus: Document[]): Document[] {
    const byKey = new Map(corpus.map((d) => [d.key, d]))

    return docsFromPaths(paths)
        .map((t) => byKey.get(`${t.kind}:${t.id}`))
        .filter((d): d is Document => d !== undefined)
}

/** Returns the process exit code: 0 every changed document was checked, 1 otherwise, 2 bad arguments. */
export function runCheck(argv: string[], deps: CheckDeps = {}): number {
    const log = deps.log ?? console.log
    const git = deps.git ?? defaultGit
    const baseIndex = argv.indexOf('--base')
    const base = baseIndex === -1 ? null : argv[baseIndex + 1]
    const files = baseIndex === -1 ? argv : [...argv.slice(0, baseIndex), ...argv.slice(baseIndex + 2)]
    if ((baseIndex !== -1 && !base) || (base && files.length > 0)) {
        log('usage: suggestions-stale.ts <changed file>… | --base <ref>')

        return 2
    }
    const paths = base
        ? git([
              'diff',
              '--name-only',
              '--diff-filter=ACMR',
              `${base}...HEAD`,
              '--',
              'src/content/posts',
              'src/content/newsletters',
          ]).split('\n')
        : files
    const changed = changedDocuments(paths, buildCorpus({ root: deps.root }))
    if (changed.length === 0) return 0
    const problems = findUnchecked(readReceipts(deps.path ?? RECEIPTS_PATH), changed)
    if (problems.length === 0) return 0
    for (const problem of problems) log(`link suggestions not run on the final text: ${problem}`)
    log(`run the command(s) above, then commit ${RECEIPTS_PATH} with the content`)

    return 1
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = runCheck(process.argv.slice(2))
}
