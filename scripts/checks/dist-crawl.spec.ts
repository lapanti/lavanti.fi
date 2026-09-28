import { describe, expect, it } from 'vitest'

import {
    checkLlmsTxt,
    checkRedirectsOutput,
    extractLlmsLinks,
    extractOgImage,
    normalizePath,
    parseRedirects,
} from './dist-crawl'

describe('normalizePath', () => {
    it('adds a trailing slash to page routes and leaves file routes untouched', () => {
        expect(normalizePath('/fi/about')).toBe('/fi/about/')
        expect(normalizePath('/fi/about/')).toBe('/fi/about/')
        expect(normalizePath('/fi/rss.xml')).toBe('/fi/rss.xml')
    })

    it('strips fragments and query strings', () => {
        expect(normalizePath('/fi/about/#team')).toBe('/fi/about/')
        expect(normalizePath('/fi/about/?utm=x')).toBe('/fi/about/')
    })

    it('percent-decodes so encoded links match the UTF-8 filesystem', () => {
        expect(normalizePath('/sv/blog/38/en-kall-skord-for-kyrksl%C3%A4tt/')).toBe(
            '/sv/blog/38/en-kall-skord-for-kyrkslätt/'
        )
    })
})

describe('extractOgImage', () => {
    it('extracts a site-origin og:image as a root-relative path (content-first order)', () => {
        const html = '<meta content="https://lavanti.fi/og/fi__about.png" property="og:image" />'
        expect(extractOgImage(html)).toBe('/og/fi__about.png')
    })

    it('handles the property-first attribute order', () => {
        const html = '<meta property="og:image" content="https://lavanti.fi/og/fi.png" />'
        expect(extractOgImage(html)).toBe('/og/fi.png')
    })

    it('returns null when there is no og:image', () => {
        expect(extractOgImage('<meta name="twitter:card" content="summary" />')).toBeNull()
    })
})

describe('extractLlmsLinks', () => {
    it('collects site-origin and root-relative links, ignoring external ones', () => {
        const md = [
            '- [Home](https://lavanti.fi/fi/)',
            '- [About](/fi/about/)',
            '- [External](https://example.com/x/)',
            '- [Mastodon](https://mastodon.social/@laurilavanti)',
        ].join('\n')

        expect(extractLlmsLinks(md)).toEqual(['/fi/', '/fi/about/'])
    })
})

describe('checkLlmsTxt', () => {
    const servable = new Set(['/fi/', '/fi/about/'])

    it('passes when every internal link resolves to a built page', () => {
        expect(checkLlmsTxt('[Home](https://lavanti.fi/fi/) [About](/fi/about/)', servable, new Set())).toEqual([])
    })

    it('flags a link to a missing page', () => {
        const problems = checkLlmsTxt('[Gone](https://lavanti.fi/fi/gone/)', servable, new Set())

        expect(problems).toHaveLength(1)
        expect(problems[0]).toContain('missing page')
    })

    it('flags a link that points at a redirect source instead of the canonical target', () => {
        const problems = checkLlmsTxt('[Old](https://lavanti.fi/blogi/)', servable, new Set(['/blogi/']))

        expect(problems).toHaveLength(1)
        expect(problems[0]).toContain('redirect source')
    })
})

describe('parseRedirects', () => {
    it('parses rule lines and skips comments and blanks', () => {
        const text = ['# comment', '', '/about /fi/about/ 301', '/blog /fi/blog/ 301'].join('\n')

        expect(parseRedirects(text)).toEqual([
            { source: '/about', target: '/fi/about/' },
            { source: '/blog', target: '/fi/blog/' },
        ])
    })
})

describe('checkRedirectsOutput', () => {
    const servable = new Set(['/fi/about/', '/fi/blog/', '/fi/blog/51/digitaalinen/'])

    it('passes for locale-less aliases and bare-id posts whose targets are built pages', () => {
        const rules = [
            { source: '/about', target: '/fi/about/' },
            { source: '/about/', target: '/fi/about/' },
            { source: '/fi/blog/51/', target: '/fi/blog/51/digitaalinen/' },
        ]

        expect(checkRedirectsOutput(rules, servable)).toEqual([])
    })

    it('flags a chain (target is itself a redirect source)', () => {
        const rules = [
            { source: '/a/', target: '/b/' },
            { source: '/b/', target: '/fi/about/' },
        ]
        const problems = checkRedirectsOutput(rules, servable)

        expect(problems.some((p) => p.includes('chain'))).toBe(true)
    })

    it('flags a dead-end (target resolves to no built page)', () => {
        const problems = checkRedirectsOutput([{ source: '/x/', target: '/fi/missing/' }], servable)

        expect(problems).toHaveLength(1)
        expect(problems[0]).toContain('dead-end')
    })
})
