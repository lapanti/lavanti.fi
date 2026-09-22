import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/* eslint-disable import-x/extensions -- imported by scripts/checks/publish-due.ts under node --experimental-strip-types, which needs the explicit extension */
import { newsletterPath } from './newsletterRoutes.ts'
/* eslint-enable import-x/extensions */

const UPDATED_DATE = /^updatedDate:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?/m
const SLUG = /^slug:\s*['"]?([^'"\n]+)['"]?/m
const LANGS = ['fi', 'sv', 'en'] as const

export const extractUpdatedDate = (mdxContent: string): string | undefined => UPDATED_DATE.exec(mdxContent)?.[1]

export const extractSlug = (mdxContent: string): string | undefined => SLUG.exec(mdxContent)?.[1]

const walkMdx = (dir: string): string[] => {
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        const stat = statSync(full)
        if (stat.isDirectory()) {
            out.push(...walkMdx(full))
        } else if (entry.endsWith('.mdx')) {
            out.push(full)
        }
    }
    return out
}

const mdxPathToUrl = (pagesDir: string, mdxPath: string): string => {
    const rel = mdxPath.slice(pagesDir.length).replace(/\\/g, '/')

    return rel.replace(/\/index\.mdx$/, '/')
}

const CATEGORY_SEGMENTS = { en: 'category', fi: 'kategoria', sv: 'kategori' } as const

interface TagWithDate {
    id: string
    slugs: { en: string; fi: string; sv: string }
    updatedDate: string
}

type Lang = (typeof LANGS)[number]

interface BuildPageDateMapInput {
    /** src/content/newsletters — optional so the map builds before the first issue lands. */
    newslettersDir?: string
    pagesDir: string
    postsDir?: string
    tags: readonly TagWithDate[]
}

const postPath = (lang: Lang, id: string, slug: string): string => `/${lang}/blog/${id}/${slug}/`

/**
 * Collection entries (posts, newsletters) live under dir/{id}/{meta.json, fi.mdx,
 *  sv.mdx, en.mdx} — updatedDate is in the shared meta.json (not any .mdx file, so
 *  walkMdx/extractUpdatedDate can't see it), and the URL needs each language file's
 *  own slug, not derivable from the path; `urlFor` supplies the collection's URL shape.
 *
 * Future-dated (scheduled/embargoed) entries are deliberately not filtered here: this
 *  map is a lookup consulted only for pages present in the built sitemap, and unbuilt
 *  entries never appear there — their entries are unreachable keys. Filtering would
 *  duplicate the build clock at config-eval time for no correctness gain.
 */
const buildEntryDateEntries = (
    collectionDir: string,
    urlFor: (lang: Lang, id: string, slug: string) => string
): Array<[string, string]> => {
    const entries: Array<[string, string]> = []
    const missing: string[] = []

    for (const idDir of readdirSync(collectionDir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
        const dir = join(collectionDir, idDir.name)
        const metaPath = join(dir, 'meta.json')
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
        const updatedDate: string | undefined = meta.updatedDate
        if (!updatedDate) {
            missing.push(metaPath)
            continue
        }
        for (const lang of LANGS) {
            const langPath = join(dir, `${lang}.mdx`)
            if (!existsSync(langPath)) continue
            const slug = extractSlug(readFileSync(langPath, 'utf-8'))
            if (!slug) {
                missing.push(langPath)
                continue
            }
            entries.push([urlFor(lang, idDir.name, slug), updatedDate])
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `sitemapLastmod: missing required updatedDate/slug in:\n${missing.map((p) => `  - ${p}`).join('\n')}`
        )
    }

    return entries
}

export const buildPageDateMap = ({
    newslettersDir,
    pagesDir,
    postsDir,
    tags,
}: BuildPageDateMapInput): Map<string, string> => {
    const map = new Map<string, string>()
    const missing: string[] = []

    for (const mdxPath of walkMdx(pagesDir)) {
        const content = readFileSync(mdxPath, 'utf-8')
        const date = extractUpdatedDate(content)
        if (!date) {
            missing.push(mdxPath)
            continue
        }
        map.set(mdxPathToUrl(pagesDir, mdxPath), date)
    }

    if (missing.length > 0) {
        throw new Error(
            `sitemapLastmod: missing required updatedDate frontmatter in:\n${missing.map((p) => `  - ${p}`).join('\n')}`
        )
    }

    if (postsDir) {
        for (const [url, date] of buildEntryDateEntries(postsDir, postPath)) {
            map.set(url, date)
        }
    }

    if (newslettersDir && existsSync(newslettersDir)) {
        for (const [url, date] of buildEntryDateEntries(newslettersDir, newsletterPath)) {
            map.set(url, date)
        }
    }

    for (const lang of LANGS) {
        for (const tag of tags) {
            map.set(`/${lang}/${CATEGORY_SEGMENTS[lang]}/${tag.slugs[lang]}/`, tag.updatedDate)
        }
    }

    return map
}
