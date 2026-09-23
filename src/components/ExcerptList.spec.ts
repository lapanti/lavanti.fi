import type { Post } from '../lib/posts'

import { getAllByRole } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'

const { getExcerptPosts } = vi.hoisted(() => ({ getExcerptPosts: vi.fn() }))
vi.mock('../lib/posts', () => ({ getExcerptPosts }))

const ExcerptList = (await import('./ExcerptList.astro')).default

/*
 * Meta renders tags as <ul><li> per post, so getAllByRole('listitem') would
 * count nested tag items too. Count direct children of the outer <ul> instead.
 */
const countPosts = (result: HTMLElement): number => result.querySelector('ul')!.children.length

const makePost = (overrides: Partial<Post>): Post =>
    ({
        alt: 'alt',
        description: 'description',
        entry: {} as Post['entry'],
        heroImage: 'hero',
        id: 1,
        lang: 'fi',
        pageTitle: 'Page title',
        publishDate: '2024-01-01',
        readingTime: 1,
        slug: 'slug',
        tags: [],
        title: 'Title',
        updatedDate: '2024-01-01',
        url: '/fi/blog/1/slug/',
        wordCount: 100,
        ...overrides,
    }) as Post

describe('<ExcerptList />', () => {
    it('renders a <ul> with one item per returned post', async () => {
        getExcerptPosts.mockResolvedValue([makePost({ id: 1 }), makePost({ id: 2 }), makePost({ id: 3 })])

        const result = await renderAstroComponent(ExcerptList, { props: { lang: 'fi' } })

        expect(result.querySelector('ul')).not.toBeNull()
        expect(countPosts(result)).toBe(3)
    })

    it('renders zero items when getExcerptPosts returns nothing', async () => {
        getExcerptPosts.mockResolvedValue([])

        const result = await renderAstroComponent(ExcerptList, { props: { lang: 'fi' } })

        expect(countPosts(result)).toBe(0)
    })

    it('passes lang, currentSlug, tag, limit, onlyIds, excludeIds, rankedIds and relatedTags through to getExcerptPosts', async () => {
        getExcerptPosts.mockResolvedValue([])

        await renderAstroComponent(ExcerptList, {
            props: {
                currentSlug: 'current',
                excludeIds: [4],
                lang: 'en',
                limit: 2,
                onlyIds: [1, 2],
                rankedIds: [2, 1],
                relatedTags: ['kirkkonummi'],
                tag: 'freedom',
            },
        })

        expect(getExcerptPosts).toHaveBeenCalledWith({
            currentSlug: 'current',
            excludeIds: [4],
            lang: 'en',
            limit: 2,
            onlyIds: [1, 2],
            rankedIds: [2, 1],
            relatedTags: ['kirkkonummi'],
            tag: 'freedom',
        })
    })

    it('defaults lang to fi when not provided', async () => {
        getExcerptPosts.mockResolvedValue([])

        await renderAstroComponent(ExcerptList, { props: {} })

        expect(getExcerptPosts).toHaveBeenCalledWith(expect.objectContaining({ lang: 'fi' }))
    })

    it('renders each post title as the article aria-label, in the order returned', async () => {
        getExcerptPosts.mockResolvedValue([makePost({ id: 2, title: 'Second' }), makePost({ id: 1, title: 'First' })])

        const result = await renderAstroComponent(ExcerptList, { props: { lang: 'fi' } })

        const articles = getAllByRole(result, 'article')
        expect(articles.map((a) => a.getAttribute('aria-label'))).toEqual(['Second', 'First'])
    })
})
