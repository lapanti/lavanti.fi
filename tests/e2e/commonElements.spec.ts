import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

import { AboutEnPage } from './pages/aboutEnPage'
import { AboutPage } from './pages/aboutPage'
import { AboutSwePage } from './pages/aboutSwePage'

test.describe('Common page elements FI', () => {
    test('should match aria snapshot', async ({ page }) => {
        const aboutPage = new AboutPage(page)
        await aboutPage.goTo()

        await test.expect(page.getByRole('banner')).toMatchAriaSnapshot({ name: 'fi-banner.aria.yml' })
        await test.expect(page.getByRole('contentinfo')).toMatchAriaSnapshot({ name: 'fi-contentinfo.aria.yml' })
    })

    test('should pass accessibility test', async ({ page }) => {
        const aboutPage = new AboutPage(page)
        await aboutPage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should match screenshot', async ({ page }) => {
        const aboutPage = new AboutPage(page)
        await aboutPage.goTo()

        await test.expect(page.getByRole('banner')).toHaveScreenshot()
        await test.expect(page.getByRole('contentinfo')).toHaveScreenshot()
    })
})

test.describe('Common page elements EN', () => {
    test('should match aria snapshot', async ({ page }) => {
        const aboutPage = new AboutEnPage(page)
        await aboutPage.goTo()

        await test.expect(page.getByRole('banner')).toMatchAriaSnapshot({ name: 'en-banner.aria.yml' })
        await test.expect(page.getByRole('contentinfo')).toMatchAriaSnapshot({ name: 'en-contentinfo.aria.yml' })
    })

    test('should pass accessibility test', async ({ page }) => {
        const aboutPage = new AboutEnPage(page)
        await aboutPage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should match screenshot', async ({ page }) => {
        const aboutPage = new AboutEnPage(page)
        await aboutPage.goTo()

        await test.expect(page.getByRole('banner')).toHaveScreenshot()
        await test.expect(page.getByRole('contentinfo')).toHaveScreenshot()
    })
})

test.describe('Common page elements SV', () => {
    test('should match aria snapshot', async ({ page }) => {
        const aboutPage = new AboutSwePage(page)
        await aboutPage.goTo()

        await test.expect(page.getByRole('banner')).toMatchAriaSnapshot({ name: 'sv-banner.aria.yml' })
        await test.expect(page.getByRole('contentinfo')).toMatchAriaSnapshot({ name: 'sv-contentinfo.aria.yml' })
    })

    test('should pass accessibility test', async ({ page }) => {
        const aboutPage = new AboutSwePage(page)
        await aboutPage.goTo()

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should match screenshot', async ({ page }) => {
        const aboutPage = new AboutSwePage(page)
        await aboutPage.goTo()

        await test.expect(page.getByRole('banner')).toHaveScreenshot()
        await test.expect(page.getByRole('contentinfo')).toHaveScreenshot()
    })
})
