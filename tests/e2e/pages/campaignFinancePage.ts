import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { campaignFinance } from '../../../src/content/campaignFinance'
import { spendingSegments } from '../../../src/lib/campaignFinance'
import { AnyPage } from './anyPage'

/*
 * Two comparison bar groups, the funding stack and the category bars are always drawn.
 * The spending stack joins them only once something is paid or committed, so the count
 * follows the data rather than being pinned to whatever the campaign reports today.
 */
const EXPECTED_FIGURES = spendingSegments(campaignFinance, 'fi') ? 5 : 4
/* One row per statutory expense category, zeros included; below the fold, so no golden sees it. */
const EXPECTED_CATEGORIES = 7

export class CampaignFinancePage extends AnyPage {
    readonly financeTitle: Locator
    readonly summaryPlate: Locator
    readonly sourceLink: Locator
    readonly figures: Locator
    readonly spendingSection: Locator

    constructor(page: Page) {
        super(page)
        this.financeTitle = page.getByRole('heading', { level: 1 })
        this.summaryPlate = page.locator('#lyhyesti')
        this.sourceLink = page.locator('a[href$="E_VI_eduskuntavaalit2023.csv"]')
        this.figures = page.locator('figure')
        this.spendingSection = page.locator('#kulut')
    }

    async goTo() {
        await this.page.goto('/fi/eduskuntavaalit/vaalirahoitus/')

        // Wait to ensure we are at the correct page
        await expect(this.financeTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.summaryPlate).toBeVisible()
        await expect(this.sourceLink).toBeVisible()
        await expect(this.figures).toHaveCount(EXPECTED_FIGURES)
        // Present in both states: it carries either the stack or the pending line.
        await expect(this.spendingSection).toBeVisible()
        await expect(this.spendingSection.locator('ol > li')).toHaveCount(EXPECTED_CATEGORIES)
    }
}
