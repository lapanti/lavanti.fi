/**
 * adoption-pages.ts
 *
 * Enforces the AGENTS.md rule for personal adoption pages: every page is added, changed or
 * removed in a commit of its own that touches only src/content/adoptionPages.json and only one
 * entry in it, so a single `git revert` (or one removal commit) undoes exactly one page.
 * Spec: .agents/specs/sign-adoption/spec.md § Personal pages.
 *
 *   node --experimental-strip-types scripts/checks/adoption-pages.ts            (staged, pre-commit)
 *   node --experimental-strip-types scripts/checks/adoption-pages.ts --base <ref> (every commit, CI)
 *
 * The commit that creates the file is exempt: it adds the empty list before any page exists.
 */

import { execFileSync } from 'node:child_process'

export const PAGES_FILE = 'src/content/adoptionPages.json'

export interface ChangedFile {
    path: string
    /** git name-status letter: A, M, D, R… */
    status: string
}

const bySlug = (text: null | string): Map<string, string> => {
    const map = new Map<string, string>()
    if (text === null) return map
    let entries: unknown
    try {
        entries = JSON.parse(text)
    } catch {
        // Unparseable JSON fails the build's own validation; here it counts as one opaque entry.
        map.set('(unparseable)', text)

        return map
    }
    if (!Array.isArray(entries)) return map
    for (const entry of entries) {
        const slug = (entry as { slug?: unknown }).slug
        map.set(typeof slug === 'string' ? slug : JSON.stringify(entry), JSON.stringify(entry))
    }

    return map
}

/** Slugs added, removed or changed between two versions of the file. */
export const changedSlugs = (before: null | string, after: null | string): string[] => {
    const a = bySlug(before)
    const b = bySlug(after)

    return [...new Set([...a.keys(), ...b.keys()])].filter((slug) => a.get(slug) !== b.get(slug)).sort()
}

/** The rule violations of one commit (or the staged change). */
export const checkChange = (files: ChangedFile[], before: null | string, after: null | string): string[] => {
    const pages = files.find((f) => f.path === PAGES_FILE)
    if (!pages || pages.status.startsWith('A')) return []
    const errors: string[] = []
    const others = files.filter((f) => f.path !== PAGES_FILE).map((f) => f.path)
    if (others.length > 0) errors.push(`${PAGES_FILE} changes together with ${others.join(', ')}`)
    const slugs = changedSlugs(before, after)
    if (slugs.length > 1) errors.push(`${PAGES_FILE} changes ${slugs.length} entries (${slugs.join(', ')})`)

    return errors
}

const git = (...args: string[]): string =>
    execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })

const blob = (rev: string, path: string): null | string => {
    try {
        return git('show', `${rev}:${path}`)
    } catch {
        return null
    }
}

const parseNameStatus = (output: string): ChangedFile[] =>
    output
        .split('\n')
        .filter(Boolean)
        .map((line) => {
            const [status, ...paths] = line.split('\t')

            return { path: paths.at(-1) ?? '', status }
        })

const main = (argv: string[]): void => {
    const base = argv[0] === '--base' ? argv[1] : undefined
    const failures: string[] = []
    if (base) {
        for (const sha of git('rev-list', '--reverse', `${base}..HEAD`).split('\n').filter(Boolean)) {
            const files = parseNameStatus(git('diff-tree', '--no-commit-id', '--name-status', '-r', '--root', sha))
            const errors = checkChange(files, blob(`${sha}^`, PAGES_FILE), blob(sha, PAGES_FILE))
            failures.push(...errors.map((e) => `${sha.slice(0, 8)}: ${e}`))
        }
    } else {
        const files = parseNameStatus(git('diff', '--cached', '--name-status'))
        // git addresses the index as ':path'.
        failures.push(...checkChange(files, blob('HEAD', PAGES_FILE), blob('', PAGES_FILE)))
    }
    if (failures.length === 0) return

    console.error('\nPersonal adoption pages change one entry per commit, alone:\n')
    for (const f of failures) console.error(`  ${f}`)
    console.error(
        `\nCommit ${PAGES_FILE} on its own (npm run adoptions -- page add|remove does this),` +
            '\nso one revert or removal commit undoes exactly one page (AGENTS.md).\n'
    )
    process.exit(1)
}

if (import.meta.filename === process.argv[1]) main(process.argv.slice(2))
