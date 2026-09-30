/**
 * freshness.ts
 *
 * Informational audit: surfaces blog posts going stale.
 * Exits 1 when stale posts found, 0 when all are fresh.
 *
 * Case A: today − publishDate > 90 days AND no updatedDate
 * Case B: today − updatedDate > 180 days
 *
 * Note: Case A is also enforced as a hard CI error in mdx-deep.ts.
 * This script is for informational auditing and weekly automation.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// eslint-disable-next-line import-x/extensions -- node --experimental-strip-types needs explicit extensions
import { fmField, splitMdx } from './mdx-deep.ts'

export const FRESHNESS_NO_UPDATE_DAYS = 90
export const FRESHNESS_STALE_UPDATE_DAYS = 180

export interface StalePost {
    slug: string
    lang: 'en' | 'fi' | 'sv'
    publishDate: string
    updatedDate: string | null
    reason: 'no-updated-date' | 'updated-date-stale'
    ageDays: number
}

export function checkFreshness(file: string, today: Date): StalePost | null {
    const isBlogPost = /[/\\]content[/\\]posts[/\\]\d+[/\\](fi|sv|en)\.mdx$/.test(file)
    if (!isBlogPost) return null

    const content = readFileSync(file, 'utf8')
    const { frontmatter } = splitMdx(content)
    const meta = JSON.parse(readFileSync(join(dirname(file), 'meta.json'), 'utf8'))
    const publishDateStr: string | null = meta.publishDate ?? null
    const updatedDateStr: string | null = meta.updatedDate ?? null
    const slug = fmField(frontmatter, 'slug') ?? file
    const lang = (fmField(frontmatter, 'lang') ?? 'fi') as 'en' | 'fi' | 'sv'

    if (!publishDateStr) return null

    if (!updatedDateStr) {
        const ageDays = (today.getTime() - new Date(publishDateStr).getTime()) / 86_400_000
        if (ageDays > FRESHNESS_NO_UPDATE_DAYS) {
            return {
                ageDays: Math.floor(ageDays),
                lang,
                publishDate: publishDateStr,
                reason: 'no-updated-date',
                slug,
                updatedDate: null,
            }
        }
        return null
    }

    const updateAgeMs = today.getTime() - new Date(updatedDateStr).getTime()
    const updateAgeDays = updateAgeMs / 86_400_000
    if (updateAgeDays > FRESHNESS_STALE_UPDATE_DAYS) {
        return {
            ageDays: Math.floor(updateAgeDays),
            lang,
            publishDate: publishDateStr,
            reason: 'updated-date-stale',
            slug,
            updatedDate: updatedDateStr,
        }
    }

    return null
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    const today = new Date()
    const files = process.argv.slice(2)
    const stalePosts: StalePost[] = []

    for (const file of files) {
        if (!file.endsWith('.mdx')) continue
        const result = checkFreshness(file, today)
        if (result) stalePosts.push(result)
    }

    if (stalePosts.length === 0) {
        process.stdout.write('No stale posts found.\n')
        process.exit(0)
    }

    process.stdout.write(`Stale posts (${stalePosts.length}):\n\n`)
    for (const post of stalePosts) {
        const updated = post.updatedDate ?? '—'
        const reason =
            post.reason === 'no-updated-date'
                ? `Case A: no updatedDate, ${post.ageDays} days since publishDate`
                : `Case B: updatedDate ${post.ageDays} days ago`
        process.stdout.write(
            `  ${post.slug}  [${post.lang}]  published: ${post.publishDate}  updated: ${updated}  — ${reason}\n`
        )
    }

    process.exit(1)
}
