import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { newsletterPath } from '../../src/lib/newsletterRoutes'
import { collectDuePosts, findUnpublished, parseSitemapLocs } from './publish-due'

const writePost = (
    postsDir: string,
    id: string,
    publishDate: string,
    slugs: Partial<Record<'fi' | 'sv' | 'en', string>>
): void => {
    const dir = join(postsDir, id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ publishDate }))
    for (const [lang, slug] of Object.entries(slugs)) {
        writeFileSync(join(dir, `${lang}.mdx`), `---\nslug: '${slug}'\n---\n`)
    }
}

describe('collectDuePosts', () => {
    const postsDir = mkdtempSync(join(tmpdir(), 'publish-due-'))
    afterAll(() => rmSync(postsDir, { force: true, recursive: true }))

    writePost(postsDir, '1', '2026-08-30', { en: 'past', fi: 'mennyt' })
    writePost(postsDir, '2', '2026-08-31', { fi: 'tanaan' })
    writePost(postsDir, '3', '2026-09-01', { en: 'future', fi: 'tuleva', sv: 'framtida' })

    it('includes posts published today or earlier, one URL per language file', () => {
        const due = collectDuePosts(postsDir, '2026-08-31')
        expect(due.map((p) => p.url).toSorted()).toEqual([
            '/en/blog/1/past/',
            '/fi/blog/1/mennyt/',
            '/fi/blog/2/tanaan/',
        ])
    })

    it('excludes posts with a future publishDate', () => {
        const due = collectDuePosts(postsDir, '2026-08-31')
        expect(due.some((p) => p.url.includes('/blog/3/'))).toBe(false)
    })

    it('includes future posts once their date arrives', () => {
        const due = collectDuePosts(postsDir, '2026-09-01')
        expect(due.map((p) => p.url)).toContain('/sv/blog/3/framtida/')
    })

    it('builds newsletter URLs from the localized segments when given that url shape', () => {
        const due = collectDuePosts(postsDir, '2026-08-31', newsletterPath)
        expect(due.map((p) => p.url).toSorted()).toEqual([
            '/en/newsletter/1/past/',
            '/fi/uutiskirje/1/mennyt/',
            '/fi/uutiskirje/2/tanaan/',
        ])
    })

    it('yields nothing for a collection directory that does not exist', () => {
        expect(collectDuePosts(join(postsDir, 'missing'), '2026-08-31')).toEqual([])
    })
})

describe('parseSitemapLocs', () => {
    it('extracts pathnames from loc elements', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset><url><loc>https://lavanti.fi/fi/blog/1/mennyt/</loc></url>
<url><loc>https://lavanti.fi/en/about/</loc></url></urlset>`
        expect(parseSitemapLocs(xml)).toEqual(['/fi/blog/1/mennyt/', '/en/about/'])
    })

    it('percent-decodes encoded locs', () => {
        const xml = `<loc>https://lavanti.fi/sv/blog/38/en-kall-skord-for-kyrksl%C3%A4tt/</loc>`
        expect(parseSitemapLocs(xml)).toEqual(['/sv/blog/38/en-kall-skord-for-kyrkslätt/'])
    })

    it('returns an empty array for XML without locs', () => {
        expect(parseSitemapLocs('<urlset></urlset>')).toEqual([])
    })
})

describe('findUnpublished', () => {
    const due = [
        { publishDate: '2026-08-30', url: '/fi/blog/1/mennyt/' },
        { publishDate: '2026-08-31', url: '/fi/blog/2/tanaan/' },
    ]

    it('returns due posts missing from the live sitemap', () => {
        expect(findUnpublished(due, ['/fi/blog/1/mennyt/'])).toEqual([
            { publishDate: '2026-08-31', url: '/fi/blog/2/tanaan/' },
        ])
    })

    it('returns nothing when all due posts are live', () => {
        expect(
            findUnpublished(
                due,
                due.map((p) => p.url)
            )
        ).toEqual([])
    })
})
