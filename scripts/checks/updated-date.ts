/**
 * updated-date.ts
 *
 * Guards the `updatedDate` freshness signal: when a page's or post's content
 * changes, `updatedDate` must change with it. Search engines read the field as
 * schema.org `dateModified` and as the sitemap `lastmod`, so a stale value
 * misreports when the content was last revised.
 *
 * Runs from the commit-msg hook rather than pre-commit, because the opt-out
 * marker lives in the commit message and pre-commit runs before the message
 * exists. CI re-runs it across the whole PR as a backstop.
 *
 * A date already set to today counts as bumped, so a second edit on the same day
 * is fine — the field records the day of the revision, not a counter.
 *
 * Opt out for genuinely non-semantic edits (typography, a link swap) by putting
 * [skip-updated-date] in the commit message.
 *
 * Two shapes carry the field:
 *   - pages: `updatedDate` in the frontmatter of src/pages/<...>.mdx
 *   - collection entries (posts, newsletters): `updatedDate` in
 *     src/content/<collection>/<id>/meta.json, shared by the fi/sv/en siblings —
 *     so the entry, not the file, is the unit checked.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const SKIP_MARKER = '[skip-updated-date]'

const ENTRY_FILE = /^src[/\\]content[/\\](posts|newsletters)[/\\](\d+)[/\\](?:fi|sv|en)\.mdx$/
const ENTRY_META = /^src[/\\]content[/\\](posts|newsletters)[/\\](\d+)[/\\]meta\.json$/
const PAGE_FILE = /^src[/\\]pages[/\\].+\.mdx$/

export interface Offender {
    /** Where the reader-facing content lives: a page path or a post directory. */
    unit: string
    /** Where updatedDate must be bumped. */
    field: string
}

/** A unit is one page file, or one collection entry directory shared by its three locales. */
export function unitOf(file: string): { unit: string; field: string } | null {
    const normalised = file.replace(/\\/g, '/')
    const entry = ENTRY_FILE.exec(normalised) ?? ENTRY_META.exec(normalised)
    if (entry) {
        const dir = `src/content/${entry[1]}/${entry[2]}`

        return { field: `${dir}/meta.json`, unit: dir }
    }
    if (PAGE_FILE.test(normalised)) {
        return { field: normalised, unit: normalised }
    }
    return null
}

/** Frontmatter/JSON text with the updatedDate value blanked, so a bump alone reads as "unchanged". */
export function withoutUpdatedDate(path: string, content: string): string {
    if (path.endsWith('.json')) {
        try {
            const parsed = JSON.parse(content) as Record<string, unknown>
            delete parsed.updatedDate
            return JSON.stringify(parsed, Object.keys(parsed).sort())
        } catch {
            // Malformed JSON is the schema check's problem, not ours — compare raw.
            return content
        }
    }
    return content.replace(/^updatedDate:.*$/gm, 'updatedDate: <ignored>')
}

/** Value of updatedDate, from either shape. Null when absent or unreadable. */
export function readUpdatedDate(path: string, content: string | null): string | null {
    if (content === null) return null
    if (path.endsWith('.json')) {
        try {
            const parsed = JSON.parse(content) as { updatedDate?: string }

            return parsed.updatedDate ?? null
        } catch {
            return null
        }
    }
    return /^updatedDate:\s*'?"?([\d-]+)'?"?\s*$/m.exec(content)?.[1] ?? null
}

function git(args: string[], cwd?: string, quiet = false): string {
    return execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        // A missing blob is an expected answer here, not an error worth printing.
        stdio: quiet ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'inherit'],
    })
}

/** File content at a revision, or null when the path does not exist there. */
export function readBlob(rev: string, path: string, cwd?: string): string | null {
    try {
        return git(['show', `${rev}:${path}`], cwd, true)
    } catch {
        return null
    }
}

/** Today in the site's date format, in local time — the same clock an author reads. */
export function today(now = new Date()): string {
    const pad = (n: number): string => String(n).padStart(2, '0')

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export interface Revisions {
    /** Revision holding the proposed content: '' for the staged index, or a commit. */
    to: string
    /** Revision to compare against: 'HEAD', or a merge base. */
    from: string
    /** Paths that changed between them. */
    files: string[]
    /** Repository root to run git in. Defaults to the current directory. */
    cwd?: string
    /** Date that counts as already-bumped. Defaults to today. */
    now?: string
}

/** Units whose content changed without a matching updatedDate bump. */
export function findOffenders({ cwd, files, from, now = today(), to }: Revisions): Offender[] {
    const units = new Map<string, { field: string; files: string[] }>()
    for (const file of files) {
        const resolved = unitOf(file)
        if (!resolved) continue
        const entry = units.get(resolved.unit) ?? { field: resolved.field, files: [] }
        entry.files.push(file)
        units.set(resolved.unit, entry)
    }

    const offenders: Offender[] = []
    for (const [unit, { field, files: unitFiles }] of units) {
        const contentChanged = unitFiles.some((file) => {
            const before = readBlob(from, file, cwd)
            // A newly added page or post sets its dates at creation — nothing to bump.
            if (before === null) return false
            const after = readBlob(to, file, cwd)
            if (after === null) return false
            return withoutUpdatedDate(file, before) !== withoutUpdatedDate(file, after)
        })
        if (!contentChanged) continue

        const before = readUpdatedDate(field, readBlob(from, field, cwd))
        const after = readUpdatedDate(field, readBlob(to, field, cwd))
        if (before === null) continue
        // Already dated today is as good as bumped: the page was revised today.
        if (after === now) continue
        // Unchanged, or moved backwards — neither describes a fresh revision.
        if (after === null || after <= before) offenders.push({ field, unit })
    }
    return offenders
}

function usage(): never {
    console.error('usage: updated-date.ts [--message <file>] [--base <ref>]')
    process.exit(2)
}

function main(argv: string[]): void {
    let messageFile: string | null = null
    let base: string | null = null
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--message') messageFile = argv[++i] ?? usage()
        else if (argv[i] === '--base') base = argv[++i] ?? usage()
        else usage()
    }

    /*
     * Range mode compares a whole branch; staged mode compares the pending commit.
     * git addresses the index as ':path', so the staged revision prefix is empty.
     */
    const to = base ? 'HEAD' : ''
    const from = base ?? 'HEAD'
    const diffArgs = base
        ? ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]
        : ['diff', '--cached', '--name-only', '--diff-filter=ACMR']

    const messages = base
        ? git(['log', '--format=%B', `${base}..HEAD`])
        : messageFile
          ? readFileSync(messageFile, 'utf8')
          : ''
    if (messages.includes(SKIP_MARKER)) return

    const files = git(diffArgs).split('\n').filter(Boolean)
    const offenders = findOffenders({ files, from, to })
    if (offenders.length === 0) return

    console.error('\nupdatedDate not bumped for changed content:\n')
    for (const { unit, field } of offenders) {
        console.error(`  ${unit}`)
        console.error(`    bump updatedDate in ${field}`)
    }
    console.error(
        `\nupdatedDate feeds schema.org dateModified and the sitemap lastmod, so it must` +
            `\ntrack real revisions. Set it to ${today()}, or add ${SKIP_MARKER} to the commit` +
            `\nmessage when the edit changes nothing a reader or a crawler would notice.\n`
    )
    process.exit(1)
}

if (import.meta.filename === process.argv[1]) main(process.argv.slice(2))
