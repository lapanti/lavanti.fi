import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class BlogPostPage extends AnyPage {
    readonly url: string
    readonly titleLocator: Locator
    readonly tagLinks: Locator
    readonly otherPostsSection: Locator

    constructor(page: Page, url = '/fi/blog/10/sote-on-hyvinvointiyhteiskunnan-kulmakivi/') {
        super(page)
        this.url = url
        this.titleLocator = page.getByRole('heading', { level: 1 })
        this.tagLinks = page.locator('a[href*="/kategoria/"], a[href*="/kategori/"], a[href*="/category/"]')
        this.otherPostsSection = page.getByRole('heading', { level: 2 }).first()
    }

    async goTo() {
        await this.page.goto(this.url)

        // Wait to ensure we are at the correct page
        await expect(this.titleLocator).toBeVisible()
    }

    async checkContent() {
        expect(await this.tagLinks.count()).toBeGreaterThanOrEqual(1)

        await expect(this.otherPostsSection).toBeVisible()
    }
}
