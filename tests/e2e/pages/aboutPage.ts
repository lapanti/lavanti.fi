import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class AboutPage extends AnyPage {
    readonly aboutMeTitle: Locator
    readonly briefPlate: Locator
    readonly photoStrips: Locator

    constructor(page: Page) {
        super(page)
        this.aboutMeTitle = page.getByRole('heading', { level: 1 })
        this.briefPlate = page.locator('#lyhyesti')
        this.photoStrips = page.locator('main ul.photo-strip.scroll')
    }

    async goTo() {
        await this.page.goto('/fi/laurista/')

        // Wait to ensure we are at the correct page
        await expect(this.aboutMeTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.briefPlate).toBeVisible()

        // The aria golden matches partially, so the three below-fold strips need an explicit check.
        await expect(this.photoStrips).toHaveCount(3)
        for (const strip of await this.photoStrips.all()) {
            await expect(strip.getByRole('figure')).toHaveCount(4)
            await expect(strip).toHaveAttribute('tabindex', '0')
        }
    }
}
