import { test } from '@playwright/test'

import { AboutEnPage } from './pages/aboutEnPage'
import { AboutPage } from './pages/aboutPage'
import { AboutSwePage } from './pages/aboutSwePage'
import { BlogEnPage } from './pages/blogEnPage'
import { BlogPage } from './pages/blogPage'
import { BlogPostPage } from './pages/blogPostPage'
import { BlogSwePage } from './pages/blogSwePage'
import { ContactEnPage } from './pages/contactEnPage'
import { ContactPage } from './pages/contactPage'
import { ContactSwePage } from './pages/contactSwePage'
import { ElectionEnPage } from './pages/electionEnPage'
import { ElectionPage } from './pages/electionPage'
import { ElectionSwePage } from './pages/electionSwePage'
import { HomeEnPage } from './pages/homeEnPage'
import { HomePage } from './pages/homePage'
import { HomeSwePage } from './pages/homeSwePage'
import { NewsletterArchivePage } from './pages/newsletterArchivePage'
import { NewsletterEnPage } from './pages/newsletterEnPage'
import { NewsletterIssuePage } from './pages/newsletterIssuePage'
import { NewsletterPage } from './pages/newsletterPage'
import { NewsletterSwePage } from './pages/newsletterSwePage'
import { NotFoundPage } from './pages/notFoundPage'
import { RecommendationsEnPage } from './pages/recommendationsEnPage'
import { RecommendationsPage } from './pages/recommendationsPage'
import { RecommendationsSwePage } from './pages/recommendationsSwePage'
import { TagEnPage } from './pages/tagEnPage'
import { TagPage } from './pages/tagPage'
import { TagSwePage } from './pages/tagSwePage'

test.describe('Horizontal scroll on mobile', () => {
    test('home page (fi)', async ({ page }) => {
        const p = new HomePage(page)
        await p.goHome()
        await p.checkNoHorizontalScroll()
    })

    test('home page (en)', async ({ page }) => {
        const p = new HomeEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('home page (sv)', async ({ page }) => {
        const p = new HomeSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('about page (fi)', async ({ page }) => {
        const p = new AboutPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('about page (en)', async ({ page }) => {
        const p = new AboutEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('about page (sv)', async ({ page }) => {
        const p = new AboutSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('blog index (fi)', async ({ page }) => {
        const p = new BlogPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('blog index (en)', async ({ page }) => {
        const p = new BlogEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('blog index (sv)', async ({ page }) => {
        const p = new BlogSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('blog post (fi)', async ({ page }) => {
        const p = new BlogPostPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('blog post (en)', async ({ page }) => {
        const p = new BlogPostPage(page, '/en/blog/10/sote-is-the-cornerstone-of-the-welfare-society/')
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('blog post (sv)', async ({ page }) => {
        const p = new BlogPostPage(page, '/sv/blog/10/sote-ar-valfardssallets-hordsten/')
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('election page (fi)', async ({ page }) => {
        const p = new ElectionPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('election page (en)', async ({ page }) => {
        const p = new ElectionEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('election page (sv)', async ({ page }) => {
        const p = new ElectionSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('contact page (fi)', async ({ page }) => {
        const p = new ContactPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('contact page (en)', async ({ page }) => {
        const p = new ContactEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('contact page (sv)', async ({ page }) => {
        const p = new ContactSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter page (fi)', async ({ page }) => {
        const p = new NewsletterPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter page (en)', async ({ page }) => {
        const p = new NewsletterEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter page (sv)', async ({ page }) => {
        const p = new NewsletterSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter archive (fi)', async ({ page }) => {
        const p = new NewsletterArchivePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter archive (en)', async ({ page }) => {
        const p = new NewsletterArchivePage(page, '/en/newsletter/archive/')
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter archive (sv)', async ({ page }) => {
        const p = new NewsletterArchivePage(page, '/sv/nyhetsbrev/arkiv/')
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter issue (fi)', async ({ page }) => {
        const p = new NewsletterIssuePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter issue (en)', async ({ page }) => {
        const p = new NewsletterIssuePage(page, '/en/newsletter/1/ai-is-not-taking-your-job-but-it-is-changing-it/')
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('newsletter issue (sv)', async ({ page }) => {
        const p = new NewsletterIssuePage(page, '/sv/nyhetsbrev/1/ai-tar-inte-ditt-jobb-men-forandrar-det/')
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('tag page (fi)', async ({ page }) => {
        const p = new TagPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('tag page (en)', async ({ page }) => {
        const p = new TagEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('tag page (sv)', async ({ page }) => {
        const p = new TagSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('recommendations page (fi)', async ({ page }) => {
        const p = new RecommendationsPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('recommendations page (en)', async ({ page }) => {
        const p = new RecommendationsEnPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('recommendations page (sv)', async ({ page }) => {
        const p = new RecommendationsSwePage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })

    test('404 page', async ({ page }) => {
        const p = new NotFoundPage(page)
        await p.goTo()
        await p.checkNoHorizontalScroll()
    })
})
