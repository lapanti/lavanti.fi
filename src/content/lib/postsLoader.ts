import type { Loader, LoaderContext, ParseDataOptions } from 'astro/loaders'
import type { Lang } from '../nav'

import { glob } from 'astro/loaders'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

type Localized<T> = T | Partial<Record<Lang, T>>

const LANGS: readonly Lang[] = ['en', 'fi', 'sv']

/**
 * A non-empty object whose keys are all locale codes — i.e. a {fi,sv,en} map rather
 *  than a plain object value. Guards resolveLocalized against mistaking an arbitrary
 *  object for a locale map.
 */
const isLocalizedRecord = (value: object): value is Partial<Record<Lang, unknown>> => {
    const keys = Object.keys(value)

    return keys.length > 0 && keys.every((k) => (LANGS as readonly string[]).includes(k))
}

/**
 * authors[].role is the one shared-field sub-value that legitimately differs per
 *  locale (a co-author's translated job title). meta.json may express it as a plain
 *  string (identical everywhere) or as a {fi,sv,en} object; this resolves it down to
 *  a plain string for one language. externalPublications is a different, orthogonal
 *  concern: entries live in meta.json too (one physical copy, shown on every locale),
 *  but instead of being translated per reader they carry an optional `lang` marking
 *  which language the linked article itself was published in — used only to render a
 *  "(på svenska)"-style suffix when it doesn't match the page being viewed.
 */
function resolveLocalized<T>(value: Localized<T> | undefined, lang: Lang): T | undefined {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'object' && !Array.isArray(value) && isLocalizedRecord(value)) {
        return (value as Partial<Record<Lang, T>>)[lang]
    }
    return value as T
}

interface RawAuthorEntry {
    name: string
    role?: Localized<string>
    sameAs?: string[]
    url?: string
}

function resolveMeta(meta: Record<string, unknown>, lang: Lang): Record<string, unknown> {
    const authors = meta.authors as Array<'lauri' | RawAuthorEntry> | undefined

    return {
        ...meta,
        authors: authors?.map((author) =>
            typeof author === 'string' ? author : { ...author, role: resolveLocalized(author.role, lang) }
        ),
    }
}

export interface LocalizedCollectionOptions {
    /** Directory holding `{id}/{meta.json, fi.mdx, sv.mdx, en.mdx}` — relative to the project root. */
    base: string
    /** Loader name; must be unique per collection (used by `--loaders` selective sync and the log prefix). */
    name: string
}

/**
 * Wraps the built-in glob() loader instead of reimplementing MDX parsing/rendering:
 * intercepts parseData to merge each entry's sibling meta.json (shared fields) into
 * its per-language frontmatter before schema validation, so file walking, frontmatter
 * parsing, and deferred MDX rendering all stay exactly as glob() already does them.
 *
 * Shared by every collection laid out as `{base}/{id}/{fi,sv,en}.mdx` + `meta.json`
 * (posts, newsletters).
 */
export function localizedCollectionLoader({ base, name }: LocalizedCollectionOptions): Loader {
    const inner = glob({ base, pattern: '*/{fi,sv,en}.mdx' })

    return {
        load: async (context: LoaderContext) => {
            const originalParseData = context.parseData.bind(context)

            context.parseData = async <TData extends Record<string, unknown>>(options: ParseDataOptions<TData>) => {
                const { filePath, data } = options
                if (!filePath) return originalParseData(options)

                /*
                 * Re-read per file (3 tiny reads per entry) rather than caching: keeps the
                 * loader stateless so an `astro dev` edit to meta.json is never served stale.
                 */
                const meta: Record<string, unknown> = JSON.parse(
                    readFileSync(join(dirname(filePath), 'meta.json'), 'utf-8')
                )

                const lang = (data as { lang?: Lang }).lang
                if (!lang) throw new Error(`Entry at ${filePath} is missing required "lang" frontmatter`)

                return originalParseData({ ...options, data: { ...resolveMeta(meta, lang), ...data } as TData })
            }

            await inner.load(context)
        },
        name,
    }
}
