import test from '@playwright/test'

test.describe('Mobile menu', () => {
    test.beforeEach(({ isMobile }) => {
        test.skip(!isMobile, 'the popover menu only renders below 1200px')
    })

    test('keeps closed links out of the tab order, opens, and closes on Escape', async ({ page }) => {
        await page.goto('/en/about/')
        const button = page.getByRole('banner').getByRole('button', { name: 'Menu' })
        const nav = page.getByRole('navigation', { name: 'Menu' })

        await test.expect(nav).toBeHidden()

        // Tab from the closed button: focus must leave the banner, not land on a hidden link.
        await button.focus()
        await page.keyboard.press('Tab')
        test.expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(false)

        await button.click()
        await test.expect(nav).toBeVisible()
        await test.expect(nav.getByRole('link', { name: 'Writing' })).toBeVisible()

        await page.keyboard.press('Escape')
        await test.expect(nav).toBeHidden()
        await test.expect(button).toBeFocused()
    })

    test('keeps every link reachable on a short screen', async ({ page }) => {
        await page.setViewportSize({ height: 568, width: 320 })
        await page.goto('/fi/laurista/')
        await page.getByRole('banner').getByRole('button', { name: 'Valikko' }).click()
        const nav = page.getByRole('navigation', { name: 'Valikko' })

        const navBox = await nav.boundingBox()
        const firstBox = await nav.getByRole('link').first().boundingBox()
        test.expect(firstBox?.y).toBeGreaterThanOrEqual(navBox?.y ?? 0)

        const lastLang = nav.getByRole('group').getByRole('link').last()
        await lastLang.scrollIntoViewIfNeeded()
        await test.expect(lastLang).toBeInViewport()
    })

    test('marks the current page in the panel', async ({ page }) => {
        await page.goto('/en/about/')
        await page.getByRole('banner').getByRole('button', { name: 'Menu' }).click()

        await test
            .expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'About Lauri' }))
            .toHaveAttribute('aria-current', 'page')
    })

    test('labels the menu button in the page language', async ({ page }) => {
        await page.goto('/fi/laurista/')
        await test.expect(page.getByRole('banner').getByRole('button', { name: 'Valikko' })).toBeVisible()

        await page.goto('/sv/om-lauri/')
        await test.expect(page.getByRole('banner').getByRole('button', { name: 'Meny' })).toBeVisible()
    })
})
