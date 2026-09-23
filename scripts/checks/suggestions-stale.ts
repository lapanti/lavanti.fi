/**
 * suggestions-stale.ts
 *
 * Fails when a changed post or newsletter has no matching receipt in
 * src/content/suggestions.json, i.e. `npm run suggest:links` was not run on
 * its final text (and, for a newsletter, `--backlinks` was not run either), or
 * when a changed tag file has no receipt that `npm run suggest:tags -- --tag`
 * was run on its current content. Pure file comparison — never calls Jev.
 *
 * Usage:
 *   node --experimental-strip-types scripts/checks/suggestions-stale.ts <changed file>…   (pre-commit, from lint-staged)
 *   node --experimental-strip-types scripts/checks/suggestions-stale.ts --base <ref>       (CI: files changed since the merge base)
 *
 * Specs: .agents/specs/jev/links.md, .agents/specs/jev/tags.md
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { buildCorpus, type Document } from '../jev/corpus.ts'
import { docsFromPaths } from '../jev/links.ts'
import { type ChangedTag, findUnchecked, readReceipts, RECEIPTS_PATH } from '../jev/suggestions.ts'
import { hashTagFile, tagIdsFromPaths } from '../jev/tags.ts'
/* eslint-enable import-x/extensions */

interface CheckDeps {
    git?: (args: string[]) => string
    log?: (line: string) => void
    path?: string
    root?: string
    tagsDir?: string
}

const DIFF_PATHS = ['src/content/posts', 'src/content/newsletters', 'src/content/tags']

const defaultGit = (args: string[]): string => execFileSync('git', args, { encoding: 'utf8' })

/**
 * The changed documents that still exist, from explicit paths or from a git
 * range. Only the locale files count — they are what the receipt hashes — so a
 * meta.json-only edit (tags, updatedDate) needs no new run.
 */
export function changedDocuments(paths: string[], corpus: Document[]): Document[] {
    const byKey = new Map(corpus.map((d) => [d.key, d]))

    return docsFromPaths(paths.filter((path) => /\/(fi|sv|en)\.mdx$/.test(path)))
        .map((t) => byKey.get(`${t.kind}:${t.id}`))
        .filter((d): d is Document => d !== undefined)
}

/** The changed tag files that still exist, with their current hash. */
export function changedTags(paths: string[], tagsDir: string): ChangedTag[] {
    return tagIdsFromPaths(paths)
        .filter((id) => existsSync(join(tagsDir, `${id}.ts`)))
        .map((id) => ({ hash: hashTagFile(id, tagsDir), id }))
}

/** Returns the process exit code: 0 everything changed was checked, 1 otherwise, 2 bad arguments. */
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
        ? git(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`, '--', ...DIFF_PATHS]).split('\n')
        : files
    const tagsDir = deps.tagsDir ?? join(deps.root ?? 'src/content', 'tags')
    const tags = changedTags(paths, tagsDir)
    const changed = changedDocuments(paths, buildCorpus({ root: deps.root }))
    if (changed.length === 0 && tags.length === 0) return 0
    const problems = findUnchecked(readReceipts(deps.path ?? RECEIPTS_PATH), changed, tags)
    if (problems.length === 0) return 0
    for (const problem of problems) {
        log(
            problem.startsWith('tag ')
                ? `tag retro-scan not run on the current tag file: ${problem}`
                : `link suggestions not run on the final text: ${problem}`
        )
    }
    log(`run the command(s) above, then commit ${RECEIPTS_PATH} with the content`)

    return 1
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = runCheck(process.argv.slice(2))
}
