import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class NewsletterIssuePage extends AnyPage {
    readonly url: string
    readonly titleLocator: Locator
    readonly provenance: Locator
    readonly archiveLink: Locator

    constructor(page: Page, url = '/fi/uutiskirje/1/tekoaly-ei-vie-tyotasi-mutta-muuttaa-sen/') {
        super(page)
        this.url = url
        this.titleLocator = page.getByRole('heading', { level: 1 })
        this.provenance = page.locator('main p.provenance time')
        // The button variant is visible on every viewport; the plate's inline link is desktop-only.
        this.archiveLink = page
            .locator('main a.btn')
            .filter({ hasText: /Kaikki uutiskirjeet|All issues|Alla nyhetsbrev/ })
    }

    async goTo() {
        await this.page.goto(this.url)

        // Wait to ensure we are at the correct page
        await expect(this.titleLocator).toBeVisible()
    }

    async checkContent() {
        await expect(this.provenance).toBeVisible()
        await expect(this.provenance).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/)
        await expect(this.archiveLink.first()).toBeVisible()
    }
}
