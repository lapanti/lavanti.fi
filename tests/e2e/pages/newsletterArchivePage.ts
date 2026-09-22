import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class NewsletterArchivePage extends AnyPage {
    readonly url: string
    readonly title: Locator
    readonly issues: Locator

    constructor(page: Page, url = '/fi/uutiskirje/arkisto/') {
        super(page)
        this.url = url
        this.title = page.getByRole('heading', { level: 1 })
        this.issues = page.locator('main article[aria-label]')
    }

    async goTo() {
        await this.page.goto(this.url)

        // Wait to ensure we are at the correct page
        await expect(this.title).toBeVisible()
    }

    async checkContent() {
        await expect(this.issues.first()).toBeVisible()
        await expect(this.issues.first().getByRole('link').first()).toHaveAttribute('href', /\/uutiskirje\/\d+\//)
    }
}
