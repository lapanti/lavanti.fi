import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

import { checkSiteImprove } from './helpers/siteimprove'
import { TagPage } from './pages/tagPage'

test.describe('Tag Page', () => {
    test('should render', async ({ page }) => {
        const tagPage = new TagPage(page)
        await tagPage.goTo()

        await tagPage.checkContent()
    })

    test('should render the start-here, related-topics and FAQ plates with FAQPage JSON-LD', async ({ page }) => {
        const tagPage = new TagPage(page)
        await tagPage.goTo()

        await tagPage.checkRichContent()
    })

    test('should match aria snapshot', async ({ page }) => {
        const tagPage = new TagPage(page)
        await tagPage.goTo()

        await test.expect(page.getByRole('main')).toMatchAriaSnapshot()
    })

    test('should pass accessibility test', async ({ page }) => {
        const tagPage = new TagPage(page)
        await tagPage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass siteimprove check', async ({ page }) => {
        const tagPage = new TagPage(page)
        await tagPage.goTo()

        await checkSiteImprove(page)
    })

    test('should match screenshot', async ({ page }) => {
        const tagPage = new TagPage(page)
        await tagPage.goTo()

        await test.expect(page.getByRole('main')).toHaveScreenshot()
    })
})
