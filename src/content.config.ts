import { defineCollection, z } from 'astro:content'

import { localizedCollectionLoader } from './content/lib/postsLoader'
import { embargoLiftDate } from './lib/publishing'

const authorEntry = z.union([
    z.literal('lauri'),
    z.object({
        name: z.string(),
        role: z.string().optional(),
        sameAs: z.array(z.string()).optional(),
        url: z.string().optional(),
    }),
])

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)')

const externalPublication = z.object({
    date: z.string(),
    lang: z.enum(['fi', 'sv', 'en']).default('fi'),
    name: z.string(),
    url: z.string().optional(),
})

const posts = defineCollection({
    loader: localizedCollectionLoader({ base: './src/content/posts', name: 'posts-loader' }),
    schema: z.object({
        alt: z.string(),
        authors: z.array(authorEntry).optional(),
        description: z.string(),
        externalPublications: z.array(externalPublication).optional(),
        faq: z.array(z.object({ a: z.string(), q: z.string() })).optional(),
        heroImage: z.string(),
        id: z.number().int().positive(),
        lang: z.enum(['fi', 'sv', 'en']),
        ogEmphasis: z.string().optional(),
        ogTitle: z.string().optional(),
        pageTitle: z.string(),
        publishDate: isoDate,
        slug: z.string(),
        tags: z.array(z.string()).min(1),
        title: z.string(),
        updatedDate: isoDate,
    }),
})

/*
 * Public newsletter archive (.agents/specs/newsletter/archive.md). Same on-disk layout
 * as posts — {id}/meta.json + fi/sv/en.mdx — but no hero image and no tags, and the
 * publish date is derived: an issue goes public 42 days after it was emailed, so
 * publishDate must equal embargoLiftDate(sent). Hand-typing another date would either
 * shorten the subscribers' lead or hold a page back; the refine makes both a build error.
 */
const newsletters = defineCollection({
    loader: localizedCollectionLoader({ base: './src/content/newsletters', name: 'newsletters-loader' }),
    schema: z
        .object({
            description: z.string(),
            faq: z.array(z.object({ a: z.string(), q: z.string() })).optional(),
            id: z.number().int().positive(),
            lang: z.enum(['fi', 'sv', 'en']),
            ogEmphasis: z.string().optional(),
            ogTitle: z.string().optional(),
            pageTitle: z.string(),
            publishDate: isoDate,
            sent: isoDate,
            slug: z.string(),
            title: z.string(),
            updatedDate: isoDate,
        })
        .superRefine((data, ctx) => {
            // A malformed `sent` is already reported by isoDate; don't compound it with a RangeError.
            if (!/^\d{4}-\d{2}-\d{2}$/.test(data.sent)) return
            const expected = embargoLiftDate(data.sent)
            if (data.publishDate !== expected) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `publishDate must be sent + 42 days: expected ${expected}, got ${data.publishDate}`,
                    path: ['publishDate'],
                })
            }
        }),
})

export const collections = { newsletters, posts }
