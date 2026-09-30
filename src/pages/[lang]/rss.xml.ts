import type { APIContext } from 'astro'
import type { Lang } from '../../content/nav'

import rss from '@astrojs/rss'

import { rssTitles } from '../../content/rss'
import { getImage } from '../../lib/images'
import { getAllPosts, getPostHtml } from '../../lib/posts'
import { stripSoftHyphens } from '../../lib/text'

const i18n: Record<Lang, { description: string; permalinkLabel: string }> = {
    en: {
        description: 'Blog posts by Lauri Lavanti',
        permalinkLabel: 'Permanent link to the blog post',
    },
    fi: {
        description: 'Lauri Lavannin blogikirjoitukset',
        permalinkLabel: 'Pysyvä linkki blogikirjoitukseen',
    },
    sv: {
        description: 'Lauri Lavantis blogginlägg',
        permalinkLabel: 'Permanent länk till blogginlägget',
    },
}

export function getStaticPaths() {
    const langs: Lang[] = ['fi', 'sv', 'en']

    return langs.map((lang) => ({ params: { lang } }))
}

export async function GET(context: APIContext) {
    const lang = context.params.lang as Lang
    const t = i18n[lang]
    const posts = (await getAllPosts()).filter((p) => p.lang === lang)

    const items = await Promise.all(
        posts.map(async (post) => {
            const absoluteUrl = new URL(post.url, context.site!).href
            const html = await getPostHtml(post)
            const content = html + `<p><a href="${absoluteUrl}">${t.permalinkLabel}</a></p>`
            const img = getImage(post.heroImage, 'og')

            return {
                content,
                customData: `<media:content url="${img.src}" medium="image" width="${img.width}" height="${img.height}"/>`,
                description: post.description,
                enclosure: { length: 0, type: 'image/jpeg', url: img.src },
                link: post.url,
                pubDate: new Date(post.publishDate),
                title: stripSoftHyphens(post.title),
            }
        })
    )

    return rss({
        description: t.description,
        items,
        site: context.site!,
        title: rssTitles[lang],
        xmlns: { media: 'http://search.yahoo.com/mrss/' },
    })
}
