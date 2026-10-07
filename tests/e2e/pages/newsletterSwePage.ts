import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class NewsletterSwePage extends AnyPage {
    readonly pageTitle: Locator
    readonly emailInput: Locator
    readonly submitButton: Locator

    constructor(page: Page) {
        super(page)
        this.pageTitle = page.getByRole('heading', { level: 1 })
        this.emailInput = page.locator('input[type="email"]')
        this.submitButton = page.getByRole('button', { name: 'Prenumerera' }).first()
    }

    async goTo() {
        await this.page.goto('/sv/nyhetsbrev/')

        await expect(this.pageTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.emailInput).toBeVisible()

        // The aria golden matches partially, so the below-fold photo needs an explicit check.
        const figure = this.page.getByRole('figure', { name: 'I Kyrkslätts kommunhus' })
        await expect(figure).toHaveCount(1)
        await expect(figure.locator('.credit')).toHaveText('Foto: Juha Jantunen')
    }
}
