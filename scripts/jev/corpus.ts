/**
 * corpus.ts
 *
 * Turns every post and newsletter on disk into one locale-invariant Document
 * for Jev questions: title, description, headings, a bounded lead and the prose
 * paragraphs, plus a content hash over meta.json and all three locale files.
 *
 * Reads the content directories directly — src/lib/posts.ts needs Astro's
 * content layer, which a plain Node process does not have.
 *
 * Spec: .agents/specs/jev/spec.md
 */

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { fmField, proseParagraphs, splitMdx, stripMarkup, wordCount } from '../checks/mdx-deep.ts'
/* eslint-enable import-x/extensions */

export const LEAD_WORD_MAX = 300
export const LANGS = ['en', 'fi', 'sv'] as const
const HASHED_FILES = ['meta.json', 'fi.mdx', 'sv.mdx', 'en.mdx'] as const
const CONTENT_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', 'src', 'content')

export type Lang = (typeof LANGS)[number]
export type DocKind = 'newsletter' | 'post'
export type DocKey = `${DocKind}:${number}`

export interface Document {
    description: string
    h2s: string[]
    id: number
    key: DocKey
    kind: DocKind
    lang: Lang
    /** First prose paragraphs, whole, while the total stays ≤ LEAD_WORD_MAX words; markup stripped. */
    lead: string
    /** All prose paragraphs with markup kept — the link eval reads the hrefs. */
    paragraphs: string[]
    publishDate: string
    /** sha256 over meta.json and the three locale files, hex. */
    sourceHash: string
    tags: string[]
    title: string
}

interface Meta {
    publishDate: string
    tags?: string[]
}

const DIRS: Record<DocKind, string> = { newsletter: 'newsletters', post: 'posts' }

/** sha256 over the fixed file list; a missing file hashes as empty so the digest stays stable. */
export function hashDir(dir: string): string {
    const hash = createHash('sha256')
    for (const name of HASHED_FILES) {
        const path = join(dir, name)
        hash.update(name)
        hash.update(existsSync(path) ? readFileSync(path) : '')
    }

    return hash.digest('hex')
}

/** Whole paragraphs in order while the cumulative word count stays within the bound; always at least the first. */
export function leadOf(paragraphs: string[]): string {
    const out: string[] = []
    let words = 0
    for (const p of paragraphs) {
        const text = stripMarkup(p).trim()
        const n = wordCount(text)
        if (out.length > 0 && words + n > LEAD_WORD_MAX) break
        out.push(text)
        words += n
    }

    return out.join('\n\n')
}

export function headingsOf(body: string): string[] {
    return body
        .split('\n')
        .filter((line) => /^##\s/.test(line))
        .map((line) => line.replace(/^##\s+/, '').trim())
}

function buildDocument(kind: DocKind, id: number, dir: string, lang: Lang): Document {
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) as Meta
    const { body, frontmatter } = splitMdx(readFileSync(join(dir, `${lang}.mdx`), 'utf8'))
    const paragraphs = proseParagraphs(body)

    return {
        description: fmField(frontmatter, 'description') ?? '',
        h2s: headingsOf(body),
        id,
        key: `${kind}:${id}`,
        kind,
        lang,
        lead: leadOf(paragraphs),
        paragraphs,
        publishDate: meta.publishDate,
        sourceHash: hashDir(dir),
        tags: meta.tags ?? [],
        title: fmField(frontmatter, 'title') ?? '',
    }
}

/** One Document per numeric directory under posts/ and newsletters/, ordered by kind then id. Future-dated entries included. */
export function buildCorpus(opts: { lang?: Lang; root?: string } = {}): Document[] {
    const lang = opts.lang ?? 'en'
    const root = opts.root ?? CONTENT_ROOT
    const docs: Document[] = []
    for (const kind of Object.keys(DIRS) as DocKind[]) {
        const dir = join(root, DIRS[kind])
        if (!existsSync(dir)) continue
        const ids = readdirSync(dir)
            .filter((name) => /^\d+$/.test(name))
            .map(Number)
            .sort((a, b) => a - b)
        for (const id of ids) docs.push(buildDocument(kind, id, join(dir, String(id)), lang))
    }

    return docs
}

/** The document-level state sent to Jev: only the fields a question needs, never the whole body. */
export function stateFor(doc: Document): Record<string, string> {
    return { description: doc.description, headings: doc.h2s.join('\n'), lead: doc.lead, title: doc.title }
}

/** Option label for a choice question. Pass a Document from the English corpus. */
export function labelFor(doc: Document): string {
    return doc.description ? `${doc.title} — ${doc.description}` : doc.title
}
