import type { Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'

import { AnyPage } from './anyPage'

export class TagSwePage extends AnyPage {
    readonly url: string
    readonly title: Locator
    readonly articles: Locator

    constructor(page: Page, url = '/sv/kategori/kommunalval-2025/') {
        super(page)
        this.url = url
        this.title = page.getByRole('heading', { level: 1 })
        this.articles = page.locator('article[aria-label]')
    }

    async goTo() {
        await this.page.goto(this.url)

        // Wait to ensure we are at the correct page
        await expect(this.title).toBeVisible()
    }

    async checkContent() {
        await expect(this.articles.first()).toBeVisible()
        await expect(this.articles.first().getByRole('link').first()).toBeVisible()
        await expect(this.articles.first().getByRole('heading').first()).toBeVisible()
    }

    /** Below-fold plates: viewport screenshots and partial aria snapshots would not catch their loss. */
    async checkRichContent() {
        await expect(this.page.getByRole('heading', { name: 'Börja här' })).toBeVisible()
        await expect(this.page.getByRole('list', { name: 'Relaterade ämnen' }).getByRole('link')).not.toHaveCount(0)
        await expect(this.page.getByRole('heading', { name: 'Vanliga frågor' })).toBeVisible()
        const types = await this.page
            .locator('script[type="application/ld+json"]')
            .evaluateAll((nodes) =>
                nodes.map((n) => (JSON.parse(n.textContent ?? '{}') as { '@type': string })['@type'])
            )
        expect(types).toEqual(expect.arrayContaining(['CollectionPage', 'FAQPage']))
    }
}
