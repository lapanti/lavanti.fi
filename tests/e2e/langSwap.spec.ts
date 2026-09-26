import test from '@playwright/test'

import { LangSwapPage } from './pages/langSwapPage'

test.describe('Language swap links', () => {
    test('swap from fi/laurista to sv/om-lauri and en/about', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/fi/laurista/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkSv)).toBe('/sv/om-lauri/')
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkEn)).toBe('/en/about/')
    })

    test('swap from sv/om-lauri to fi/laurista and en/about', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/sv/om-lauri/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkFi)).toBe('/fi/laurista/')
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkEn)).toBe('/en/about/')
    })

    test('swap from en/about to fi/laurista and sv/om-lauri', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/en/about/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkFi)).toBe('/fi/laurista/')
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkSv)).toBe('/sv/om-lauri/')
    })

    test('swap from fi/eduskuntavaalit/vaalirahoitus to the sv and en finance pages', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/fi/eduskuntavaalit/vaalirahoitus/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkSv)).toBe(
            '/sv/riksdagsvalet/valfinansiering/'
        )
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkEn)).toBe('/en/elections/campaign-finance/')
    })

    test('swap from en/elections/campaign-finance to the fi and sv finance pages', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/en/elections/campaign-finance/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkFi)).toBe(
            '/fi/eduskuntavaalit/vaalirahoitus/'
        )
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkSv)).toBe(
            '/sv/riksdagsvalet/valfinansiering/'
        )
    })

    test('swap from fi/blog/ to sv/blog/ and en/blog/', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/fi/blog/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkSv)).toBe('/sv/blog/')
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkEn)).toBe('/en/blog/')
    })

    test('swap from a fi blog post resolves translated slugs', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/fi/blog/10/sote-on-hyvinvointiyhteiskunnan-kulmakivi/')

        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkSv)).toBe(
            '/sv/blog/10/sote-ar-valfardssallets-hordsten/'
        )
        test.expect(await langSwapPage.getLangLinkHref(langSwapPage.langLinkEn)).toBe(
            '/en/blog/10/sote-is-the-cornerstone-of-the-welfare-society/'
        )
    })

    test('clicking the sv lang link on fi/laurista navigates to sv/om-lauri', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/fi/laurista/')

        if (langSwapPage.isMobile) {
            await langSwapPage.openMainNavigation()
        }

        await langSwapPage.langLinkSv.click()
        await test.expect(page).toHaveURL('/sv/om-lauri/')
    })

    test('clicking the en lang link on fi/laurista navigates to en/about', async ({ page }) => {
        const langSwapPage = new LangSwapPage(page)
        await langSwapPage.goTo('/fi/laurista/')

        if (langSwapPage.isMobile) {
            await langSwapPage.openMainNavigation()
        }

        await langSwapPage.langLinkEn.click()
        await test.expect(page).toHaveURL('/en/about/')
    })
})
