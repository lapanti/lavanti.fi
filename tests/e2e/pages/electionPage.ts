import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class ElectionPage extends AnyPage {
    readonly electionTitle: Locator
    readonly briefPlate: Locator
    readonly eventCalendar: Locator
    readonly financeTeaser: Locator
    readonly photoStrip: Locator
    readonly whyFigure: Locator

    constructor(page: Page) {
        super(page)
        this.electionTitle = page.getByRole('heading', { level: 1 })
        this.briefPlate = page.locator('#lyhyesti')
        this.financeTeaser = page.locator('#rahoitus')
        this.eventCalendar = page.locator('#tapahtumat')
        this.photoStrip = page.locator('main ul.photo-strip')
        this.whyFigure = page.getByRole('figure', { name: 'Digitaalinen itsenäisyys -kansalaisaloitteen mainos' })
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

        // The aria golden matches partially, so the below-fold photos need an explicit check.
        await expect(this.whyFigure).toHaveCount(1)
        await expect(this.whyFigure.locator('.credit')).toHaveText('Kuva: Julia Kiljander')
        await expect(this.photoStrip).toHaveCount(1)
        await expect(this.photoStrip).toHaveClass(/\bgrid\b/)
        await expect(this.photoStrip.getByRole('figure')).toHaveCount(3)
    }
}
