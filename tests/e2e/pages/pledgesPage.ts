import type { Locator, Page } from '@playwright/test'
import type { Lang } from '../../../src/content/nav'

import { expect } from '@playwright/test'

import { pledgePages, pledges } from '../../../src/content/pledges'
import { AnyPage } from './anyPage'

const LIST_IDS: Record<Lang, string> = { en: '#list', fi: '#lista', sv: '#lista' }

export class PledgesPage extends AnyPage {
    readonly lang: Lang
    readonly pledgesTitle: Locator
    readonly items: Locator

    constructor(page: Page, lang: Lang) {
        super(page)
        this.lang = lang
        this.pledgesTitle = page.getByRole('heading', { level: 1 })
        this.items = page.locator(`${LIST_IDS[lang]} li[data-pledge-id]`)
    }

    async goTo() {
        await this.page.goto(pledgePages[this.lang])

        // Wait to ensure we are at the correct page
        await expect(this.pledgesTitle).toBeVisible()
    }

    async checkContent() {
        // The count follows the data, so a new entry never breaks this test.
        await expect(this.items).toHaveCount(pledges.length)
    }
}
