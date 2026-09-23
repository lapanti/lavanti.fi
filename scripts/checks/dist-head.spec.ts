import { describe, expect, it } from 'vitest'

import { checkPage, findTags, isSkippablePage, parseAttrs } from './dist-head'

// ── shared test fixtures ──────────────────────────────────────────────────────

const PAGE_PATH = '/fi/about/'
const POST_PATH = '/fi/blog/1/testi-artikkeli/'
const NEWSLETTER_PATH = '/fi/uutiskirje/1/testi-kirje/'

const BUILT_PATHS = new Set([
    '/fi/about/',
    '/sv/about/',
    '/en/about/',
    '/fi/blog/1/testi-artikkeli/',
    '/sv/blog/1/test-artikel/',
    '/en/blog/1/test-article/',
    '/fi/uutiskirje/1/testi-kirje/',
    '/sv/nyhetsbrev/1/test-brev/',
    '/en/newsletter/1/test-issue/',
])

interface HeadOverrides {
    body?: string
    canonical?: string
    description?: string
    head?: string
    hreflangs?: string
    jsonld?: string
    ogImage?: string
    rss?: string
    title?: string
}

function pageHtml(overrides: HeadOverrides = {}): string {
    const {
        body = '',
        canonical = '<link href="https://lavanti.fi/fi/about/" rel="canonical">',
        head = '',
        description = '<meta name="description" content="Kuvaus sivusta">',
        hreflangs = [
            '<link href="https://lavanti.fi/fi/about/" hreflang="fi" rel="alternate">',
            '<link href="https://lavanti.fi/sv/about/" hreflang="sv" rel="alternate">',
            '<link href="https://lavanti.fi/en/about/" hreflang="en" rel="alternate">',
            '<link href="https://lavanti.fi/fi/about/" hreflang="x-default" rel="alternate">',
        ].join(''),
        jsonld = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"ProfilePage"}</script>',
        ogImage = '',
        rss = '<link href="/fi/rss.xml" rel="alternate" title="Blogi" type="application/rss+xml">',
        title = '<title>Testisivu | Lauri Lavanti</title>',
    } = overrides
    const ogUrl = /href="([^"]*)" rel="canonical"/.exec(canonical)?.[1] ?? 'https://lavanti.fi/fi/about/'

    return `<html><head>${title}${description}${canonical}${hreflangs}${rss}${head}
        <meta content="Testisivu" property="og:title">
        <meta content="Kuvaus sivusta" property="og:description">
        <meta content="${ogUrl}" property="og:url">
        ${ogImage}${jsonld}</head><body>${body}</body></html>`
}

// ── hero preload fixtures ─────────────────────────────────────────────────────

const HERO_SRCSET = 'https://lavanti.fi/images/x/w=864 864w, https://lavanti.fi/images/x/w=1728 1728w'
const HERO_SIZES = '(max-width: 1223px) 100vw, 1224px'
const HERO_IMG = `<img alt="" fetchpriority="high" sizes="${HERO_SIZES}" src="https://lavanti.fi/images/x/w=1728" srcset="${HERO_SRCSET}" width="1728" height="1320">`
const HERO_PRELOAD = `<link as="image" fetchpriority="high" imagesizes="${HERO_SIZES}" imagesrcset="${HERO_SRCSET}" rel="preload">`

// ── parseAttrs / findTags ─────────────────────────────────────────────────────

describe('parseAttrs', () => {
    it('parses attributes regardless of order', () => {
        expect(parseAttrs('<meta name="robots" content="noindex">')).toEqual({
            content: 'noindex',
            name: 'robots',
        })
        expect(parseAttrs('<meta content="noindex, nofollow" name="robots">')).toEqual({
            content: 'noindex, nofollow',
            name: 'robots',
        })
    })
})

describe('findTags', () => {
    it('collects every tag of the given name', () => {
        const html = '<link rel="canonical" href="a"><meta name="x" content="y"><link rel="alternate" href="b">'
        expect(findTags(html, 'link')).toHaveLength(2)
        expect(findTags(html, 'meta')).toHaveLength(1)
    })
})

// ── isSkippablePage ───────────────────────────────────────────────────────────

describe('isSkippablePage', () => {
    it('skips redirect stubs', () => {
        expect(isSkippablePage('<meta http-equiv="refresh" content="0;url=/fi/">')).toBe(true)
    })

    it('skips noindex pages with either attribute order', () => {
        expect(isSkippablePage('<meta name="robots" content="noindex">')).toBe(true)
        expect(isSkippablePage('<meta content="noindex, nofollow" name="robots">')).toBe(true)
    })

    it('keeps indexable pages', () => {
        expect(isSkippablePage(pageHtml())).toBe(false)
    })
})

// ── checkPage ─────────────────────────────────────────────────────────────────

describe('checkPage', () => {
    it('passes a fully valid page', () => {
        expect(checkPage(pageHtml(), PAGE_PATH, BUILT_PATHS)).toEqual([])
    })

    it('flags a missing title', () => {
        const problems = checkPage(pageHtml({ title: '' }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('expected exactly one <title>, found 0')
    })

    it('flags an empty meta description', () => {
        const problems = checkPage(
            pageHtml({ description: '<meta name="description" content="">' }),
            PAGE_PATH,
            BUILT_PATHS
        )
        expect(problems).toContain('missing or empty meta description')
    })

    it('flags a missing canonical', () => {
        const problems = checkPage(pageHtml({ canonical: '' }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('expected exactly one canonical link, found 0')
    })

    it('flags a canonical pointing at another page', () => {
        const problems = checkPage(
            pageHtml({ canonical: '<link href="https://lavanti.fi/fi/" rel="canonical">' }),
            PAGE_PATH,
            BUILT_PATHS
        )
        expect(problems.some((p) => p.includes('differs from page path'))).toBe(true)
    })

    it('accepts percent-encoded canonical for a raw-unicode page path', () => {
        const path = '/sv/blog/38/en-kall-skord-for-kyrkslätt/'
        const html = pageHtml({
            canonical: '<link href="https://lavanti.fi/sv/blog/38/en-kall-skord-for-kyrksl%C3%A4tt/" rel="canonical">',
            hreflangs: [
                `<link href="https://lavanti.fi${path}" hreflang="fi" rel="alternate">`,
                `<link href="https://lavanti.fi${path}" hreflang="sv" rel="alternate">`,
                `<link href="https://lavanti.fi${path}" hreflang="en" rel="alternate">`,
                `<link href="https://lavanti.fi${path}" hreflang="x-default" rel="alternate">`,
            ].join(''),
            rss: '<link href="/sv/rss.xml" rel="alternate" title="Blogg" type="application/rss+xml">',
        })
        const problems = checkPage(html, path, new Set([path]))
        expect(problems.filter((p) => p.includes('canonical'))).toEqual([])
    })

    it('flags an incomplete hreflang set', () => {
        const problems = checkPage(
            pageHtml({ hreflangs: '<link href="https://lavanti.fi/fi/about/" hreflang="fi" rel="alternate">' }),
            PAGE_PATH,
            BUILT_PATHS
        )
        expect(problems.some((p) => p.startsWith('expected hreflang set'))).toBe(true)
    })

    it('flags an hreflang target that is not a built page', () => {
        const hreflangs = [
            '<link href="https://lavanti.fi/fi/about/" hreflang="fi" rel="alternate">',
            '<link href="https://lavanti.fi/sv/missing/" hreflang="sv" rel="alternate">',
            '<link href="https://lavanti.fi/en/about/" hreflang="en" rel="alternate">',
            '<link href="https://lavanti.fi/fi/about/" hreflang="x-default" rel="alternate">',
        ].join('')
        const problems = checkPage(pageHtml({ hreflangs }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('hreflang sv points at "/sv/missing/" which is not a built page')
    })

    it('flags x-default not matching the fi URL', () => {
        const hreflangs = [
            '<link href="https://lavanti.fi/fi/about/" hreflang="fi" rel="alternate">',
            '<link href="https://lavanti.fi/sv/about/" hreflang="sv" rel="alternate">',
            '<link href="https://lavanti.fi/en/about/" hreflang="en" rel="alternate">',
            '<link href="https://lavanti.fi/en/about/" hreflang="x-default" rel="alternate">',
        ].join('')
        const problems = checkPage(pageHtml({ hreflangs }), PAGE_PATH, BUILT_PATHS)
        expect(problems.some((p) => p.includes('x-default'))).toBe(true)
    })

    it('flags a missing RSS autodiscovery link', () => {
        const problems = checkPage(pageHtml({ rss: '' }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('missing RSS autodiscovery link for /fi/rss.xml')
    })

    it('flags unparseable JSON-LD and unknown types', () => {
        expect(
            checkPage(
                pageHtml({ jsonld: '<script type="application/ld+json">{nope}</script>' }),
                PAGE_PATH,
                BUILT_PATHS
            )
        ).toContain('JSON-LD block does not parse as JSON')
        expect(
            checkPage(
                pageHtml({
                    jsonld: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Nonsense"}</script>',
                }),
                PAGE_PATH,
                BUILT_PATHS
            )
        ).toContain('unknown JSON-LD @type "Nonsense"')
        expect(
            checkPage(
                pageHtml({
                    jsonld: '<script type="application/ld+json">{"@context":"https://evilschema.org.example.com","@type":"Person"}</script>',
                }),
                PAGE_PATH,
                BUILT_PATHS
            )
        ).toContain('JSON-LD @context is "https://evilschema.org.example.com", expected "https://schema.org"')
    })

    it('passes a hero page whose preload mirrors the hero img', () => {
        expect(checkPage(pageHtml({ body: HERO_IMG, head: HERO_PRELOAD }), PAGE_PATH, BUILT_PATHS)).toEqual([])
    })

    it('flags a hero image without a preload link', () => {
        const problems = checkPage(pageHtml({ body: HERO_IMG }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('hero image (fetchpriority=high) has no preload link')
    })

    it('flags a preload whose imagesrcset drifted from the hero markup', () => {
        const drifted = HERO_PRELOAD.replace('864 864w', '999 999w')
        const problems = checkPage(pageHtml({ body: HERO_IMG, head: drifted }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('image preload imagesrcset does not match any hero img/source srcset')
    })

    it('flags a preload whose imagesizes drifted from the hero sizes', () => {
        const drifted = HERO_PRELOAD.replace('imagesizes="(max-width: 1223px) 100vw, 1224px"', 'imagesizes="100vw"')
        const problems = checkPage(pageHtml({ body: HERO_IMG, head: drifted }), PAGE_PATH, BUILT_PATHS)
        expect(problems).toContain('image preload imagesizes differs from its hero element sizes')
    })

    it('flags crossorigin and href double-download hazards on image preloads', () => {
        const withCrossorigin = HERO_PRELOAD.replace('rel="preload"', 'crossorigin="" rel="preload"')
        expect(checkPage(pageHtml({ body: HERO_IMG, head: withCrossorigin }), PAGE_PATH, BUILT_PATHS)).toContain(
            'image preload carries crossorigin (double-download hazard)'
        )
        const withHref = HERO_PRELOAD.replace(
            'rel="preload"',
            'href="https://lavanti.fi/images/x/w=1728" rel="preload"'
        )
        expect(checkPage(pageHtml({ body: HERO_IMG, head: withHref }), PAGE_PATH, BUILT_PATHS)).toContain(
            'image preload carries an href fallback (double-download hazard)'
        )
    })

    it('accepts a preload matching a picture source and flags extra preloads on posts', () => {
        const sourceSrcset = 'https://lavanti.fi/images/y/w=560 560w'
        const body = `<picture><source media="(min-width: 769px)" sizes="470px" srcset="${sourceSrcset}">${HERO_IMG}</picture>`
        const sourcePreload = `<link as="image" fetchpriority="high" imagesizes="470px" imagesrcset="${sourceSrcset}" media="(min-width: 769px)" rel="preload">`
        expect(checkPage(pageHtml({ body, head: HERO_PRELOAD + sourcePreload }), PAGE_PATH, BUILT_PATHS)).toEqual([])

        const postOverrides: HeadOverrides = {
            body,
            canonical: `<link href="https://lavanti.fi${POST_PATH}" rel="canonical">`,
            head: HERO_PRELOAD + sourcePreload,
            hreflangs: [
                `<link href="https://lavanti.fi${POST_PATH}" hreflang="fi" rel="alternate">`,
                '<link href="https://lavanti.fi/sv/blog/1/test-artikel/" hreflang="sv" rel="alternate">',
                '<link href="https://lavanti.fi/en/blog/1/test-article/" hreflang="en" rel="alternate">',
                `<link href="https://lavanti.fi${POST_PATH}" hreflang="x-default" rel="alternate">`,
            ].join(''),
            jsonld: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","datePublished":"2026-01-01"}</script>',
            ogImage: '<meta content="https://lavanti.fi/images/x/og" property="og:image">',
        }
        expect(checkPage(pageHtml(postOverrides), POST_PATH, BUILT_PATHS)).toContain(
            'post page expected exactly one image preload, found 2'
        )
    })

    it('requires og:image and BlogPosting with datePublished on post pages', () => {
        const postOverrides: HeadOverrides = {
            canonical: `<link href="https://lavanti.fi${POST_PATH}" rel="canonical">`,
            hreflangs: [
                `<link href="https://lavanti.fi${POST_PATH}" hreflang="fi" rel="alternate">`,
                '<link href="https://lavanti.fi/sv/blog/1/test-artikel/" hreflang="sv" rel="alternate">',
                '<link href="https://lavanti.fi/en/blog/1/test-article/" hreflang="en" rel="alternate">',
                `<link href="https://lavanti.fi${POST_PATH}" hreflang="x-default" rel="alternate">`,
            ].join(''),
        }

        const missingBoth = checkPage(pageHtml(postOverrides), POST_PATH, BUILT_PATHS)
        expect(missingBoth).toContain('post page missing og:image')
        expect(missingBoth).toContain('post page missing BlogPosting JSON-LD')

        const valid = checkPage(
            pageHtml({
                ...postOverrides,
                jsonld: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","datePublished":"2026-01-01"}</script>',
                ogImage: '<meta content="https://lavanti.fi/images/x/og" property="og:image">',
            }),
            POST_PATH,
            BUILT_PATHS
        )
        expect(valid).toEqual([])
    })

    it('applies the article rules to newsletter archive issues', () => {
        const issueOverrides: HeadOverrides = {
            canonical: `<link href="https://lavanti.fi${NEWSLETTER_PATH}" rel="canonical">`,
            hreflangs: [
                `<link href="https://lavanti.fi${NEWSLETTER_PATH}" hreflang="fi" rel="alternate">`,
                '<link href="https://lavanti.fi/sv/nyhetsbrev/1/test-brev/" hreflang="sv" rel="alternate">',
                '<link href="https://lavanti.fi/en/newsletter/1/test-issue/" hreflang="en" rel="alternate">',
                `<link href="https://lavanti.fi${NEWSLETTER_PATH}" hreflang="x-default" rel="alternate">`,
            ].join(''),
        }

        const missingBoth = checkPage(pageHtml(issueOverrides), NEWSLETTER_PATH, BUILT_PATHS)
        expect(missingBoth).toContain('post page missing og:image')
        expect(missingBoth).toContain('post page missing BlogPosting JSON-LD')

        const valid = checkPage(
            pageHtml({
                ...issueOverrides,
                jsonld: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","datePublished":"2026-04-25"}</script>',
                ogImage:
                    '<meta content="https://lavanti.fi/og/fi__uutiskirje__1__testi-kirje.png" property="og:image">',
            }),
            NEWSLETTER_PATH,
            BUILT_PATHS
        )
        expect(valid).toEqual([])
    })

    it('flags FAQPage JSON-LD that no visible FAQ section backs', () => {
        const faqJsonld = [
            '<script type="application/ld+json">{"@context":"https://schema.org","@type":"ProfilePage"}</script>',
            '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>',
        ].join('')

        expect(checkPage(pageHtml({ jsonld: faqJsonld }), PAGE_PATH, BUILT_PATHS)).toContain(
            'FAQPage JSON-LD with no visible FAQ section'
        )
    })

    it('accepts FAQPage JSON-LD when the plate is rendered', () => {
        const faqJsonld = [
            '<script type="application/ld+json">{"@context":"https://schema.org","@type":"ProfilePage"}</script>',
            '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>',
        ].join('')

        expect(
            checkPage(
                pageHtml({ body: '<section class="faq section"><h3>Kysymys?</h3></section>', jsonld: faqJsonld }),
                PAGE_PATH,
                BUILT_PATHS
            )
        ).toEqual([])
    })
})
