import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { tags } from '../content/tags'
import { buildPageDateMap, extractUpdatedDate } from './sitemapLastmod'

const PAGES_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'pages')
const POSTS_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'content', 'posts')
const NEWSLETTERS_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'content', 'newsletters')

describe('extractUpdatedDate', () => {
    it('returns updatedDate when present', () => {
        const content = `---\npublishDate: '2024-01-01'\nupdatedDate: '2024-06-15'\n---`
        expect(extractUpdatedDate(content)).toBe('2024-06-15')
    })

    it('returns undefined when updatedDate absent', () => {
        const content = `---\npublishDate: '2024-01-01'\n---`
        expect(extractUpdatedDate(content)).toBeUndefined()
    })

    it('handles dates without quotes', () => {
        const content = `---\nupdatedDate: 2024-03-20\n---`
        expect(extractUpdatedDate(content)).toBe('2024-03-20')
    })
})

describe('buildPageDateMap', () => {
    const map = buildPageDateMap({ newslettersDir: NEWSLETTERS_DIR, pagesDir: PAGES_DIR, postsDir: POSTS_DIR, tags })

    it('maps a sample of known MDX pages, posts and newsletter issues', () => {
        expect(map.get('/fi/laurista/')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(map.get('/en/blog/1/home-care-allowance-supplement/')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(map.get('/sv/nyhetsbrev/')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(map.get('/fi/uutiskirje/1/tekoaly-ei-vie-tyotasi-mutta-muuttaa-sen/')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('tolerates a missing newsletters directory', () => {
        const withoutNewsletters = buildPageDateMap({
            newslettersDir: join(NEWSLETTERS_DIR, 'does-not-exist'),
            pagesDir: PAGES_DIR,
            tags: [],
        })
        expect([...withoutNewsletters.keys()].some((k) => k.startsWith('/fi/uutiskirje/1/'))).toBe(false)
    })

    it('every map value is a YYYY-MM-DD date', () => {
        for (const value of map.values()) {
            expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
    })

    it('maps every tag under all three localised category URLs', () => {
        const segments = { en: 'category', fi: 'kategoria', sv: 'kategori' }
        for (const tag of tags) {
            for (const lang of ['fi', 'sv', 'en'] as const) {
                const url = `/${lang}/${segments[lang]}/${tag.slugs[lang]}/`
                expect(map.get(url)).toBe(tag.updatedDate)
            }
        }
    })

    it('throws when an MDX page lacks updatedDate', () => {
        const tmp = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-'))
        try {
            const nested = join(tmp, 'fi', 'broken')
            mkdirSync(nested, { recursive: true })
            writeFileSync(join(nested, 'index.mdx'), `---\ntitle: 'No date'\n---\n`)
            expect(() => buildPageDateMap({ pagesDir: tmp, tags: [] })).toThrow(/missing required updatedDate/)
        } finally {
            rmSync(tmp, { force: true, recursive: true })
        }
    })

    it('emits one URL per present language file for a post', () => {
        const pagesDir = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-pages-'))
        const postsDir = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-posts-'))
        try {
            const postDir = join(postsDir, '99')
            mkdirSync(postDir, { recursive: true })
            writeFileSync(join(postDir, 'meta.json'), JSON.stringify({ updatedDate: '2026-01-05' }))
            writeFileSync(join(postDir, 'fi.mdx'), `---\nslug: 'esimerkki'\n---\n`)
            writeFileSync(join(postDir, 'en.mdx'), `---\nslug: 'example'\n---\n`)

            const map = buildPageDateMap({ pagesDir, postsDir, tags: [] })

            expect(map.get('/fi/blog/99/esimerkki/')).toBe('2026-01-05')
            expect(map.get('/en/blog/99/example/')).toBe('2026-01-05')
            expect(map.has('/sv/blog/99/')).toBe(false)
        } finally {
            rmSync(pagesDir, { force: true, recursive: true })
            rmSync(postsDir, { force: true, recursive: true })
        }
    })

    it('throws when a post lacks updatedDate in meta.json', () => {
        const pagesDir = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-pages-'))
        const postsDir = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-posts-'))
        try {
            const postDir = join(postsDir, '99')
            mkdirSync(postDir, { recursive: true })
            writeFileSync(join(postDir, 'meta.json'), JSON.stringify({}))
            writeFileSync(join(postDir, 'fi.mdx'), `---\nslug: 'esimerkki'\n---\n`)

            expect(() => buildPageDateMap({ pagesDir, postsDir, tags: [] })).toThrow(
                /missing required updatedDate\/slug/
            )
        } finally {
            rmSync(pagesDir, { force: true, recursive: true })
            rmSync(postsDir, { force: true, recursive: true })
        }
    })

    it('throws when a post language file lacks slug', () => {
        const pagesDir = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-pages-'))
        const postsDir = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-posts-'))
        try {
            const postDir = join(postsDir, '99')
            mkdirSync(postDir, { recursive: true })
            writeFileSync(join(postDir, 'meta.json'), JSON.stringify({ updatedDate: '2026-01-05' }))
            writeFileSync(join(postDir, 'fi.mdx'), `---\ntitle: 'No slug'\n---\n`)

            expect(() => buildPageDateMap({ pagesDir, postsDir, tags: [] })).toThrow(
                /missing required updatedDate\/slug/
            )
        } finally {
            rmSync(pagesDir, { force: true, recursive: true })
            rmSync(postsDir, { force: true, recursive: true })
        }
    })
})
