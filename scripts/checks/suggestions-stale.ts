/**
 * suggestions-stale.ts
 *
 * Fails when a changed post or newsletter has no matching receipt in
 * src/content/suggestions.json, i.e. `npm run suggest:links` was not run on
 * its final text (and, for a newsletter, `--backlinks` was not run either), or
 * when a changed tag file has no receipt that `npm run suggest:tags -- --tag`
 * was run on its current label (the fields Jev reads), or when a changed post
 * carries a tag with `featured` whose post set changed since the last
 * `npm run suggest:tags -- --intro` (a new post may be the better first read).
 * Pure file comparison — never calls Jev.
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
import { hashIntroSet, hashTagFile, loadLocalTag, tagIdsFromPaths } from '../jev/tags.ts'
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

/** The changed tag files that still exist, with the current hash of their label. */
export async function changedTags(paths: string[], tagsDir: string): Promise<ChangedTag[]> {
    const ids = tagIdsFromPaths(paths).filter((id) => existsSync(join(tagsDir, `${id}.ts`)))

    return Promise.all(ids.map(async (id) => ({ hash: await hashTagFile(id, tagsDir), id })))
}

/**
 * The tags with `featured` that a changed post carries, with the hash of each
 * tag's current post set. Any post file counts, meta.json included, since that
 * is where tags live; an edit that leaves the set alone leaves the hash alone.
 */
export async function changedFeaturedTags(paths: string[], corpus: Document[], tagsDir: string): Promise<ChangedTag[]> {
    const posts = corpus.filter((d) => d.kind === 'post')
    const byId = new Map(posts.map((p) => [p.id, p]))
    const carried = new Set(
        docsFromPaths(paths)
            .filter((t) => t.kind === 'post')
            .flatMap((t) => byId.get(t.id)?.tags ?? [])
    )
    const featured: string[] = []
    for (const id of [...carried].toSorted()) {
        if (!existsSync(join(tagsDir, `${id}.ts`))) continue
        const tag = await loadLocalTag(tagsDir, `${id}.ts`)
        if ((tag.featured?.length ?? 0) > 0) featured.push(id)
    }

    return featured.map((id) => ({ hash: hashIntroSet(id, posts), id }))
}

/** Returns the process exit code: 0 everything changed was checked, 1 otherwise, 2 bad arguments. */
export async function runCheck(argv: string[], deps: CheckDeps = {}): Promise<number> {
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
    const tags = await changedTags(paths, tagsDir)
    const corpus = buildCorpus({ root: deps.root })
    const changed = changedDocuments(paths, corpus)
    const featured = await changedFeaturedTags(paths, corpus, tagsDir)
    if (changed.length === 0 && tags.length === 0 && featured.length === 0) return 0
    const problems = findUnchecked(readReceipts(deps.path ?? RECEIPTS_PATH), changed, tags, featured)
    if (problems.length === 0) return 0
    for (const problem of problems) {
        log(
            problem.startsWith('tag ')
                ? `tag retro-scan not run on the current tag file: ${problem}`
                : problem.startsWith('intro ')
                  ? `featured not re-ranked for the tag's current posts: ${problem}`
                  : `link suggestions not run on the final text: ${problem}`
        )
    }
    log(`run the command(s) above, then commit ${RECEIPTS_PATH} with the content`)

    return 1
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    process.exitCode = await runCheck(process.argv.slice(2))
}
