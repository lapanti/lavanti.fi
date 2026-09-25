import type { APIRoute } from 'astro'

import { getTagName, tags } from '../content/tags'
import { getAllNewsletters, type Newsletter } from '../lib/newsletters'
import { getAllPosts, type Post } from '../lib/posts'
import { stripSoftHyphens } from '../lib/text'

const AI_TAG = 'artificial-intelligence'

/* Canonical URLs only (trailingSlash: 'always') — a listed URL must never round-trip a redirect. */
const PILLAR_LINKS = [
    { label: 'Etusivu', url: '/fi/' },
    { label: 'Eduskuntavaalit 2027', url: '/fi/eduskuntavaalit/' },
    { label: 'Vaalirahoitus', url: '/fi/eduskuntavaalit/vaalirahoitus/' },
    { label: 'Aiheet', url: '/fi/blog/' },
    { label: 'Laurista', url: '/fi/laurista/' },
    { label: 'Suositukset', url: '/fi/suositukset/' },
    { label: 'Uutiskirjeen arkisto', url: '/fi/uutiskirje/arkisto/' },
]

const linkLine = (entry: { title: string; url: string }, site: URL): string =>
    `- [${stripSoftHyphens(entry.title)}](${new URL(entry.url, site).href})`

/** @param newsletters — published archive issues; embargoed ones never reach here. */
export const buildLlmsTxt = (posts: Post[], site: URL, newsletters: Newsletter[] = []): string => {
    const fiPosts = posts.filter((p) => p.lang === 'fi')

    const tagIds = [
        AI_TAG,
        ...tags
            .map((t) => t.id)
            .filter((id) => id !== AI_TAG)
            .sort(),
    ]

    const tagSections = tagIds
        .map((id) => {
            const taggedPosts = fiPosts.filter((p) => p.tags.includes(id))
            if (taggedPosts.length === 0) return ''
            const name = stripSoftHyphens(getTagName(id, 'fi') ?? id)
            const links = taggedPosts.map((p) => linkLine(p, site)).join('\n')

            return `## ${name}\n\n${links}`
        })
        .filter(Boolean)
        .join('\n\n')

    // Newsletter issues get one section: they are tagless, so they never land under a tag above.
    const fiNewsletters = newsletters.filter((n) => n.lang === 'fi')
    const newsletterSection =
        fiNewsletters.length > 0 ? `## Uutiskirjeet\n\n${fiNewsletters.map((n) => linkLine(n, site)).join('\n')}` : ''

    const nonFi = [...posts, ...newsletters].filter((p) => p.lang !== 'fi')
    const multilingualLinks = nonFi.map((p) => linkLine(p, site)).join('\n')

    const pillarLinks = PILLAR_LINKS.map((l) => `- [${l.label}](${new URL(l.url, site).href})`).join('\n')

    return `\
# Lauri Lavanti

> Lauri Lavanti on Vihreiden eduskuntavaaliehdokas Uudenmaan vaalipiirissä, kirkkonummelainen kunnanvaltuutettu ja johtava ohjelmistokehittäjä, joka kirjoittaa teknologiasta, taloudesta ja yhteiskunnasta.

## Tärkeimmät sivut

${pillarLinks}

${[tagSections, newsletterSection].filter(Boolean).join('\n\n')}

## Muut kielet / Other languages / Andra språk

${multilingualLinks}
`
}

export const GET: APIRoute = async ({ site }) => {
    return new Response(buildLlmsTxt(await getAllPosts(), site!, await getAllNewsletters()))
}
