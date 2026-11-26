import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { unpublishedPostIds, unwrapLinks, unwrapLinksInDir } from './unpublishedLinks'

describe('unwrapLinks', () => {
    const scheduled = new Set([72])

    it('replaces an anchor to an unpublished post with its inner HTML and keeps other links', () => {
        const html =
            '<p>Työssäni <a href="/fi/blog/72/koodari-vastaan-kone/" data-astro-cid-x>käytän <em>tekoälyä</em></a> ja ' +
            '<a href="/fi/blog/80/kuka-omistaa/">hankinnoista</a>.</p>'

        expect(unwrapLinks(html, scheduled)).toBe(
            '<p>Työssäni käytän <em>tekoälyä</em> ja <a href="/fi/blog/80/kuka-omistaa/">hankinnoista</a>.</p>'
        )
    })

    it.each([
        ['an absolute site URL', '<a class="x" href="https://lavanti.fi/sv/blog/72/kodare-mot-maskin/#rubrik">x</a>'],
        ['an English post', '<a href="/en/blog/72/coder-vs-machine/">x</a>'],
    ])('unwraps %s', (_, html) => {
        expect(unwrapLinks(html, scheduled)).toBe('x')
    })

    it.each([
        ['another post id', '<a href="/fi/blog/7/x/">x</a>'],
        ['a post id with 72 as a prefix', '<a href="/fi/blog/720/x/">x</a>'],
        ['an off-site URL', '<a href="https://example.com/fi/blog/72/x/">x</a>'],
        ['the blog index', '<a href="/fi/blog/">x</a>'],
    ])('leaves %s alone', (_, html) => {
        expect(unwrapLinks(html, scheduled)).toBe(html)
    })
})

describe('with a posts and dist fixture', () => {
    const root = mkdtempSync(join(tmpdir(), 'unpublished-links-'))
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    it('treats posts dated after today as unpublished; a post dated today is published', () => {
        const posts = join(root, 'posts')
        for (const [id, publishDate] of [
            [71, '2026-11-01'],
            [72, '2026-12-16'],
            [73, '2026-11-26'],
        ] as const) {
            mkdirSync(join(posts, String(id)), { recursive: true })
            writeFileSync(join(posts, String(id), 'meta.json'), JSON.stringify({ id, publishDate }))
        }

        expect(unpublishedPostIds(posts, '2026-11-26')).toEqual(new Set([72]))
    })

    it('rewrites only the built HTML files that link an unpublished post', () => {
        const dist = join(root, 'dist')
        mkdirSync(join(dist, 'fi', 'blog', '81', 'x'), { recursive: true })
        writeFileSync(join(dist, 'fi', 'blog', '81', 'x', 'index.html'), '<a href="/fi/blog/72/y/">y</a>')
        writeFileSync(join(dist, 'index.html'), '<a href="/fi/">fi</a>')

        expect(unwrapLinksInDir(dist, new Set([72]))).toBe(1)
        expect(readFileSync(join(dist, 'fi', 'blog', '81', 'x', 'index.html'), 'utf8')).toBe('y')
        expect(readFileSync(join(dist, 'index.html'), 'utf8')).toBe('<a href="/fi/">fi</a>')
    })
})
