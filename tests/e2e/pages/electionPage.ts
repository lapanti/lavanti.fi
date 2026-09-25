import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class ElectionPage extends AnyPage {
    readonly electionTitle: Locator
    readonly briefPlate: Locator
    readonly eventCalendar: Locator
    readonly financeTeaser: Locator

    constructor(page: Page) {
        super(page)
        this.electionTitle = page.getByRole('heading', { level: 1 })
        this.briefPlate = page.locator('#lyhyesti')
        this.financeTeaser = page.locator('#rahoitus')
        this.eventCalendar = page.locator('#tapahtumat')
    }

    async goTo() {
        await this.page.goto('/fi/eduskuntavaalit/')

        // Wait to ensure we are at the correct page
        await expect(this.electionTitle).toBeVisible()
    }

    async checkContent() {
        await expect(this.briefPlate).toBeVisible()
        await expect(this.financeTeaser).toBeVisible()
        await expect(this.eventCalendar).toBeVisible()
    }
}
