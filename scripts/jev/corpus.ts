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
const CONTENT_FILES = ['fi.mdx', 'sv.mdx', 'en.mdx'] as const
const HASHED_FILES = ['meta.json', ...CONTENT_FILES] as const
const CONTENT_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..', 'src', 'content')

export type Lang = (typeof LANGS)[number]
export type DocKind = 'newsletter' | 'post'
export type DocKey = `${DocKind}:${number}`

export interface Document {
    /** The MDX body after the frontmatter, unmodified. */
    body: string
    /** sha256 over the three locale files only, hex; unchanged by a meta.json edit. */
    contentHash: string
    description: string
    /** The q of every frontmatter faq entry, in order; [] when the locale has none. */
    faq: string[]
    h2s: string[]
    h3s: string[]
    id: number
    key: DocKey
    kind: DocKind
    lang: Lang
    /** First prose paragraphs, whole, while the total stays ≤ LEAD_WORD_MAX words; markup stripped. */
    lead: string
    /** All prose paragraphs with markup kept — the link eval reads the hrefs. */
    paragraphs: string[]
    publishDate: string
    /** Per-locale frontmatter slug; '' when the frontmatter has none. */
    slug: string
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

const hashFiles = (dir: string, names: readonly string[]): string => {
    const hash = createHash('sha256')
    for (const name of names) {
        const path = join(dir, name)
        hash.update(name)
        hash.update(existsSync(path) ? readFileSync(path) : '')
    }

    return hash.digest('hex')
}

/** sha256 over meta.json and the three locale files; a missing file hashes as empty so the digest stays stable. */
export const hashDir = (dir: string): string => hashFiles(dir, HASHED_FILES)

/** sha256 over the three locale files only, so a meta.json-only change (an updatedDate bump) leaves it alone. */
export const hashContent = (dir: string): string => hashFiles(dir, CONTENT_FILES)

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

export function headingsOf(body: string, level: 2 | 3 = 2): string[] {
    const marker = '#'.repeat(level)

    return body
        .split('\n')
        .filter((line) => line.startsWith(`${marker} `))
        .map((line) => line.slice(marker.length).trim())
}

/**
 * The q of every `- q:` entry inside the frontmatter `faq:` block (up to the
 * next top-level key), at any indent, single- or double-quoted or bare, with
 * YAML's doubled single quote unescaped — the same quote grammar as fmField.
 */
export function faqQuestionsOf(frontmatter: string): string[] {
    const lines = frontmatter.split('\n')
    const start = lines.findIndex((line) => /^faq:\s*$/.test(line))
    if (start === -1) return []
    const out: string[] = []
    for (const line of lines.slice(start + 1)) {
        if (/^\S/.test(line)) break
        const m = /^\s*-\s*q:\s*(?:'((?:[^']|'')*)'|"([^"]*)"|(\S[^\n]*?))\s*$/.exec(line)
        if (!m) continue
        out.push((m[1] !== undefined ? m[1].replaceAll("''", "'") : (m[2] ?? m[3] ?? '')).trim())
    }

    return out
}

function buildDocument(kind: DocKind, id: number, dir: string, lang: Lang): Document {
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) as Meta
    const { body, frontmatter } = splitMdx(readFileSync(join(dir, `${lang}.mdx`), 'utf8'))
    const paragraphs = proseParagraphs(body)

    return {
        body,
        contentHash: hashContent(dir),
        description: fmField(frontmatter, 'description') ?? '',
        faq: faqQuestionsOf(frontmatter),
        h2s: headingsOf(body),
        h3s: headingsOf(body, 3),
        id,
        key: `${kind}:${id}`,
        kind,
        lang,
        lead: leadOf(paragraphs),
        paragraphs,
        publishDate: meta.publishDate,
        slug: fmField(frontmatter, 'slug') ?? '',
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

/**
 * The state for decisions that need the text itself (does the article answer
 * this question?): title, description, every heading and the prose with
 * markup stripped. Posts are 300–800 words, well inside the context limit.
 */
export function bodyStateFor(doc: Document): Record<string, string> {
    return {
        body: doc.paragraphs.map((p) => stripMarkup(p).trim()).join('\n\n'),
        description: doc.description,
        headings: [...doc.h2s, ...doc.h3s].join('\n'),
        title: doc.title,
    }
}

/** Option label for a choice question. Pass a Document from the English corpus. */
export function labelFor(doc: Document): string {
    return doc.description ? `${doc.title} — ${doc.description}` : doc.title
}
