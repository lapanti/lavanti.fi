import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class ElectionEnPage extends AnyPage {
    readonly electionTitle: Locator
    readonly briefPlate: Locator
    readonly eventCalendar: Locator
    readonly financeTeaser: Locator

    constructor(page: Page) {
        super(page)
        this.electionTitle = page.getByRole('heading', { level: 1 })
        this.briefPlate = page.locator('#inbrief')
        this.financeTeaser = page.locator('#finance')
        this.eventCalendar = page.locator('#events')
    }

    async goTo() {
        await this.page.goto('/en/elections/')

        // Wait to ensure we are at the correct page
        await expect(this.electionTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.briefPlate).toBeVisible()
        await expect(this.financeTeaser).toBeVisible()
        await expect(this.eventCalendar).toBeVisible()
    }
}
