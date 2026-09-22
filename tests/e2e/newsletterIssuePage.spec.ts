import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

import { checkSiteImprove } from './helpers/siteimprove'
import { NewsletterIssuePage } from './pages/newsletterIssuePage'

test.describe('Newsletter Issue Page', () => {
    test('should render', async ({ page }) => {
        const issuePage = new NewsletterIssuePage(page)
        await issuePage.goTo()

        await issuePage.checkContent()
    })

    test('should match aria snapshot', async ({ page }) => {
        const issuePage = new NewsletterIssuePage(page)
        await issuePage.goTo()

        await test.expect(page.getByRole('main')).toMatchAriaSnapshot()
    })

    test('should pass accessibility test', async ({ page }) => {
        const issuePage = new NewsletterIssuePage(page)
        await issuePage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass siteimprove check', async ({ page }) => {
        const issuePage = new NewsletterIssuePage(page)
        await issuePage.goTo()

        await checkSiteImprove(page)
    })

    test('should match screenshot', async ({ page }) => {
        const issuePage = new NewsletterIssuePage(page)
        await issuePage.goTo()

        await test.expect(page).toHaveScreenshot()
    })
})
