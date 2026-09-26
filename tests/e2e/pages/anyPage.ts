import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

export class AnyPage {
    readonly page: Page
    readonly isMobile: boolean
    readonly navButton: Locator
    readonly mobileNav: Locator
    readonly navLinkHome: Locator
    readonly navLinkAboutMe: Locator
    readonly navLinkBlog: Locator
    readonly navLinkContactInfo: Locator
    readonly navLinkAboutMeSwe: Locator
    readonly navLinkAboutMeEn: Locator
    readonly navLinkNewsletter: Locator
    readonly footerFacebookLink: Locator
    readonly footerBlueskyLink: Locator
    readonly footerThreadsLink: Locator
    readonly footerInstagramLink: Locator
    readonly footerLinkedInLink: Locator
    readonly footerMastodonLink: Locator
    readonly footerTikTokLink: Locator
    readonly footerYouTubeLink: Locator

    constructor(page: Page, lang: 'en' | 'fi' | 'sv' = 'fi') {
        this.page = page
        this.isMobile = (page.viewportSize()?.width ?? 0) < 1200
        /*
         * MobileMenu is rendered before DesktopMenu in the DOM.
         * On desktop the mobile container is display:none (nth 1 → desktop link).
         * On mobile the desktop container is display:none (nth 0 → mobile link).
         */
        const navIdx = this.isMobile ? 0 : 1
        this.navButton = page.locator('header button[popovertarget="mobile-nav"]')
        this.mobileNav = page.locator('#mobile-nav')
        this.navLinkHome = page.locator(`header a[href="/${lang}/"]`).nth(navIdx)
        this.navLinkAboutMe = page.locator('a[href="/fi/laurista/"]').nth(navIdx)
        this.navLinkBlog = page.locator('a[href="/fi/blog/"]').nth(navIdx)
        this.navLinkContactInfo = page.locator('a[href="/fi/yhteystiedot/"]').nth(navIdx)
        this.navLinkAboutMeSwe = page.locator('a[href="/sv/"]').nth(navIdx)
        this.navLinkAboutMeEn = page.locator('a[href="/en/"]').nth(navIdx)
        this.navLinkNewsletter = page.locator('a[href="/fi/uutiskirje/"]').nth(navIdx)
        this.footerFacebookLink = page.locator('footer a[href*="facebook.com"]')
        this.footerBlueskyLink = page.locator('footer a[href*="bsky.app"]')
        this.footerThreadsLink = page.locator('footer a[href*="threads.com"]')
        this.footerInstagramLink = page.locator('footer a[href*="instagram.com"]')
        this.footerLinkedInLink = page.locator('footer a[href*="linkedin.com"]')
        this.footerMastodonLink = page.locator('footer a[href*="mastodon"]')
        this.footerTikTokLink = page.locator('footer a[href*="tiktok.com"]')
        this.footerYouTubeLink = page.locator('footer a[href*="youtube.com"]')
    }

    async checkNavLinkHomeAriaCurrent() {
        if (this.isMobile) {
            await this.openMainNavigation()
        }

        await expect(this.navLinkHome).toHaveAttribute('aria-current', 'page')

        if (this.isMobile) {
            await this.closeMainNavigation()
        }
    }

    async openMainNavigation() {
        await expect(this.mobileNav).toBeHidden()
        await this.navButton.click()
        await expect(this.mobileNav).toBeVisible()
    }

    async checkMainNavigationLinks() {
        await expect(this.navLinkAboutMe).toBeVisible()
        await expect(this.navLinkBlog).toBeVisible()
        await expect(this.navLinkContactInfo).toBeVisible()
        await expect(this.navLinkNewsletter).toBeVisible()
        await expect(this.navLinkAboutMeSwe).toBeVisible()
        await expect(this.navLinkAboutMeEn).toBeVisible()
    }

    async goToNavLink(navLink: Locator) {
        await this.page.goto('/')

        if (this.isMobile) {
            await this.openMainNavigation()
        }

        await this.checkMainNavigationLinks()

        await expect(navLink).toBeVisible()
        await navLink.click()
    }

    async closeMainNavigation() {
        await expect(this.mobileNav).toBeVisible()
        await this.navButton.click()
        await expect(this.mobileNav).toBeHidden()
    }

    async checkMainNavigation() {
        if (this.isMobile) {
            await this.openMainNavigation()
        }

        await this.checkMainNavigationLinks()

        if (this.isMobile) {
            await this.closeMainNavigation()
        }
    }

    async checkFooter() {
        await expect(this.footerFacebookLink).toBeVisible()
        await expect(this.footerBlueskyLink).toBeVisible()
        await expect(this.footerThreadsLink).toBeVisible()
        await expect(this.footerInstagramLink).toBeVisible()
        await expect(this.footerLinkedInLink).toBeVisible()
        await expect(this.footerMastodonLink).toBeVisible()
        await expect(this.footerTikTokLink).toBeVisible()
        await expect(this.footerYouTubeLink).toBeVisible()
    }

    async checkNoHorizontalScroll() {
        if (!this.isMobile) return
        const scrollWidth = await this.page.evaluate(() => document.documentElement.scrollWidth)
        const clientWidth = await this.page.evaluate(() => document.documentElement.clientWidth)
        /*
         * Some Chromium builds reserve a 1px scrollbar gutter on scrollable pages instead of
         * overlaying it, which pads scrollWidth by 1px with no visible layout change.
         */
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
    }
}
