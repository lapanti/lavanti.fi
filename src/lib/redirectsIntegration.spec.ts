import { describe, expect, it } from 'vitest'

import { buildRedirectLines } from './redirectsIntegration'

describe('buildRedirectLines', () => {
    it('emits a "<from> <to> 301" line for every static redirect map entry', () => {
        const lines = buildRedirectLines({ '/blogi/': '/fi/blog/', '/minusta/': '/fi/about/' }, [])

        expect(lines).toContain('/blogi/ /fi/blog/ 301')
        expect(lines).toContain('/minusta/ /fi/about/ 301')
    })

    it('derives bare-id → slug redirects from canonical post pages (fi/sv/en)', () => {
        const lines = buildRedirectLines({}, [
            '/fi/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/',
            '/sv/blog/51/digital-sjalvstandighet-ar-en-nodvandighet/',
            '/en/blog/51/digital-independence-is-a-necessity/',
        ])

        expect(lines).toContain('/fi/blog/51/ /fi/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/ 301')
        expect(lines).toContain('/sv/blog/51/ /sv/blog/51/digital-sjalvstandighet-ar-en-nodvandighet/ 301')
        expect(lines).toContain('/en/blog/51/ /en/blog/51/digital-independence-is-a-necessity/ 301')
    })

    it('normalises pathnames missing a leading or trailing slash', () => {
        const lines = buildRedirectLines({}, ['fi/blog/7/ehdolle-aluevaaleihin'])

        expect(lines).toContain('/fi/blog/7/ /fi/blog/7/ehdolle-aluevaaleihin/ 301')
    })

    it('derives locale-less aliases (both slash variants) for canonical Finnish pages', () => {
        const lines = buildRedirectLines({}, ['/fi/about/', '/fi/category/technology/'])

        expect(lines).toContain('/about /fi/about/ 301')
        expect(lines).toContain('/about/ /fi/about/ 301')
        expect(lines).toContain('/category/technology /fi/category/technology/ 301')
        expect(lines).toContain('/category/technology/ /fi/category/technology/ 301')
    })

    it('aliases canonical Finnish blog posts alongside the bare-id redirect', () => {
        const lines = buildRedirectLines({}, ['/fi/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/'])

        expect(lines).toContain('/fi/blog/51/ /fi/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/ 301')
        expect(lines).toContain(
            '/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys /fi/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/ 301'
        )
        expect(lines).toContain(
            '/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/ /fi/blog/51/digitaalinen-itsenaisyys-on-valttamattomyys/ 301'
        )
    })

    it('never aliases the Finnish root, bare-post sources, English/Swedish pages, or file routes', () => {
        const lines = buildRedirectLines({}, ['/fi/', '/fi/blog/51/', '/fi/rss.xml', '/en/about/', '/sv/about/'])

        expect(lines).toEqual([])
    })

    it('never shadows a path already defined as a static redirect source', () => {
        const lines = buildRedirectLines({ '/about/': '/fi/about-legacy/' }, ['/fi/about/'])

        expect(lines).toContain('/about/ /fi/about-legacy/ 301')
        expect(lines).not.toContain('/about /fi/about/ 301')
        expect(lines).not.toContain('/about/ /fi/about/ 301')
    })

    it('de-duplicates repeated pages and returns lines sorted deterministically', () => {
        const lines = buildRedirectLines({ '/a/': '/1/', '/b/': '/2/' }, [
            '/en/blog/2/second-post/',
            '/en/blog/2/second-post/',
        ])

        expect(lines).toEqual([...lines].sort())
        expect(lines).toEqual(['/a/ /1/ 301', '/b/ /2/ 301', '/en/blog/2/ /en/blog/2/second-post/ 301'])
    })
})
