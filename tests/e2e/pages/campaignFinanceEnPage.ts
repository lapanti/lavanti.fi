import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class CampaignFinanceEnPage extends AnyPage {
    readonly financeTitle: Locator
    readonly summaryPlate: Locator
    readonly sourceLink: Locator
    readonly figures: Locator

    constructor(page: Page) {
        super(page, 'en')
        this.financeTitle = page.getByRole('heading', { level: 1 })
        this.summaryPlate = page.locator('#inbrief')
        this.sourceLink = page.locator('a[href$="E_VI_eduskuntavaalit2023.csv"]')
        this.figures = page.locator('figure')
    }

    async goTo() {
        await this.page.goto('/en/elections/campaign-finance/')

        // Wait to ensure we are at the correct page
        await expect(this.financeTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.summaryPlate).toBeVisible()
        await expect(this.sourceLink).toBeVisible()
        // Two comparison bar groups and two composition stacks.
        await expect(this.figures).toHaveCount(4)
    }
}
