import type { AstroIntegrationLogger } from 'astro'

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { createSitemapAlternates, extractHreflangLinks } from './sitemapAlternates'

const SITE = 'https://lavanti.fi'

const hreflangHead = (alternates: Record<string, string>): string =>
    Object.entries(alternates)
        .map(([lang, path]) => `<link href=${SITE}${path} hreflang=${lang} rel=alternate>`)
        .join('')

describe('extractHreflangLinks', () => {
    it('reads hreflang links in any attribute order and quoting', () => {
        const html =
            '<link href="https://lavanti.fi/fi/x/" hreflang="fi" rel="alternate">' +
            "<link rel='alternate' hreflang='sv' href='https://lavanti.fi/sv/y/'>" +
            '<link href=https://lavanti.fi/fi/x/ hreflang=x-default rel=alternate>'

        expect(extractHreflangLinks(html)).toEqual([
            { lang: 'fi', url: 'https://lavanti.fi/fi/x/' },
            { lang: 'sv', url: 'https://lavanti.fi/sv/y/' },
            { lang: 'x-default', url: 'https://lavanti.fi/fi/x/' },
        ])
    })

    it('ignores the RSS alternate and other link tags without hreflang', () => {
        const html =
            '<link href="/fi/rss.xml" rel="alternate" type="application/rss+xml">' +
            '<link href="https://lavanti.fi/fi/x/" rel="canonical">'

        expect(extractHreflangLinks(html)).toEqual([])
    })
})

describe('createSitemapAlternates', () => {
    const dirs: string[] = []

    afterEach(() => {
        for (const dir of dirs.splice(0)) rmSync(dir, { force: true, recursive: true })
    })

    const build = async (files: Record<string, string>) => {
        const dir = mkdtempSync(join(tmpdir(), 'sitemap-alternates-'))
        dirs.push(dir)
        for (const [path, html] of Object.entries(files)) {
            mkdirSync(join(dir, path, '..'), { recursive: true })
            writeFileSync(join(dir, path), html)
        }
        const alternates = createSitemapAlternates()
        const pages = Object.keys(files).map((path) => ({ pathname: path.replace(/index\.html$/, '') }))
        const hook = alternates.integration.hooks['astro:build:done']!
        await hook({
            assets: new Map(),
            dir: pathToFileURL(`${dir}/`),
            logger: {} as AstroIntegrationLogger,
            pages: [...pages, { pathname: '404/' }],
        })

        return alternates
    }

    const post = { en: '/en/blog/1/a/', fi: '/fi/blog/1/ä/', sv: '/sv/blog/1/b/', 'x-default': '/fi/blog/1/ä/' }
    const postFiles = {
        'en/blog/1/a/index.html': hreflangHead(post),
        'fi/blog/1/ä/index.html': hreflangHead(post),
        'sv/blog/1/b/index.html': hreflangHead(post),
    }

    it('returns the page hreflang set for a sitemap URL, matching percent-encoded slugs', async () => {
        const { linksFor } = await build(postFiles)

        expect(linksFor(`${SITE}/fi/blog/1/%C3%A4/`, () => true)).toEqual([
            { lang: 'en', url: `${SITE}/en/blog/1/a/` },
            { lang: 'fi', url: `${SITE}/fi/blog/1/ä/` },
            { lang: 'sv', url: `${SITE}/sv/blog/1/b/` },
            { lang: 'x-default', url: `${SITE}/fi/blog/1/ä/` },
        ])
    })

    it('drops alternates that are not built pages or are filtered out of the sitemap', async () => {
        const { linksFor } = await build({
            'fi/blog/1/ä/index.html': hreflangHead(post),
            'sv/blog/1/b/index.html': hreflangHead(post),
        })

        const links = linksFor(`${SITE}/fi/blog/1/ä/`, (url) => !url.includes('/sv/'))

        expect(links).toBeUndefined()
    })

    it('keeps the remaining alternates when at least two locales survive', async () => {
        const { linksFor } = await build({
            'fi/blog/1/ä/index.html': hreflangHead(post),
            'sv/blog/1/b/index.html': hreflangHead(post),
        })

        expect(linksFor(`${SITE}/sv/blog/1/b/`, () => true)?.map((link) => link.lang)).toEqual([
            'fi',
            'sv',
            'x-default',
        ])
    })

    it('returns undefined for a page without hreflang links', async () => {
        const { linksFor } = await build({ 'fi/x/index.html': '<link href="/fi/rss.xml" rel="alternate">' })

        expect(linksFor(`${SITE}/fi/x/`, () => true)).toBeUndefined()
    })
})
