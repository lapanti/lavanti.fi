import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { campaignFinance } from '../../../src/content/campaignFinance'
import { AnyPage } from './anyPage'

/*
 * Two comparison bar groups and the funding stack are always drawn. The spending
 * stack joins them only once a spending figure is confirmed, so the count follows the
 * data rather than being pinned to whatever the campaign happens to report today.
 */
const EXPECTED_FIGURES = campaignFinance.spent === undefined ? 3 : 4

export class CampaignFinanceEnPage extends AnyPage {
    readonly financeTitle: Locator
    readonly summaryPlate: Locator
    readonly sourceLink: Locator
    readonly figures: Locator
    readonly spendingSection: Locator

    constructor(page: Page) {
        super(page, 'en')
        this.financeTitle = page.getByRole('heading', { level: 1 })
        this.summaryPlate = page.locator('#inbrief')
        this.sourceLink = page.locator('a[href$="E_VI_eduskuntavaalit2023.csv"]')
        this.figures = page.locator('figure')
        this.spendingSection = page.locator('#spending')
    }

    async goTo() {
        await this.page.goto('/en/elections/campaign-finance/')

        // Wait to ensure we are at the correct page
        await expect(this.financeTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.summaryPlate).toBeVisible()
        await expect(this.sourceLink).toBeVisible()
        await expect(this.figures).toHaveCount(EXPECTED_FIGURES)
        // Present in both states: it carries either the stack or the pending line.
        await expect(this.spendingSection).toBeVisible()
    }
}
