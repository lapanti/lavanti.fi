import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { financeLabels } from '../../../src/content/campaignFinance'
import { AnyPage } from './anyPage'

export class CampaignFinancePage extends AnyPage {
    readonly financeTitle: Locator
    readonly summaryPlate: Locator
    readonly sourceLink: Locator
    readonly figures: Locator
    readonly spendingPending: Locator

    constructor(page: Page) {
        super(page)
        this.financeTitle = page.getByRole('heading', { level: 1 })
        this.summaryPlate = page.locator('#lyhyesti')
        this.sourceLink = page.locator('a[href$="E_VI_eduskuntavaalit2023.csv"]')
        this.figures = page.locator('figure')
        this.spendingPending = page.getByText(financeLabels.fi.spentPending)
    }

    async goTo() {
        await this.page.goto('/fi/eduskuntavaalit/vaalirahoitus/')

        // Wait to ensure we are at the correct page
        await expect(this.financeTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.summaryPlate).toBeVisible()
        await expect(this.sourceLink).toBeVisible()
        /*
         * Two comparison bar groups and the funding stack. The spending stack is not
         * among them while no spending figure is confirmed; the section prints the
         * pending line instead, which is what the next assertion holds it to.
         */
        await expect(this.figures).toHaveCount(3)
        await expect(this.spendingPending).toBeVisible()
    }
}
