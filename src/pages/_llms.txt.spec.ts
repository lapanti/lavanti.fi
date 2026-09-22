import type { Newsletter } from '../lib/newsletters'
import type { Post } from '../lib/posts'

import { describe, expect, it } from 'vitest'

import { tags } from '../content/tags'
import { buildLlmsTxt } from './llms.txt'

const SITE = new URL('https://lavanti.fi')

const makePost = (overrides: Partial<Post>): Post =>
    ({
        alt: 'alt',
        description: 'description',
        entry: {} as Post['entry'],
        heroImage: 'hero',
        pageTitle: 'Page title',
        publishDate: '2024-01-01',
        readingTime: 1,
        updatedDate: '2024-01-01',
        wordCount: 100,
        ...overrides,
    }) as Post

/*
 * Deliberately pre-sorted newest-first per tag, matching what getAllPosts() produces —
 * buildLlmsTxt itself doesn't sort, it only filters, so this fixture's order IS the
 * thing under test for the "sorted newest-first" assertions below.
 */
const posts: Post[] = [
    makePost({
        id: 5,
        lang: 'fi',
        slug: 'ai-5',
        tags: ['artificial-intelligence'],
        title: 'AI post 5',
        url: '/fi/blog/5/ai-5/',
    }),
    makePost({
        id: 3,
        lang: 'fi',
        slug: 'ai-3',
        tags: ['artificial-intelligence'],
        title: 'AI post 3',
        url: '/fi/blog/3/ai-3/',
    }),
    makePost({
        id: 4,
        lang: 'fi',
        slug: 'kh-4',
        tags: ['kirkkonummi'],
        title: 'Kirkkonummi post 4',
        url: '/fi/blog/4/kh-4/',
    }),
    makePost({
        id: 2,
        lang: 'fi',
        slug: 'kh-2',
        tags: ['kirkkonummi'],
        title: 'Kirkkonummi post 2',
        url: '/fi/blog/2/kh-2/',
    }),
    makePost({
        id: 4,
        lang: 'sv',
        slug: 'kh-4-sv',
        tags: ['kirkkonummi'],
        title: 'Kirkkonummi post 4 sv',
        url: '/sv/blog/4/kh-4-sv/',
    }),
    makePost({
        id: 4,
        lang: 'en',
        slug: 'kh-4-en',
        tags: ['kirkkonummi'],
        title: 'Kirkkonummi post 4 en',
        url: '/en/blog/4/kh-4-en/',
    }),
]

const makeNewsletter = (overrides: Partial<Newsletter>): Newsletter =>
    ({
        description: 'description',
        entry: {} as Newsletter['entry'],
        pageTitle: 'Page title',
        publishDate: '2026-04-25',
        readingTime: 1,
        sent: '2026-03-14',
        updatedDate: '2026-04-25',
        wordCount: 100,
        ...overrides,
    }) as Newsletter

const newsletters: Newsletter[] = [
    makeNewsletter({ id: 1, lang: 'fi', slug: 'kirje-1', title: 'Uutiskirje 1', url: '/fi/uutiskirje/1/kirje-1/' }),
    makeNewsletter({ id: 1, lang: 'en', slug: 'issue-1', title: 'Issue 1', url: '/en/newsletter/1/issue-1/' }),
]

const content = buildLlmsTxt(posts, SITE, newsletters)

describe('buildLlmsTxt — header', () => {
    it('starts with H1 "# Lauri Lavanti"', () => {
        expect(content.startsWith('# Lauri Lavanti\n')).toBe(true)
    })

    it('contains the Finnish blockquote', () => {
        expect(content).toContain(
            '> Lauri Lavanti on Vihreiden eduskuntavaaliehdokas Uudenmaan vaalipiirissä, kirkkonummelainen kunnanvaltuutettu ja johtava ohjelmistokehittäjä, joka kirjoittaa teknologiasta, taloudesta ja yhteiskunnasta.'
        )
    })
})

describe('buildLlmsTxt — pillar pages section', () => {
    it('contains "## Tärkeimmät sivut" heading', () => {
        expect(content).toContain('## Tärkeimmät sivut')
    })

    it('links Etusivu to /fi/', () => {
        expect(content).toContain('[Etusivu](https://lavanti.fi/fi/)')
    })

    it('links Aiheet to the canonical /fi/blog/ (topics merged into blog, issue #1288)', () => {
        expect(content).toContain('[Aiheet](https://lavanti.fi/fi/blog/)')
    })

    it('links Laurista to /fi/laurista/ with trailing slash', () => {
        expect(content).toContain('[Laurista](https://lavanti.fi/fi/laurista/)')
    })

    it('links Suositukset to /fi/suositukset/ with trailing slash', () => {
        expect(content).toContain('[Suositukset](https://lavanti.fi/fi/suositukset/)')
    })

    it('links the newsletter archive', () => {
        expect(content).toContain('[Uutiskirjeen arkisto](https://lavanti.fi/fi/uutiskirje/arkisto/)')
    })

    it('lists no URL that would round-trip a redirect (all trailing-slash canonical)', () => {
        const urls = [...content.matchAll(/\[[^\]]+\]\((https:\/\/lavanti\.fi[^)]*)\)/g)].map((m) => m[1])
        const redirecting = urls.filter((u) => !u.endsWith('/') && !u.endsWith('.xml') && !u.endsWith('.txt'))
        expect(redirecting).toEqual([])
    })
})

describe('buildLlmsTxt — tag sections', () => {
    it('artificial-intelligence section appears before other tag sections', () => {
        const aiIdx = content.indexOf('## Tekoäly')
        const otherTagSections = tags
            .filter((t) => t.id !== 'artificial-intelligence')
            .map((t) => content.indexOf(`## ${t.names.fi}`))
            .filter((idx) => idx !== -1)

        expect(aiIdx).toBeGreaterThan(-1)
        for (const idx of otherTagSections) {
            expect(aiIdx).toBeLessThan(idx)
        }
    })

    it('all fixture Finnish posts appear under their tags', () => {
        const fiPosts = posts.filter((p) => p.lang === 'fi')
        for (const post of fiPosts) {
            for (const tag of post.tags) {
                const postUrl = new URL(post.url, SITE).href
                expect(content, `post "${post.title}" missing under tag "${tag}"`).toContain(
                    `[${post.title}](${postUrl})`
                )
            }
        }
    })

    it('posts within each tag section preserve getAllPosts() order (newest-first by publishDate)', () => {
        const sectionChunks = content.split(/\n(?=## )/)

        for (const tag of tags) {
            const tagPosts = posts.filter((p) => p.lang === 'fi' && p.tags.includes(tag.id))
            if (tagPosts.length < 2) continue

            const chunk = sectionChunks.find((c) => c.startsWith(`## ${tag.names.fi}\n`))
            if (!chunk) continue

            const positions = tagPosts.map((p) => ({ id: p.id, pos: chunk.indexOf(new URL(p.url, SITE).href) }))

            for (let i = 1; i < positions.length; i++) {
                if (positions[i - 1].pos === -1 || positions[i].pos === -1) continue
                expect(
                    positions[i - 1].pos,
                    `tag "${tag.id}": post id=${positions[i - 1].id} should appear before id=${positions[i].id}`
                ).toBeLessThan(positions[i].pos)
            }
        }
    })

    it('omits tag sections with zero Finnish posts', () => {
        const fiPosts = posts.filter((p) => p.lang === 'fi')
        const emptyTags = tags.filter((t) => fiPosts.every((p) => !p.tags.includes(t.id)))

        for (const tag of emptyTags) {
            expect(content).not.toContain(`## ${tag.names.fi}`)
        }
    })
})

describe('buildLlmsTxt — newsletter section', () => {
    it('lists Finnish issues under "## Uutiskirjeet" after the tag sections', () => {
        const section = content.slice(content.indexOf('## Uutiskirjeet'), content.indexOf('## Muut kielet'))
        expect(section).toContain('[Uutiskirje 1](https://lavanti.fi/fi/uutiskirje/1/kirje-1/)')
        expect(content.indexOf('## Uutiskirjeet')).toBeGreaterThan(content.indexOf('## Tekoäly'))
    })

    it('omits the section when no issue is published', () => {
        expect(buildLlmsTxt(posts, SITE)).not.toContain('## Uutiskirjeet')
    })

    it('lists non-Finnish issues in the multilingual section', () => {
        const multilingualSection = content.slice(content.indexOf('## Muut kielet'))
        expect(multilingualSection).toContain('[Issue 1](https://lavanti.fi/en/newsletter/1/issue-1/)')
    })
})

describe('buildLlmsTxt — multilingual section', () => {
    it('contains multilingual heading', () => {
        expect(content).toContain('## Muut kielet / Other languages / Andra språk')
    })

    it('all fixture English posts appear in multilingual section', () => {
        const enPosts = posts.filter((p) => p.lang === 'en')
        const multilingualSection = content.slice(content.indexOf('## Muut kielet'))

        for (const post of enPosts) {
            expect(multilingualSection, `EN post "${post.title}" missing`).toContain(
                `[${post.title}](${new URL(post.url, SITE).href})`
            )
        }
    })

    it('all fixture Swedish posts appear in multilingual section', () => {
        const svPosts = posts.filter((p) => p.lang === 'sv')
        const multilingualSection = content.slice(content.indexOf('## Muut kielet'))

        for (const post of svPosts) {
            expect(multilingualSection, `SV post "${post.title}" missing`).toContain(
                `[${post.title}](${new URL(post.url, SITE).href})`
            )
        }
    })
})
