/**
 * mdx-deep.ts
 *
 * Node-only MDX checks: passage length and content freshness.
 * These two checks require either date arithmetic or multi-paragraph
 * state that is impractical in bash.
 *
 * Checks performed:
 *   - Passage length (no unbroken prose block >150 words)
 *   - Freshness (publishDate ≥90 days ago → updatedDate required)
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FRESHNESS_DAYS = 90
export const PASSAGE_WORD_MAX = 150

// ── pure parsing helpers ──────────────────────────────────────────────────────

/** Split MDX content into frontmatter (inner) string and body string. */
export function splitMdx(content: string): { body: string; frontmatter: string } {
    const lines = content.split('\n')
    let fmEnd = -1
    let dashes = 0
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            dashes++
            if (dashes === 2) {
                fmEnd = i
                break
            }
        }
    }
    if (fmEnd === -1) return { body: content, frontmatter: '' }
    return {
        body: lines.slice(fmEnd + 1).join('\n'),
        frontmatter: lines.slice(1, fmEnd).join('\n'),
    }
}

/** Extract a scalar frontmatter field (single-quoted with YAML's '' escape, double-quoted, or bare). */
export function fmField(frontmatter: string, field: string): string | null {
    const re = new RegExp(`^${field}:\\s*(?:'((?:[^']|'')*)'|"([^"]*)"|([^\\n'""][^\\n]*))`, 'm')
    const m = frontmatter.match(re)
    if (!m) return null
    if (m[1] !== undefined) return m[1].replaceAll("''", "'").trim()
    return (m[2] ?? m[3] ?? '').trim()
}

/** Count words in a plain-text string. */
export function wordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
}

/** Strip MDX/markdown markup, leaving prose text for word-count purposes. */
export function stripMarkup(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/^import\s+.*/gm, '')
        .replace(/^export\s+.*/gm, '')
        .replace(/^<[^>]+>.*$/gm, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^>\s+/gm, '')
}

/** Split body into meaningful prose paragraphs for passage-length checks. */
export function proseParagraphs(body: string): string[] {
    const withoutCode = body.replace(/```[\s\S]*?```/g, '')

    return withoutCode
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => {
            if (!p) return false
            if (/^#{1,6}\s/.test(p)) return false
            if (/^</.test(p)) return false
            if (/^(import|export)\s/.test(p)) return false
            return true
        })
}

// ── core check function ───────────────────────────────────────────────────────

interface CheckFileParams {
    body: string
    isBlogPost: boolean
    publishDate?: string | null
    today: Date
    updatedDate?: string | null
}

/**
 * Run passage-length and freshness checks. Returns error strings (empty = pass).
 *  For blog posts, publishDate/updatedDate live in the post's sibling meta.json
 *  (not this file's own frontmatter) — callers resolve and pass them in directly.
 */
export function checkFile({ body, isBlogPost, publishDate, today, updatedDate }: CheckFileParams): string[] {
    const errors: string[] = []

    // passage length (all pages)
    for (const para of proseParagraphs(body)) {
        const cleaned = stripMarkup(para)
        const wc = wordCount(cleaned)
        if (wc > PASSAGE_WORD_MAX) {
            const preview = cleaned.split(/\s+/).slice(0, 12).join(' ')
            errors.push(
                `prose passage too long: ${wc} words (max ${PASSAGE_WORD_MAX}) — add a heading break. Starts: "${preview}…"`
            )
        }
    }

    if (isBlogPost && publishDate) {
        const ageMs = today.getTime() - new Date(publishDate).getTime()
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        if (ageDays >= FRESHNESS_DAYS && !updatedDate) {
            errors.push(
                `publishDate is ${Math.floor(ageDays)} days ago with no updatedDate — AI engines treat stale content; add updatedDate or refresh the post`
            )
        }
    }

    return errors
}

// ── main (only runs when executed directly) ───────────────────────────────────

function printErrors(rel: string, errors: string[]): void {
    for (const msg of errors) {
        process.stderr.write(`\x1b[31mERROR\x1b[0m [${rel}] ${msg}\n`)
    }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    const today = new Date()
    const files = process.argv.slice(2)
    const repoRoot = new URL('../..', import.meta.url).pathname
    let hasError = false

    for (const file of files) {
        if (!file.endsWith('.mdx')) continue
        const content = readFileSync(file, 'utf8')
        const rel = file.replace(repoRoot, '')
        const { body } = splitMdx(content)
        const isBlogPost = /[/\\]content[/\\]posts[/\\]\d+[/\\](fi|sv|en)\.mdx$/.test(file)

        let publishDate: string | null = null
        let updatedDate: string | null = null
        if (isBlogPost) {
            const meta = JSON.parse(readFileSync(join(dirname(file), 'meta.json'), 'utf8'))
            publishDate = meta.publishDate ?? null
            updatedDate = meta.updatedDate ?? null
        }

        const errors = checkFile({ body, isBlogPost, publishDate, today, updatedDate })
        if (errors.length > 0) {
            hasError = true
            printErrors(rel, errors)
        }
    }

    if (hasError) process.exit(1)
}
