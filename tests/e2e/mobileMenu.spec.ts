import test from '@playwright/test'

test.describe('Mobile menu', () => {
    test.beforeEach(({ isMobile }) => {
        test.skip(!isMobile, 'the popover menu only renders below 769px')
    })

    test('keeps closed links out of the tab order, opens, and closes on Escape', async ({ page }) => {
        await page.goto('/en/about/')
        const button = page.getByRole('banner').getByRole('button', { name: 'Menu' })
        const nav = page.getByRole('navigation', { name: 'Menu' })

        await test.expect(nav).toBeHidden()

        await button.click()
        await test.expect(nav).toBeVisible()
        await test.expect(nav.getByRole('link', { name: 'Writing' })).toBeVisible()

        await page.keyboard.press('Escape')
        await test.expect(nav).toBeHidden()
        await test.expect(button).toBeFocused()
    })

    test('labels the menu button in the page language', async ({ page }) => {
        await page.goto('/fi/laurista/')
        await test.expect(page.getByRole('banner').getByRole('button', { name: 'Valikko' })).toBeVisible()

        await page.goto('/sv/om-lauri/')
        await test.expect(page.getByRole('banner').getByRole('button', { name: 'Meny' })).toBeVisible()
    })
})
