import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

import { checkSiteImprove } from './helpers/siteimprove'
import { NewsletterArchivePage } from './pages/newsletterArchivePage'

test.describe('Newsletter Archive Page', () => {
    test('should render', async ({ page }) => {
        const archivePage = new NewsletterArchivePage(page)
        await archivePage.goTo()

        await archivePage.checkContent()
    })

    test('should match aria snapshot', async ({ page }) => {
        const archivePage = new NewsletterArchivePage(page)
        await archivePage.goTo()

        await test.expect(page.getByRole('main')).toMatchAriaSnapshot()
    })

    test('should pass accessibility test', async ({ page }) => {
        const archivePage = new NewsletterArchivePage(page)
        await archivePage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass siteimprove check', async ({ page }) => {
        const archivePage = new NewsletterArchivePage(page)
        await archivePage.goTo()

        await checkSiteImprove(page)
    })

    test('should match screenshot', async ({ page }) => {
        const archivePage = new NewsletterArchivePage(page)
        await archivePage.goTo()

        await test.expect(page).toHaveScreenshot()
    })
})
