import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

import { checkSiteImprove } from './helpers/siteimprove'
import { NotFoundPage } from './pages/notFoundPage'

test.describe('404 Not Found Page', () => {
    test('should render', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goTo()

        await notFoundPage.checkContent()
    })

    test('should match aria snapshot', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goTo()

        await test.expect(page.getByRole('main')).toMatchAriaSnapshot()
    })

    test('should pass accessibility test', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass siteimprove check', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goTo()

        await checkSiteImprove(page)
    })

    test('should match screenshot', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goTo()

        await test.expect(page).toHaveScreenshot()
    })
})

test.describe('404 localised by path', () => {
    /* Cloudflare Pages serves the nearest 404.html; astro preview only knows the root one. */
    test.skip(!process.env.E2E_URL, 'needs a Cloudflare Pages deployment')

    for (const { heading, lang, path } of [
        { heading: /^Sidan du letade efter/, lang: 'sv', path: '/sv/sidan-finns-inte/' },
        { heading: /^The page you were looking for/, lang: 'en', path: '/en/no-such-page/' },
    ]) {
        test(`answers a miss under /${lang}/ in ${lang} with a 404`, async ({ page }) => {
            const response = await page.goto(path)

            test.expect(response?.status()).toBe(404)
            await test.expect(page.locator('html')).toHaveAttribute('lang', lang)
            await test.expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
        })
    }
})

test.describe('404 wrong-slug blog redirect', () => {
    test('redirects fi blog post with wrong slug to canonical URL', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goToWrongBlogSlug('fi', 10, 'wrong-slug')

        await test.expect(page).toHaveURL('/fi/blog/10/sote-on-hyvinvointiyhteiskunnan-kulmakivi/')
    })

    test('does not redirect a fully unknown URL', async ({ page }) => {
        const notFoundPage = new NotFoundPage(page)
        await notFoundPage.goTo()

        await test.expect(page).toHaveURL('/this-page-does-not-exist/')
    })
})
