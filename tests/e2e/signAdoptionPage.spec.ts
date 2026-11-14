import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test, { type Page } from '@playwright/test'

/*
 * Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md). Behavioural checks plus inline aria
 * snapshots scoped to the hero and the form, so no file goldens are needed. The Turnstile script
 * is blocked and /api/adoptoi* is mocked: the run never stores anything or depends on
 * challenges.cloudflare.com.
 */

const WALL = {
    messages: [{ message: 'Haluan kyltin kotitielle.', name: 'Anna' }],
    municipalities: { espoo: 4, kirkkonummi: 12 },
    names: ['Sjoerd', 'Anna', 'Mikko', 'Liisa'],
    signs: 14,
}

const mockApi = async (page: Page, wall: unknown = WALL) => {
    await page.route('https://challenges.cloudflare.com/**', (route) => route.abort())
    await page.route('**/api/adoptoi/seina', (route) => route.fulfill({ json: wall }))
}

test.describe('Sign adoption page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
    })

    test('should show the sign and the first step in the hero', async ({ page }) => {
        await page.goto('/fi/adoptoi/')

        await test
            .expect(page.getByRole('heading', { level: 1 }))
            .toHaveText('Adoptoi kyltti. Nimesi nousee tienvarteen.')
        await test.expect(page.locator('#lomake')).toMatchAriaSnapshot(`
            - text: Nimi kylttiin
            - textbox "Nimi kylttiin"
            - paragraph: 0/24
            - paragraph: 30 € = yksi kyltti tienvarteen
            - group "Montako kylttiä adoptoit?":
              - text: Montako kylttiä adoptoit?
              - radio "1 kyltti · 30 €" [checked]
              - text: 1 kyltti · 30 €
              - radio "2 kylttiä · 60 €"
              - text: 2 kylttiä · 60 €
              - radio "5 kylttiä · 150 €"
              - text: 5 kylttiä · 150 €
              - radio "Muu määrä kylttejä"
              - text: Muu määrä kylttejä
            - paragraph: "Lahjoituksesi: 30 €"
            - button "Adoptoi kyltti"
        `)
        await test.expect(page.getByRole('img', { name: /Havainnekuva vaalikyltistä/ })).toBeVisible()
        await test.expect(page.locator('[data-step="2"]')).toBeHidden()
    })

    test('should write the typed name on the sign', async ({ page }) => {
        await page.goto('/fi/adoptoi/')
        const sign = page.locator('[data-sign-name]').first()
        await test.expect(sign).toHaveText('Sinun nimesi')

        await page.getByLabel('Nimi kylttiin').fill('Åsa Ødegaard')
        await test.expect(sign).toHaveText('Åsa Ødegaard')
        await test.expect(page.locator('#adoption-name-counter')).toHaveText('12/24')
    })

    test('should follow the chip in the CTA, total and consent', async ({ page }) => {
        await page.goto('/fi/adoptoi/')
        await page.getByText('2 kylttiä · 60 €').click()

        await test.expect(page.locator('[data-total]')).toHaveText('Lahjoituksesi: 60 €')
        await test.expect(page.locator('[data-next]')).toHaveText('Adoptoi 2 kylttiä')

        await page.getByText('Muu määrä kylttejä').click()
        await page.getByLabel('Kylttien määrä').fill('7')
        await test.expect(page.locator('[data-next]')).toHaveText('Adoptoi 7 kylttiä')
        await test.expect(page.locator('[data-total]')).toHaveText('Lahjoituksesi: 210 €')
    })

    test('should move to step 2 on the same page and post with fetch', async ({ page }) => {
        let posted: null | string = null
        await page.route('**/api/adoptoi', async (route) => {
            posted = route.request().postData()
            await route.fulfill({ json: { ref: 'K-12345', token: 'tok' } })
        })
        await page.goto('/fi/adoptoi/')
        await page.getByLabel('Nimi kylttiin').fill('Sjoerd')
        await page.getByText('2 kylttiä · 60 €').click()
        await page.locator('[data-next]').click()

        await test.expect(page.locator('[data-step="1"]')).toBeHidden()
        await test.expect(page.locator('[data-pinned]')).toHaveText('Kylttisi: Sjoerd · 2 kylttiä · 60 €')
        await test
            .expect(page.locator('[data-next-step]'))
            .toHaveText('Seuraavaksi lahjoitat 60 € MobilePayllä ja saat viitekoodin, jonka kirjoitat viestiksi.')
        await test.expect(page.locator('[data-consent-print]')).toContainText('vaalikyltteihin')
        // The engaging question comes before the email field.
        const order = await page.locator('[data-step="2"] label').allTextContents()
        test.expect(order.findIndex((t) => t.startsWith('Missä kunnassa'))).toBeLessThan(
            order.findIndex((t) => t.startsWith('Sähköposti'))
        )

        await page.getByLabel('Missä kunnassa toivot kylttisi seisovan?').selectOption('kirkkonummi')
        await page.getByRole('textbox', { name: 'Sähköposti' }).fill('sjoerd@example.fi')
        await page.locator('input[name="consent_print"]').check()
        await page.locator('input[name="consent_person"]').check()
        await page.locator('button[type="submit"]').click()

        await page.waitForURL('**/fi/adoptoi/kiitos/?ref=K-12345&n=2&y=0')
        test.expect(posted).toContain('Sjoerd')
        test.expect(page.url()).not.toContain('tok')
        await test.expect(page.locator('[data-donate]')).toHaveText('Lahjoita 60 euroa MobilePayllä numerolla 46492.')
        await test.expect(page.locator('[data-sign-name]').first()).toHaveText('Sjoerd')
    })

    test('should show the live line and the wall from seina', async ({ page }) => {
        await page.goto('/fi/adoptoi/')

        await test
            .expect(page.locator('[data-live]'))
            .toHaveText('Jo 14 kylttiä on adoptoitu. Viimeksi adoptoivat: Sjoerd, Anna ja Mikko.')
        await test.expect(page.locator('[data-wall-count]')).toHaveText('Jo 14 kylttiä on adoptoitu.')
        await test.expect(page.locator('[data-wall-municipalities]')).toContainText('Kirkkonummi 12 · Espoo 4')
        await test.expect(page.locator('[data-wall-adopters] li')).toHaveText(['Sjoerd', 'Anna', 'Mikko', 'Liisa'])
    })

    test('should show nothing live below the thresholds', async ({ page }) => {
        await page.unroute('**/api/adoptoi/seina')
        await page.route('**/api/adoptoi/seina', (route) =>
            route.fulfill({ json: { messages: [], municipalities: {}, names: [], signs: null } })
        )
        await page.goto('/fi/adoptoi/')

        await test.expect(page.locator('[data-live]')).toBeHidden()
        await test.expect(page.locator('[data-wall]')).toBeHidden()
    })

    test('should be in the sitemap while the thanks pages are not', async ({ request }) => {
        const sitemap = await (await request.get('/sitemap-0.xml')).text()
        test.expect(sitemap).toContain('/fi/adoptoi/</loc>')
        test.expect(sitemap).not.toContain('/fi/adoptoi/kiitos/')
        test.expect(sitemap).not.toContain('/en/adopt/thanks/')
    })

    test('should pass accessibility test', async ({ page }) => {
        await page.goto('/fi/adoptoi/')

        const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(results.violations).toEqual([])
    })
})

test.describe('Sign adoption thanks page', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
    })

    test('should stay out of search', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=0')

        await test.expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    })

    test('should reject invalid parameters', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=<script>&n=99&y=0')

        await test.expect(page.locator('[data-invalid]')).toBeVisible()
        await test.expect(page.locator('[data-valid]')).toBeHidden()
        await test.expect(page.locator('[data-invalid] a')).toHaveAttribute('href', '/fi/adoptoi/')
    })

    test('should ask for the name again when sessionStorage is empty', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=2&y=0')

        await test.expect(page.locator('[data-missing-name]')).toBeVisible()
        await test.expect(page.locator('[data-sign-name]').first()).toHaveText('Sinun nimesi')
        await test.expect(page.locator('[data-donate]')).toHaveText('Lahjoita 60 euroa MobilePayllä numerolla 46492.')
        await test
            .expect(page.locator('[data-ref-note]'))
            .toHaveText('Kirjoita viestiksi K-12345, niin löydämme lahjoituksesi.')
        // Without the edit token there is nothing to save a message with.
        await test.expect(page.locator('[data-message-form]')).toBeHidden()

        await page.getByLabel('Nimi kylttiin').fill('Sjoerd')
        await test.expect(page.locator('[data-sign-name]').first()).toHaveText('Sjoerd')
    })

    test('should reveal the thank-you and share images after "Lahjoitin"', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=0')
        await test.expect(page.locator('[data-after]')).toBeHidden()

        await page.getByRole('button', { name: 'Lahjoitin' }).click()
        await test.expect(page.locator('[data-after]')).toBeVisible()
        await test.expect(page.locator('.thank-you')).toContainText('Sinä teet sen mahdolliseksi. Kiitos!')
        await test.expect(page.locator('[data-share-image="story"]')).toHaveAttribute('src', /^blob:/)
    })

    test('should skip MobilePay for a company', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=1')

        await test.expect(page.locator('[data-private]')).toBeHidden()
        await test.expect(page.locator('[data-company]')).toContainText('Lähetämme laskun')
        await test.expect(page.locator('[data-after]')).toBeVisible()
    })
})
