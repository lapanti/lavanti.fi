import type { Lang } from '../../content/nav'

import { sloganContent } from '../../content/slogan'
import { getCategoryPath, tags } from '../../content/tags'
import { newsletterSlug } from '../newsletterRoutes'
import { getAllNewsletters } from '../newsletters'
import { getAllPosts } from '../posts'
import { ogId } from './id'

/**
 * One generated OG card. `title` is the headline; `emphasis`, when present, is rendered
 * after it in bright green (mirroring SplitHero's `{title} <em>{emphasis}</em>`).
 * `photo`, when present, names a portrait file in src/lib/og/assets/ to use instead of
 * the default front-page portrait.
 */
export interface OgCard {
    emphasis?: string
    id: string
    lang: Lang
    photo?: string
    title: string
}

/**
 * heroImage frontmatter slug → committed OG portrait asset. Pages whose treated hero
 * has a copy in src/lib/og/assets/ get it on their card; everything else (front pages,
 * posts, categories, pages sharing the front-page hero) keeps the default portrait.
 * The treated heroes share one face metric, so a single objectPosition works for all.
 */
export const HERO_PORTRAITS: Record<string, string> = {
    'Lauri-Lavanti-dipolissa-kivimuurin-edessa-katse-kameraan-hero-pysty-v2': 'portrait-katse-kameraan.jpg',
    'Lauri-Lavanti-dipolissa-kivimuurin-edessa-mietteliaana-hero-pysty-v2': 'portrait-mietteliaana.jpg',
    'Lauri-Lavanti-graniittimuurin-edessa-kadet-puuskassa-hero-pysty-v2': 'portrait-graniittimuuri-kadet-puuskassa.jpg',
    'Lauri-Lavanti-graniittimuurin-edessa-kasi-taskussa-hero-pysty-v2': 'portrait-graniittimuuri-kasi-taskussa.jpg',
    'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-hero-pysty-v2': 'portrait-kerrostalopiha-kadet-taskuissa.jpg',
    'Lauri-Lavanti-kerrostalopihalla-lahikuva-hero-pysty-v2': 'portrait-kerrostalopiha-lahikuva.jpg',
    'Lauri-Lavanti-tyoskentelee-portailla-hero-pysty-v2': 'portrait-portailla.jpg',
}

const LANGS: Lang[] = ['fi', 'sv', 'en']

/**
 * Strip soft hyphens (U+00AD — authored into titles for on-page hyphenation, e.g.
 * "Tieto­suoja­seloste") and collapse whitespace, so the card renders clean text.
 */
export const cleanCardText = (text: string): string => text.replace(/­/g, '').replace(/\s+/g, ' ').trim()

interface PageFrontmatter {
    emphasis?: string
    heroImage?: string
    lang?: Lang
    noindex?: boolean
    ogEmphasis?: string
    ogTitle?: string
    slug?: string
    title?: string
}

/**
 * Frontmatter of every statically-routed MDX page (about, blog, contact, media,
 * newsletter, privacy-policy, recommendations, …). `import: 'frontmatter'` pulls only
 * the frontmatter export — not the page components — so importing this module into the
 * OG endpoint stays cheap and cycle-free.
 */
const pageFrontmatter = import.meta.glob<PageFrontmatter>('/src/pages/**/index.mdx', {
    eager: true,
    import: 'frontmatter',
})

let cache: Promise<OgCard[]> | undefined

/*
 * v8 ignore start -- build() calls getAllPosts()/getCollection(), which needs Astro's
 * content-layer store populated by a build/dev/sync; a plain vitest run can't trigger
 * that (see the same note in src/lib/posts.ts), so this is exercised by `npm run build`
 * and the dist-crawl guard instead.
 */
async function build(): Promise<OgCard[]> {
    const cards: OgCard[] = []

    /*
     * Front pages — headline is the campaign slogan (`title` is just "Lauri Lavanti",
     * which the wordmark already carries).
     */
    for (const lang of LANGS) {
        const { prefix, restingWord } = sloganContent[lang]
        cards.push({ emphasis: cleanCardText(restingWord), id: ogId(lang), lang, title: cleanCardText(prefix) })
    }

    /*
     * Static MDX pages. Front pages (slug === lang) are handled above; noindex pages
     * (e.g. the root language dispatcher) get no card.
     */
    for (const fm of Object.values(pageFrontmatter)) {
        if (!fm?.slug || !fm.lang || fm.noindex) continue
        if (LANGS.includes(fm.slug as Lang)) continue
        const title = cleanCardText(fm.ogTitle ?? fm.title ?? '')
        if (!title) continue
        const emphasis = fm.ogEmphasis ?? fm.emphasis
        cards.push({
            emphasis: emphasis ? cleanCardText(emphasis) : undefined,
            id: ogId(fm.slug),
            lang: fm.lang,
            photo: fm.heroImage ? HERO_PORTRAITS[fm.heroImage] : undefined,
            title,
        })
    }

    // Blog posts — per-locale title, optional per-locale ogTitle/ogEmphasis overrides.
    for (const post of await getAllPosts()) {
        const slug = `${post.lang}/blog/${post.id}/${post.slug}`
        cards.push({
            emphasis: post.ogEmphasis ? cleanCardText(post.ogEmphasis) : undefined,
            id: ogId(slug),
            lang: post.lang,
            title: cleanCardText(post.ogTitle ?? post.title),
        })
    }

    /*
     * Newsletter issues — same shape as posts. Embargoed issues are absent from
     * getAllNewsletters(), so no card leaks before the page itself does.
     */
    for (const issue of await getAllNewsletters()) {
        cards.push({
            emphasis: issue.ogEmphasis ? cleanCardText(issue.ogEmphasis) : undefined,
            id: ogId(newsletterSlug(issue.lang, issue.id, issue.slug)),
            lang: issue.lang,
            title: cleanCardText(issue.ogTitle ?? issue.title),
        })
    }

    // Category / tag pages — og id derives from the canonical (localised) path.
    for (const lang of LANGS) {
        for (const tag of tags) {
            cards.push({
                id: ogId(getCategoryPath(tag.id, lang)!.replace(/^\/|\/$/g, '')),
                lang,
                title: cleanCardText(tag.pageTitle[lang]),
            })
        }
    }

    return cards
}

export const getOgCards = (): Promise<OgCard[]> => (cache ??= build())
/* v8 ignore stop */
