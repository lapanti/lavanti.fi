import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import { PERSON_ID, personJobTitle, personName } from '../content/person'
import { socialUrls } from '../content/social'
import Head from './Head.astro'

/** Wikipedia and Wikidata: reference entries in sameAs that are not social profiles. */
const REFERENCE_SAME_AS = 2

describe('<Head />', () => {
    it('should render with required props', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        expect(result).toBeDefined()
    })

    it('should set page title correctly', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        const titleElement = result.querySelector('title')
        expect(titleElement?.textContent).toBe('Test Page | Lauri Lavanti')
    })

    it('should set base title when title is "Lauri Lavanti"', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Lauri Lavanti',
            },
        })

        const titleElement = result.querySelector('title')
        expect(titleElement?.textContent).toBe('Lauri Lavanti')
    })

    it('should set og:title meta tag', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        const ogTitle = result.querySelector('meta[property="og:title"]')
        expect(ogTitle).toHaveAttribute('content', 'Test Page')
    })

    it('should set theme-color meta tag', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        const themeColor = result.querySelector('meta[name="theme-color"]')
        expect(themeColor).toHaveAttribute('content', '#163E35')
    })

    it.each([
        ['fi', '/fi/rss.xml', 'Lauri Lavanti – blogi'],
        ['sv', '/sv/rss.xml', 'Lauri Lavanti – blogg'],
        ['en', '/en/rss.xml', 'Lauri Lavanti – blog'],
    ])('should set RSS autodiscovery link for %s', async (lang, href, title) => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang,
                title: 'Test Page',
            },
        })

        const rssLink = result.querySelector('link[rel="alternate"][type="application/rss+xml"]')
        expect(rssLink).toHaveAttribute('href', href)
        expect(rssLink).toHaveAttribute('title', title)
    })

    it('should set description meta tags', async () => {
        const description = 'Custom description'
        const result = await renderAstroComponent(Head, {
            props: {
                description,
                title: 'Test Page',
            },
        })

        const descMeta = result.querySelector('meta[name="description"]')
        const ogDescMeta = result.querySelector('meta[property="og:description"]')
        expect(descMeta).toHaveAttribute('content', description)
        expect(ogDescMeta).toHaveAttribute('content', description)
    })

    it('should include JSON-LD script tag', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        expect(jsonLdScript).toBeDefined()
    })

    it('should set BlogPosting JSON-LD when type is BLOGPOSTING', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Test Blog Post',
                type: 'BlogPosting',
                updatedAt: '2024-01-02',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('BlogPosting')
        expect(jsonLd.datePublished).toBe('2024-01-01')
        expect(jsonLd.dateModified).toBe('2024-01-02')
    })

    it('should emit author as array with @id reference for BlogPosting (default sole author)', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('BlogPosting')
        expect(Array.isArray(jsonLd.author)).toBe(true)
        expect(jsonLd.author).toHaveLength(1)
        expect(jsonLd.author[0]['@id']).toBe(PERSON_ID)
        expect(jsonLd.author[0]['@type']).toBe('Person')
        // Named inline as well as referenced: an engine parsing one article alone must see the author.
        expect(jsonLd.author[0].name).toBe(personName)
    })

    it('should emit author array with co-author inline Person for BlogPosting', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                authors: [
                    {
                        name: 'Co-author',
                        sameAs: ['https://example.com/co-author'],
                        url: 'https://example.com/co-author',
                    },
                    'lauri',
                ],
                createdAt: '2024-01-01',
                title: 'Co-authored Post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('BlogPosting')
        expect(Array.isArray(jsonLd.author)).toBe(true)
        expect(jsonLd.author).toHaveLength(2)
        expect(jsonLd.author[0]['@type']).toBe('Person')
        expect(jsonLd.author[0].name).toBe('Co-author')
        expect(jsonLd.author[0].url).toBe('https://example.com/co-author')
        expect(jsonLd.author[0]['@id']).toBeUndefined()
        expect(jsonLd.author[1]['@id']).toBe(PERSON_ID)
        expect(jsonLd.author[1].name).toBe(personName)
    })

    it('should emit one article:author meta for sole-author BlogPosting', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const metas = Array.from(result.querySelectorAll('meta[property="article:author"]'))
        expect(metas).toHaveLength(1)
        expect(metas[0].getAttribute('content')).toBe('Lauri Lavanti')
    })

    it('should emit multiple article:author metas for co-authored BlogPosting', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                authors: [{ name: 'Co-author' }, 'lauri'],
                createdAt: '2024-01-01',
                title: 'Co-authored Post',
                type: 'BlogPosting',
            },
        })

        const metas = Array.from(result.querySelectorAll('meta[property="article:author"]'))
        expect(metas).toHaveLength(2)
        const contents = metas.map((m) => m.getAttribute('content'))
        expect(contents).toContain('Co-author')
        expect(contents).toContain('Lauri Lavanti')
    })

    it('should emit a secondary FAQPage JSON-LD script when faq has 2 or more entries', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                faq: [
                    { a: 'Answer one.', q: 'Question one?' },
                    { a: 'Answer two.', q: 'Question two?' },
                ],
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        expect(scripts).toHaveLength(2)

        const faqScript = Array.from(scripts).find((s) => {
            const parsed = JSON.parse(s.textContent || '{}')

            return parsed['@type'] === 'FAQPage'
        })
        expect(faqScript).toBeDefined()

        const faqJsonLd = JSON.parse(faqScript?.textContent || '{}')
        expect(faqJsonLd['@context']).toBe('https://schema.org')
        expect(faqJsonLd['@type']).toBe('FAQPage')
        expect(faqJsonLd.mainEntity).toHaveLength(2)
        expect(faqJsonLd.mainEntity[0]['@type']).toBe('Question')
        expect(faqJsonLd.mainEntity[0].name).toBe('Question one?')
        expect(faqJsonLd.mainEntity[0].acceptedAnswer['@type']).toBe('Answer')
        expect(faqJsonLd.mainEntity[0].acceptedAnswer.text).toBe('Answer one.')
    })

    const confirmedEvent = {
        date: '2026-09-19',
        endTime: '17:00',
        id: 'confirmed',
        locales: {
            en: { description: 'English body.', locality: 'Espoo', title: 'Confirmed event', venue: 'Venue one' },
            fi: { description: 'Suomeksi.', locality: 'Espoo', title: 'Vahvistettu tapahtuma', venue: 'Paikka yksi' },
            sv: { description: 'PÅ svenska.', locality: 'Esbo', title: 'Bekräftat evenemang', venue: 'Plats ett' },
        },
        postalCode: '02230',
        startTime: '15:00',
        streetAddress: 'Piispansilta 11',
        topicConfirmed: true,
    }

    const openEvent = {
        date: '2026-11-30',
        id: 'open',
        locales: {
            en: { description: 'English body.', locality: 'Kirkkonummi', title: 'Open event', venue: 'Venue two' },
            fi: { description: 'Suomeksi.', locality: 'Kirkkonummi', title: 'Avoin tapahtuma', venue: 'Paikka kaksi' },
            sv: { description: 'PÅ svenska.', locality: 'Kyrkslätt', title: 'Öppet evenemang', venue: 'Plats två' },
        },
        postalCode: '02400',
        streetAddress: 'Kirkkotori 1',
        topicConfirmed: false,
    }

    /** One script per event, so the Event blocks are picked out by @type. */
    const eventScripts = (root: ParentNode) =>
        Array.from(root.querySelectorAll('script[type="application/ld+json"]'))
            .map((s) => JSON.parse(s.textContent || '{}'))
            .filter((parsed) => parsed['@type'] === 'Event')

    it('should emit a sibling Event JSON-LD script for events whose topic is confirmed', async () => {
        const result = await renderAstroComponent(Head, {
            props: { events: [confirmedEvent, openEvent], lang: 'fi', slug: 'fi/eduskuntavaalit', title: 'Vaalit' },
        })

        const parsed = eventScripts(result)
        expect(parsed).toHaveLength(1)
        expect(parsed[0]['@context']).toBe('https://schema.org')
        expect(parsed[0]['@type']).toBe('Event')
        expect(parsed[0].name).toBe('Vahvistettu tapahtuma')
        expect(parsed[0].startDate).toBe('2026-09-19T15:00:00+03:00')
        expect(parsed[0].endDate).toBe('2026-09-19T17:00:00+03:00')
        expect(parsed[0].location['@type']).toBe('Place')
        expect(parsed[0].location.address.addressLocality).toBe('Espoo')
        expect(parsed[0].location.address.streetAddress).toBe('Piispansilta 11')
        expect(parsed[0].organizer['@type']).toBe('Person')
    })

    it('should keep the primary JSON-LD type when events are present', async () => {
        const result = await renderAstroComponent(Head, {
            props: { events: [confirmedEvent], slug: 'fi/eduskuntavaalit', title: 'Vaalit', type: 'WebPage' },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        expect(scripts).toHaveLength(2)
        expect(JSON.parse(scripts[0].textContent || '{}')['@type']).toBe('WebPage')
    })

    it('should localise the Event JSON-LD to the page language', async () => {
        const result = await renderAstroComponent(Head, {
            props: { events: [confirmedEvent], lang: 'sv', slug: 'sv/riksdagsvalet', title: 'Valet' },
        })

        const parsed = eventScripts(result)
        expect(parsed[0].name).toBe('Bekräftat evenemang')
        expect(parsed[0].location.address.addressLocality).toBe('Esbo')
    })

    it('should omit an event whose topic is not confirmed', async () => {
        const result = await renderAstroComponent(Head, {
            props: { events: [openEvent], slug: 'fi/eduskuntavaalit', title: 'Vaalit' },
        })

        expect(eventScripts(result)).toHaveLength(0)
    })

    it('should not emit an Event JSON-LD script when no events are passed', async () => {
        const result = await renderAstroComponent(Head, { props: { slug: 'fi/eduskuntavaalit', title: 'Vaalit' } })

        expect(eventScripts(result)).toHaveLength(0)
    })

    it('should not emit a FAQPage JSON-LD script when faq has fewer than 2 entries', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                faq: [{ a: 'Answer one.', q: 'Question one?' }],
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        expect(scripts).toHaveLength(1)

        const faqScript = Array.from(scripts).find((s) => {
            const parsed = JSON.parse(s.textContent || '{}')

            return parsed['@type'] === 'FAQPage'
        })
        expect(faqScript).toBeUndefined()
    })

    it('should keep BlogPosting as primary JSON-LD type when faq is present', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2025-01-01',
                faq: [
                    { a: 'Answer one.', q: 'Question one?' },
                    { a: 'Answer two.', q: 'Question two?' },
                ],
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        const jsonLdItems = Array.from(scripts).map((s) => JSON.parse(s.textContent || '{}'))

        const primarySchema = jsonLdItems.find((j) => j['@type'] === 'BlogPosting')
        expect(primarySchema).toBeDefined()
        expect(primarySchema?.datePublished).toBe('2025-01-01')

        const faqSchema = jsonLdItems.find((j) => j['@type'] === 'FAQPage')
        expect(faqSchema).toBeDefined()
    })

    it('should set author meta tag', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        const authorMeta = result.querySelector('meta[name="author"]')
        expect(authorMeta).toHaveAttribute('content', 'Lauri Lavanti')
    })

    it('should set twitter card to summary when no image provided', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        const twitterCard = result.querySelector('meta[name="twitter:card"]')
        expect(twitterCard).toHaveAttribute('content', 'summary')
    })

    it('should not set canonical link when no slug provided', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Test Page',
            },
        })

        expect(result.querySelector('link[rel="canonical"]')).toBeNull()
        expect(result.querySelector('meta[property="og:url"]')).toBeNull()
    })

    it('should set WebSite JSON-LD when type is WebSite', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Home',
                type: 'WebSite',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('WebSite')
        expect(jsonLd.sameAs).toBeDefined()
    })

    it('should fall back dateModified to createdAt when updatedAt is absent', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-06-01',
                title: 'Blog post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.dateModified).toBe('2024-06-01')
        expect(jsonLd.datePublished).toBe('2024-06-01')
    })

    it('should emit article:modified_time meta when BlogPosting has updatedAt', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Blog post',
                type: 'BlogPosting',
                updatedAt: '2024-06-01',
            },
        })

        const meta = result.querySelector('meta[property="article:modified_time"]')
        expect(meta).toBeDefined()
        expect(meta?.getAttribute('content')).toBe('2024-06-01')
    })

    it('should not emit article:modified_time meta when BlogPosting has no updatedAt', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Blog post',
                type: 'BlogPosting',
            },
        })

        const meta = result.querySelector('meta[property="article:modified_time"]')
        expect(meta).toBeNull()
    })

    it('should not emit article:modified_time meta for non-article pages', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Some page',
                updatedAt: '2024-06-01',
            },
        })

        const meta = result.querySelector('meta[property="article:modified_time"]')
        expect(meta).toBeNull()
    })

    it('should set Person JSON-LD when type is Person', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'fi',
                title: 'Lauri Lavanti',
                type: 'Person',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('Person')
        expect(jsonLd['@id']).toBe(PERSON_ID)
        expect(jsonLd.name).toBe('Lauri Lavanti')
        expect(jsonLd.givenName).toBe('Lauri')
        expect(jsonLd.familyName).toBe('Lavanti')
        expect(jsonLd.url).toBe('https://lavanti.fi/fi/')
        expect(jsonLd.email).toBe('lauri@lavanti.fi')
        expect(jsonLd.telephone).toBe('+358407617605')
        expect(jsonLd.birthDate).toBe('1991-10-01')
        expect(jsonLd.birthPlace).toEqual({ '@type': 'Place', name: 'Jyväskylä' })
        expect(jsonLd.nationality).toEqual({ '@type': 'Country', name: 'FI' })
        expect(jsonLd.jobTitle).toBe(personJobTitle.fi)
        expect(jsonLd.sameAs).toHaveLength(socialUrls.length + REFERENCE_SAME_AS)
        expect(jsonLd.sameAs).toContain('https://fi.wikipedia.org/wiki/Lauri_Lavanti')
        expect(jsonLd.sameAs).toContain('https://www.wikidata.org/wiki/Q139711658')
        expect(jsonLd.sameAs).not.toContain('https://digitaalinenitsenaisyys.fi/')
        expect(jsonLd.memberOf['@type']).toBe('PoliticalParty')
        expect(jsonLd.memberOf.name).toBe('Vihreä liitto')
        expect(jsonLd.memberOf.url).toBe('https://www.vihreat.fi')
        expect(jsonLd.knowsAbout).toHaveLength(15)
        expect(jsonLd.knowsAbout).toContain('Talouspolitiikka')
        expect(jsonLd.knowsAbout).toContain('Markkinavihreä')
        expect(jsonLd.worksFor).toEqual({ '@type': 'Organization', name: 'OP', url: 'https://www.op.fi/' })
        expect(jsonLd.alumniOf).toHaveLength(3)
        expect(jsonLd.hasOccupation).toHaveLength(3)
        expect(jsonLd.hasOccupation[0].name).toBe('Eduskuntavaaliehdokas')
        expect(jsonLd.hasOccupation[0].occupationLocation.name).toBe('Uudenmaan vaalipiiri')
        expect(jsonLd.knowsLanguage).toEqual(['fi', 'en', 'sv'])
        expect(jsonLd.affiliation).toHaveLength(1)
        expect(jsonLd.affiliation[0].url).toBe('https://digitaalinenitsenaisyys.fi/')
    })

    it('should localise Person jobTitle for English', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'en',
                title: 'Lauri Lavanti',
                type: 'Person',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.jobTitle).toBe(personJobTitle.en)
        expect(jsonLd.knowsAbout).toContain('Economic policy')
        expect(jsonLd.knowsAbout).not.toContain('Talouspolitiikka')
    })

    it('should localise Person jobTitle for Swedish', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'sv',
                title: 'Lauri Lavanti',
                type: 'Person',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.jobTitle).toBe(personJobTitle.sv)
        expect(jsonLd.knowsAbout).toContain('Ekonomisk politik')
        expect(jsonLd.knowsAbout).not.toContain('Talouspolitiikka')
    })

    it('should emit ProfilePage JSON-LD with mainEntity Person when type is ProfilePage', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'fi',
                title: 'Lauri Lavanti',
                type: 'ProfilePage',
                updatedAt: '2025-01-01',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('ProfilePage')
        expect(jsonLd.dateModified).toBe('2025-01-01')
        expect(jsonLd.mainEntity).toBeDefined()
        expect(jsonLd.mainEntity['@type']).toBe('Person')
        expect(jsonLd.mainEntity['@id']).toBe(PERSON_ID)
        expect(jsonLd.mainEntity.name).toBe('Lauri Lavanti')
        expect(jsonLd.mainEntity.sameAs).toHaveLength(socialUrls.length + REFERENCE_SAME_AS)
        expect(jsonLd.mainEntity.affiliation).toHaveLength(1)
    })

    it('should not emit author, headline, or license on ProfilePage JSON-LD', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'fi',
                title: 'Lauri Lavanti',
                type: 'ProfilePage',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('ProfilePage')
        expect(jsonLd.author).toBeUndefined()
        expect(jsonLd.headline).toBeUndefined()
        expect(jsonLd.license).toBeUndefined()
    })

    it('should emit noindex robots meta tag when noindex is true', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                noindex: true,
                title: 'Hidden Page',
            },
        })

        const robotsMeta = result.querySelector('meta[name="robots"]')
        expect(robotsMeta).not.toBeNull()
        expect(robotsMeta).toHaveAttribute('content', 'noindex, nofollow')
    })

    it('should not emit robots meta tag when noindex is false', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Visible Page',
            },
        })

        expect(result.querySelector('meta[name="robots"]')).toBeNull()
    })

    it('should not emit canonical or hreflang links when noindex is true', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                noindex: true,
                slug: 'fi/recommendations',
                title: 'Hidden Page',
            },
        })

        expect(result.querySelector('link[rel="canonical"]')).toBeNull()
        expect(result.querySelector('link[rel="alternate"][hreflang]')).toBeNull()
    })

    it('should emit two og:locale:alternate tags for fi page (en_GB, sv_SE)', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'fi',
                title: 'Blogi',
            },
        })

        const alts = Array.from(result.querySelectorAll('meta[property="og:locale:alternate"]'))
        expect(alts).toHaveLength(2)
        const contents = alts.map((el) => el.getAttribute('content'))
        expect(contents).toContain('en_GB')
        expect(contents).toContain('sv_SE')
        expect(contents).not.toContain('fi_FI')
    })

    it('should emit two og:locale:alternate tags for en page (fi_FI, sv_SE)', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'en',
                title: 'Blog',
            },
        })

        const alts = Array.from(result.querySelectorAll('meta[property="og:locale:alternate"]'))
        expect(alts).toHaveLength(2)
        const contents = alts.map((el) => el.getAttribute('content'))
        expect(contents).toContain('fi_FI')
        expect(contents).toContain('sv_SE')
        expect(contents).not.toContain('en_GB')
    })

    it('should not emit og:locale:alternate tags when noindex is true', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'fi',
                noindex: true,
                title: 'Hidden Page',
            },
        })

        const alts = result.querySelectorAll('meta[property="og:locale:alternate"]')
        expect(alts).toHaveLength(0)
    })

    it('should emit BreadcrumbList JSON-LD for a blog post (3 items)', async () => {
        const breadcrumbs = [
            { name: 'Etusivu', url: 'https://lavanti.fi/fi/' },
            { name: 'Blogi', url: 'https://lavanti.fi/fi/blog/' },
            { name: 'Testijulkaisu', url: 'https://lavanti.fi/fi/blog/1/testijulkaisu/' },
        ]

        const result = await renderAstroComponent(Head, {
            props: {
                breadcrumbs,
                title: 'Testijulkaisu',
                type: 'BlogPosting',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        const jsonLdItems = Array.from(scripts).map((s) => JSON.parse(s.textContent || '{}'))

        const breadcrumbSchema = jsonLdItems.find((j) => j['@type'] === 'BreadcrumbList')
        expect(breadcrumbSchema).toBeDefined()
        expect(breadcrumbSchema?.['@context']).toBe('https://schema.org')
        expect(breadcrumbSchema?.itemListElement).toHaveLength(3)
        expect(breadcrumbSchema?.itemListElement[0]).toEqual({
            '@type': 'ListItem',
            item: 'https://lavanti.fi/fi/',
            name: 'Etusivu',
            position: 1,
        })
        expect(breadcrumbSchema?.itemListElement[1]).toEqual({
            '@type': 'ListItem',
            item: 'https://lavanti.fi/fi/blog/',
            name: 'Blogi',
            position: 2,
        })
        expect(breadcrumbSchema?.itemListElement[2]).toEqual({
            '@type': 'ListItem',
            item: 'https://lavanti.fi/fi/blog/1/testijulkaisu/',
            name: 'Testijulkaisu',
            position: 3,
        })
    })

    it('should emit BreadcrumbList JSON-LD for a tag page (2 items)', async () => {
        const breadcrumbs = [
            { name: 'Etusivu', url: 'https://lavanti.fi/fi/' },
            { name: 'Kategoria', url: 'https://lavanti.fi/fi/category/tekoaly/' },
        ]

        const result = await renderAstroComponent(Head, {
            props: {
                breadcrumbs,
                title: 'Tekoäly',
                type: 'CollectionPage',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        const jsonLdItems = Array.from(scripts).map((s) => JSON.parse(s.textContent || '{}'))

        const breadcrumbSchema = jsonLdItems.find((j) => j['@type'] === 'BreadcrumbList')
        expect(breadcrumbSchema).toBeDefined()
        expect(breadcrumbSchema?.itemListElement).toHaveLength(2)
        expect(breadcrumbSchema?.itemListElement[0].position).toBe(1)
        expect(breadcrumbSchema?.itemListElement[1].position).toBe(2)
    })

    it('should not emit BreadcrumbList when breadcrumbs prop is absent', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'No breadcrumbs',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        const jsonLdItems = Array.from(scripts).map((s) => JSON.parse(s.textContent || '{}'))
        const breadcrumbSchema = jsonLdItems.find((j) => j['@type'] === 'BreadcrumbList')
        expect(breadcrumbSchema).toBeUndefined()
    })

    it('should not emit BreadcrumbList when breadcrumbs has fewer than 2 items', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                breadcrumbs: [{ name: 'Etusivu', url: 'https://lavanti.fi/fi/' }],
                title: 'Single breadcrumb',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        const jsonLdItems = Array.from(scripts).map((s) => JSON.parse(s.textContent || '{}'))
        const breadcrumbSchema = jsonLdItems.find((j) => j['@type'] === 'BreadcrumbList')
        expect(breadcrumbSchema).toBeUndefined()
    })

    it('should localise BreadcrumbList labels correctly for English', async () => {
        const breadcrumbs = [
            { name: 'Home', url: 'https://lavanti.fi/en/' },
            { name: 'Blog', url: 'https://lavanti.fi/en/blog/' },
            { name: 'Test post', url: 'https://lavanti.fi/en/blog/1/test-post/' },
        ]

        const result = await renderAstroComponent(Head, {
            props: {
                breadcrumbs,
                lang: 'en',
                title: 'Test post',
                type: 'BlogPosting',
            },
        })

        const scripts = result.querySelectorAll('script[type="application/ld+json"]')
        const jsonLdItems = Array.from(scripts).map((s) => JSON.parse(s.textContent || '{}'))
        const breadcrumbSchema = jsonLdItems.find((j) => j['@type'] === 'BreadcrumbList')
        expect(breadcrumbSchema?.itemListElement[0].name).toBe('Home')
        expect(breadcrumbSchema?.itemListElement[1].name).toBe('Blog')
    })

    it('should accept langAlternates prop without error', async () => {
        const langAlternates = {
            en: '/en/blog/10/sote-is-the-cornerstone-of-the-welfare-society/',
            fi: '/fi/blog/10/sote-on-hyvinvointiyhteiskunnan-kulmakivi/',
            sv: '/sv/blog/10/sote-ar-valfardssallets-hordsten/',
        }

        const result = await renderAstroComponent(Head, {
            props: {
                lang: 'fi',
                langAlternates,
                noindex: true,
                title: 'Sote',
            },
        })

        expect(result).toBeDefined()
    })

    it('should emit ImageObject for image and primaryImageOfPage in BlogPosting JSON-LD when ogImage is set', async () => {
        const ogImage = 'https://res.cloudinary.com/example/image/upload/v1/test.jpg'
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                ogImage,
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('BlogPosting')
        expect(jsonLd.image['@type']).toBe('ImageObject')
        expect(jsonLd.image.url).toBe(ogImage)
        expect(jsonLd.image.width).toBe(1200)
        expect(jsonLd.image.height).toBe(630)
        expect(jsonLd.primaryImageOfPage['@type']).toBe('ImageObject')
        expect(jsonLd.primaryImageOfPage.url).toBe(ogImage)
        expect(jsonLd.primaryImageOfPage.width).toBe(1200)
        expect(jsonLd.primaryImageOfPage.height).toBe(630)
    })

    it('should not emit image or primaryImageOfPage in BlogPosting JSON-LD when ogImage is absent', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('BlogPosting')
        expect(jsonLd.image).toBeUndefined()
        expect(jsonLd.primaryImageOfPage).toBeUndefined()
    })

    it('should emit bare string image and no primaryImageOfPage for non-BlogPosting type with ogImage', async () => {
        const ogImage = 'https://res.cloudinary.com/example/image/upload/v1/test.jpg'
        const result = await renderAstroComponent(Head, {
            props: {
                ogImage,
                title: 'Home',
                type: 'WebSite',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('WebSite')
        expect(jsonLd.image).toBe(ogImage)
        expect(typeof jsonLd.image).toBe('string')
        expect(jsonLd.primaryImageOfPage).toBeUndefined()
    })

    it('should not emit image for non-BlogPosting type when ogImage is absent', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                title: 'Home',
                type: 'WebSite',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd['@type']).toBe('WebSite')
        expect(jsonLd.image).toBeUndefined()
    })

    it('should not affect datePublished, dateModified, or mainEntityOfPage when BlogPosting has ogImage', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-03-01',
                ogImage: 'https://res.cloudinary.com/example/image/upload/v1/test.jpg',
                title: 'Test Blog Post',
                type: 'BlogPosting',
                updatedAt: '2024-06-01',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.datePublished).toBe('2024-03-01')
        expect(jsonLd.dateModified).toBe('2024-06-01')
        expect(jsonLd.mainEntityOfPage['@type']).toBe('WebPage')
    })

    it('should emit inLanguage on BlogPosting and mainEntityOfPage JSON-LD', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                lang: 'fi',
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.inLanguage).toBe('fi')
        expect(jsonLd.mainEntityOfPage.inLanguage).toBe('fi')
    })

    it('should emit wordCount in BlogPosting JSON-LD when provided', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Test Blog Post',
                type: 'BlogPosting',
                wordCount: 850,
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.wordCount).toBe(850)
    })

    it('should not emit wordCount in BlogPosting JSON-LD when absent', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const jsonLdScript = result.querySelector('script[type="application/ld+json"]')
        const jsonLd = JSON.parse(jsonLdScript?.textContent || '{}')
        expect(jsonLd.wordCount).toBeUndefined()
    })

    it('should emit article:section and article:tag meta tags for BlogPosting with tags', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                createdAt: '2024-01-01',
                tags: ['kirkkonummi', 'lansirata', 'kuntavaalit2025'],
                title: 'Test Blog Post',
                type: 'BlogPosting',
            },
        })

        const section = result.querySelector('meta[property="article:section"]')
        expect(section?.getAttribute('content')).toBe('kirkkonummi')

        const tagMetas = Array.from(result.querySelectorAll('meta[property="article:tag"]'))
        expect(tagMetas).toHaveLength(3)
        const contents = tagMetas.map((m) => m.getAttribute('content'))
        expect(contents).toContain('kirkkonummi')
        expect(contents).toContain('lansirata')
        expect(contents).toContain('kuntavaalit2025')
    })

    it('should not emit article:section or article:tag for non-article pages', async () => {
        const result = await renderAstroComponent(Head, {
            props: {
                tags: ['kirkkonummi'],
                title: 'Some Page',
            },
        })

        expect(result.querySelector('meta[property="article:section"]')).toBeNull()
        expect(result.querySelector('meta[property="article:tag"]')).toBeNull()
    })
})
