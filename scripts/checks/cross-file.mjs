/**
 * cross-file.mjs
 *
 * Cross-file content integrity checks. Runs against the full src/pages/,
 * src/content/posts/ and src/content/newsletters/ trees (no path arguments) on
 * every MDX commit.
 *
 * Checks:
 *   - Translation triplet completeness (every entry id has meta.json + fi/sv/en.mdx)
 *   - Slug uniqueness per locale within a collection (two entries sharing a slug
 *     would collide at the URL) — and across locales, because the glob loader keys
 *     every entry on its slug alone, so fi/x and sv/x would overwrite each other
 *   - pageTitle uniqueness per locale (duplicate <title> tags hurt SEO)
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const pagesRoot = join(__dirname, '..', '..', 'src', 'pages')
const postsRoot = join(__dirname, '..', '..', 'src', 'content', 'posts')
const newslettersRoot = join(__dirname, '..', '..', 'src', 'content', 'newsletters')
const LANGS = ['fi', 'sv', 'en']

let hasError = false

function err(msg) {
    process.stderr.write(`\x1b[31mERROR\x1b[0m [cross-file] ${msg}\n`)
    hasError = true
}

/** Extract a scalar frontmatter field. */
function fmField(content, field) {
    const re = new RegExp(`^${field}:\\s*(?:'([^']*)'|"([^"]*)"|([^\\n'""][^\\n]*))`, 'm')
    const m = content.match(re)
    if (!m) return null
    return (m[1] ?? m[2] ?? m[3] ?? '').trim()
}

// ── translation triplet + slug-uniqueness check ───────────────────────────────

/** Numeric entry directories of a collection root, ascending. */
function collectEntryIds(root) {
    return readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
        .map((e) => e.name)
        .sort((a, b) => Number(a) - Number(b))
}

/**
 * Check one collection: every id has its four files, and no slug repeats within a
 * locale or across locales (the glob loader ids entries by slug alone).
 */
function checkCollection(label, root) {
    const ids = collectEntryIds(root)
    const slugsByLang = {}
    for (const lang of LANGS) slugsByLang[lang] = new Map()
    const slugsAll = new Map()

    for (const id of ids) {
        const dir = join(root, id)
        const files = new Set(readdirSync(dir))
        const missing = ['meta.json', ...LANGS.map((l) => `${l}.mdx`)].filter((f) => !files.has(f))
        if (missing.length > 0) {
            err(`${label} id ${id} is missing: ${missing.join(', ')}`)
            continue
        }

        for (const lang of LANGS) {
            const content = readFileSync(join(dir, `${lang}.mdx`), 'utf8')
            const slug = fmField(content, 'slug')
            if (!slug) continue
            const map = slugsByLang[lang]
            if (!map.has(slug)) map.set(slug, [])
            map.get(slug).push(id)
            if (!slugsAll.has(slug)) slugsAll.set(slug, [])
            slugsAll.get(slug).push(`${lang}/${id}`)
        }
    }

    for (const lang of LANGS) {
        for (const [slug, dup] of slugsByLang[lang]) {
            if (dup.length > 1) {
                err(`duplicate slug "${slug}" in ${lang} locale, used by ${label} ids: ${dup.join(', ')}`)
            }
        }
    }
    for (const [slug, dup] of slugsAll) {
        if (dup.length > 1) {
            err(
                `${label} slug "${slug}" is reused across locales (${dup.join(', ')}) — the loader keys entries by slug`
            )
        }
    }

    return ids.length
}

const postCount = checkCollection('post', postsRoot)
const newsletterCount = checkCollection('newsletter', newslettersRoot)

// ── title uniqueness check ────────────────────────────────────────────────────

/** Recursively collect all index.mdx files under dir. */
function collectMdx(dir) {
    const result = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) result.push(...collectMdx(full))
        else if (entry.name === 'index.mdx') result.push(full)
    }
    return result
}

/** Recursively collect all {lang}.mdx post files under dir. */
function collectPostMdx(dir) {
    const result = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) result.push(...collectPostMdx(full))
        else if (/^(fi|sv|en)\.mdx$/.test(entry.name)) result.push(full)
    }
    return result
}

// Map: lang → Map<title, filepath[]>
const titlesByLang = {}
for (const lang of LANGS) titlesByLang[lang] = new Map()

for (const file of [...collectMdx(pagesRoot), ...collectPostMdx(postsRoot), ...collectPostMdx(newslettersRoot)]) {
    const content = readFileSync(file, 'utf8')
    const lang = fmField(content, 'lang')
    const title = fmField(content, 'pageTitle')
    if (!lang || !title) continue
    if (!titlesByLang[lang]) continue
    const map = titlesByLang[lang]
    if (!map.has(title)) map.set(title, [])
    map.get(title).push(file.replace(join(__dirname, '..', '..') + '/', ''))
}

for (const lang of LANGS) {
    for (const [title, files] of titlesByLang[lang]) {
        if (files.length > 1) {
            err(`duplicate title in ${lang} locale: "${title}"\n  ${files.join('\n  ')}`)
        }
    }
}

if (!hasError) {
    const pages = LANGS.flatMap((l) => [...titlesByLang[l].values()]).flat().length
    console.log(
        `OK: ${postCount} post and ${newsletterCount} newsletter IDs complete in fi/sv/en; no duplicate slugs or titles across ${pages} pages`
    )
}

process.exit(hasError ? 1 : 0)
