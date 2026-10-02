import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { helsinkiDateOf, isPublishedBy } from '../lib/publishing'
import { getTagName, tags } from './tags'

const POSTS_DIR = join(import.meta.dirname, 'posts')
const FEATURED_MAX = 3

const LOCALES = ['en', 'fi', 'sv'] as const
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/
// pageTitle with suffix '| Lauri Lavanti' (15 chars) must fit 50–60 chars total
const PAGE_TITLE_MIN = 34
const PAGE_TITLE_MAX = 44
// metaDescription is used directly as <meta name="description"> content
const META_DESCRIPTION_MAX = 160

describe('tags data', () => {
    it('should export a non-empty array', () => {
        expect(tags.length).toBeGreaterThan(0)
    })

    it('should have unique ids', () => {
        const ids = tags.map((t) => t.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it.each(tags)('$id — id is kebab-case', ({ id }) => {
        expect(id).toMatch(KEBAB_CASE)
    })

    it.each(tags)('$id — names present in all locales', ({ id, names }) => {
        for (const locale of LOCALES) {
            expect(names[locale], `${id} names.${locale}`).toBeTruthy()
        }
    })

    it.each(tags)('$id — pageTitle present in all locales', ({ id, pageTitle }) => {
        for (const locale of LOCALES) {
            expect(pageTitle[locale], `${id} pageTitle.${locale}`).toBeTruthy()
        }
    })

    it.each(tags)('$id — pageTitle raw length within 34–44 chars per locale', ({ id, pageTitle }) => {
        for (const locale of LOCALES) {
            // Strip soft hyphens (U+00AD) — they are invisible and don't count toward displayed length
            const raw = pageTitle[locale].replace(/­/g, '')
            expect(raw.length, `${id} pageTitle.${locale} length ${raw.length}`).toBeGreaterThanOrEqual(PAGE_TITLE_MIN)
            expect(raw.length, `${id} pageTitle.${locale} length ${raw.length}`).toBeLessThanOrEqual(PAGE_TITLE_MAX)
        }
    })

    it.each(tags)('$id — metaDescription present in all locales', ({ id, metaDescription }) => {
        for (const locale of LOCALES) {
            expect(metaDescription[locale], `${id} metaDescription.${locale}`).toBeTruthy()
        }
    })

    it.each(tags)('$id — metaDescription ≤ 160 chars per locale', ({ id, metaDescription }) => {
        for (const locale of LOCALES) {
            expect(
                metaDescription[locale].length,
                `${id} metaDescription.${locale} is ${metaDescription[locale].length} chars (max ${META_DESCRIPTION_MAX})`
            ).toBeLessThanOrEqual(META_DESCRIPTION_MAX)
        }
    })

    it.each(tags)('$id — descriptions present in all locales', ({ id, descriptions }) => {
        for (const locale of LOCALES) {
            expect(descriptions[locale].length, `${id} descriptions.${locale} array is empty`).toBeGreaterThan(0)
            expect(descriptions[locale][0], `${id} descriptions.${locale}[0]`).toBeTruthy()
        }
    })

    it.each(tags.filter((t) => t.faq))(
        '$id — faq has 2+ unique, non-empty entries per present locale',
        ({ faq, id }) => {
            for (const locale of LOCALES) {
                const items = faq![locale]
                if (!items) continue
                expect(items.length, `${id} faq.${locale} needs 2+ entries to render`).toBeGreaterThanOrEqual(2)
                for (const { a, q } of items) {
                    expect(q.trim(), `${id} faq.${locale} question`).toBeTruthy()
                    expect(a.trim(), `${id} faq.${locale} answer to "${q}"`).toBeTruthy()
                }
                expect(new Set(items.map((i) => i.q)).size, `${id} faq.${locale} duplicate question`).toBe(items.length)
            }
        }
    )

    it.each(tags.filter((t) => t.featured))(
        '$id — featured: up to 3 unique published posts that carry the tag in every locale',
        ({ featured, id }) => {
            const today = helsinkiDateOf(new Date())
            expect(featured!.length, `${id} featured`).toBeGreaterThan(0)
            expect(featured!.length, `${id} featured`).toBeLessThanOrEqual(FEATURED_MAX)
            expect(new Set(featured).size, `${id} featured has duplicates`).toBe(featured!.length)
            for (const postId of featured!) {
                const dir = join(POSTS_DIR, String(postId))
                expect(existsSync(join(dir, 'meta.json')), `${id} featured post ${postId} does not exist`).toBe(true)
                const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) as {
                    publishDate: string
                    tags: string[]
                }
                expect(meta.tags, `${id} featured post ${postId} lacks the tag`).toContain(id)
                expect(isPublishedBy(meta.publishDate, today), `${id} featured post ${postId} is scheduled`).toBe(true)
                for (const locale of LOCALES) {
                    expect(
                        existsSync(join(dir, `${locale}.mdx`)),
                        `${id} featured post ${postId} lacks ${locale}`
                    ).toBe(true)
                }
            }
        }
    )

    it.each(tags.filter((t) => t.heroImage))(
        '$id — heroImage requires heroImageAlt in all locales',
        ({ id, heroImageAlt }) => {
            expect(heroImageAlt, `${id} heroImageAlt must be set when heroImage is set`).toBeDefined()
            for (const locale of LOCALES) {
                expect(heroImageAlt![locale], `${id} heroImageAlt.${locale}`).toBeTruthy()
            }
        }
    )
})

describe('getTagName', () => {
    it('returns fi name for known id (default locale)', () => {
        expect(getTagName('kirkkonummi')).toBe('Kirkkonummi')
    })

    it('returns en name for known id with locale argument', () => {
        expect(getTagName('kirkkonummi', 'en')).toBe('Kirkkonummi')
    })

    it('returns sv name for known id with sv locale', () => {
        expect(getTagName('digital-independence', 'sv')).toBe('Digital själv­ständighet')
    })

    it('returns undefined for unknown id', () => {
        expect(getTagName('non-existent-tag')).toBeUndefined()
    })
})
