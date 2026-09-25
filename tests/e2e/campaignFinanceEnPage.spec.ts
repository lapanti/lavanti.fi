import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

import { checkSiteImprove } from './helpers/siteimprove'
import { CampaignFinanceEnPage } from './pages/campaignFinanceEnPage'

test.describe('Campaign Finance Page in English', () => {
    test('should render', async ({ page }) => {
        const financePage = new CampaignFinanceEnPage(page)
        await financePage.goTo()

        await financePage.checkContent()
    })

    test('should match aria snapshot', async ({ page }) => {
        const financePage = new CampaignFinanceEnPage(page)
        await financePage.goTo()

        await test.expect(page.getByRole('main')).toMatchAriaSnapshot()
    })

    test('should pass accessibility test', async ({ page }) => {
        const financePage = new CampaignFinanceEnPage(page)
        await financePage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should pass siteimprove check', async ({ page }) => {
        const financePage = new CampaignFinanceEnPage(page)
        await financePage.goTo()

        await checkSiteImprove(page)
    })

    test('should match screenshot', async ({ page }) => {
        const financePage = new CampaignFinanceEnPage(page)
        await financePage.goTo()

        await test.expect(page).toHaveScreenshot()
    })
})
