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
            .toHaveText(/^\s*Adoptoi kyltti\.\s*Nimesi nousee tienvarteen\.\s*$/)
        await test.expect(page.locator('#lomake')).toMatchAriaSnapshot(`
            - paragraph: 30 € = yksi kyltti tienvarteen
            - text: Nimi kylttiin
            - textbox "Nimi kylttiin"
            - paragraph: 0/24
            - checkbox "En halua nimeäni kylttiin"
            - text: En halua nimeäni kylttiin
            - paragraph: Voit tukea kylttejä myös ilman, että nimesi tulee niihin.
            - group "Montako kylttiä adoptoit?":
              - text: Montako kylttiä adoptoit?
              - radio "1 kyltti · 30 €" [checked]
              - text: 1 kyltti · 30 €
              - radio "2 kylttiä · 55 € 27,50 €/kyltti"
              - text: 2 kylttiä · 55 € 27,50 €/kyltti
              - radio "3 kylttiä · 80 € 26,67 €/kyltti"
              - text: 3 kylttiä · 80 € 26,67 €/kyltti
              - radio "5 kylttiä · 100 € 20 €/kyltti"
              - text: 5 kylttiä · 100 € 20 €/kyltti
              - radio "10 kylttiä · 190 € 19 €/kyltti"
              - text: 10 kylttiä · 190 € 19 €/kyltti
            - paragraph: "Lahjoituksesi: 30 €"
            - button "Adoptoi kyltti"
        `)
        await test.expect(page.getByRole('img', { name: /Havainnekuva vaalikyltistä/ })).toBeVisible()
        await test.expect(page.locator('[data-step="2"]')).toBeHidden()
        // The hero shows the sign instead of a photo, and no unused hero photo is preloaded.
        await test.expect(page.locator('.hero-sign svg')).toBeVisible()
        await test.expect(page.locator('.hero picture')).toHaveCount(0)
        await test.expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(0)
    })

    test('should scroll from the hero CTA to the form on a phone', async ({ page }) => {
        await page.setViewportSize({ height: 812, width: 375 })
        await page.goto('/fi/adoptoi/')

        const cta = page.getByRole('link', { name: 'Kirjoita nimesi kylttiin' })
        await test.expect(cta).toHaveAttribute('href', '#adoptoi')
        await test.expect(cta).toBeInViewport()
        await cta.click()
        await test.expect(page.getByLabel('Nimi kylttiin')).toBeInViewport()
    })

    test('should write the typed name on the sign', async ({ page }) => {
        await page.goto('/fi/adoptoi/')
        // The form's sign follows the field; the hero's copy keeps the ghost text.
        const sign = page.locator('[data-sign] [data-sign-name]')
        const heroSign = page.locator('.hero-sign [data-sign-name]')
        await test.expect(sign).toHaveText('Sinun nimesi')

        await page.getByLabel('Nimi kylttiin').fill('Åsa Ødegaard')
        await test.expect(sign).toHaveText('Åsa Ødegaard')
        await test.expect(heroSign).toHaveText('Sinun nimesi')
        await test.expect(page.locator('#adoption-name-counter')).toHaveText('12/24')
    })

    test('should follow the chip in the CTA, total and consent', async ({ page }) => {
        await page.goto('/fi/adoptoi/')
        await page.getByText('2 kylttiä · 55 €').click()

        await test.expect(page.locator('[data-total]')).toHaveText('Lahjoituksesi: 55 €')
        await test.expect(page.locator('[data-next]')).toHaveText('Adoptoi 2 kylttiä')

        await page.getByText('5 kylttiä · 100 €').click()
        await test.expect(page.locator('[data-next]')).toHaveText('Adoptoi 5 kylttiä')
        await test.expect(page.locator('[data-total]')).toHaveText('Lahjoituksesi: 100 €')
        await test.expect(page.getByText('Muu määrä kylttejä')).toHaveCount(0)
    })

    test('should move to step 2 on the same page and post with fetch', async ({ page }) => {
        let posted: null | string = null
        await page.route('**/api/adoptoi', async (route) => {
            posted = route.request().postData()
            await route.fulfill({ json: { ref: 'K-12345', token: 'tok' } })
        })
        await page.goto('/fi/adoptoi/')
        await page.getByLabel('Nimi kylttiin').fill('Sjoerd')
        await page.getByText('2 kylttiä · 55 €').click()
        await page.locator('[data-next]').click()

        await test.expect(page.locator('[data-step="1"]')).toBeHidden()
        await test.expect(page.locator('[data-pinned]')).toHaveText('Kylttisi: Sjoerd · 2 kylttiä · 55 €')
        await test
            .expect(page.locator('[data-next-step]'))
            .toHaveText('Seuraavaksi lahjoitat 55 € MobilePayllä ja saat viitekoodin, jonka kirjoitat viestiksi.')
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

        await page.waitForURL('**/fi/adoptoi/lahjoita/?ref=K-12345&n=2&y=0')
        test.expect(posted).toContain('Sjoerd')
        test.expect(page.url()).not.toContain('tok')
        await test.expect(page.locator('[data-donate]')).toHaveText('Lahjoita 55 euroa MobilePayllä numerolla 46492.')
    })

    test('should let a donor support signs without their name on them', async ({ page }) => {
        let posted = ''
        await page.route('**/api/adoptoi', async (route) => {
            posted = route.request().postData() ?? ''
            await route.fulfill({ json: { ref: 'K-12345', token: 'tok' } })
        })
        await page.goto('/fi/adoptoi/')
        // A name typed and a box ticked before opting out must not be sent.
        await page.getByLabel('Nimi kylttiin').fill('Sjoerd')
        await page.getByLabel('En halua nimeäni kylttiin').check()

        await test.expect(page.getByLabel('Nimi kylttiin')).toBeHidden()
        await test.expect(page.locator('[data-sign] [data-sticker]')).toBeHidden()
        await test.expect(page.locator('.hero-sign [data-sticker]')).toBeVisible()
        await test.expect(page.locator('[data-next]')).toHaveText('Adoptoi kyltti')
        await test.expect(page.locator('[data-total]')).toHaveText('Lahjoituksesi: 30 €')
        await page.locator('[data-next]').click()

        await test.expect(page.getByRole('heading', { level: 2, name: 'Vielä yhteystietosi.' })).toBeVisible()
        await test.expect(page.locator('[data-pinned]')).toHaveText('Kylttisi ilman nimeä · 30 €')
        for (const name of ['consent_print', 'consent_person', 'public', 'page']) {
            await test.expect(page.locator(`input[name="${name}"]`)).toBeHidden()
        }
        await page.getByLabel('Missä kunnassa toivot kylttisi seisovan?').selectOption('espoo')
        await page.getByRole('textbox', { name: 'Sähköposti' }).fill('tuki@example.fi')
        await page.locator('button[type="submit"]').click()

        await page.waitForURL('**/fi/adoptoi/lahjoita/?ref=K-12345&n=1&y=0&u=1')
        test.expect(posted).toContain('name="unnamed"')
        test.expect(posted).not.toContain('Sjoerd')
        test.expect(posted).not.toContain('consent_print')
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

    test('should be in the sitemap while the payment and thanks pages are not', async ({ request }) => {
        const sitemap = await (await request.get('/sitemap-0.xml')).text()
        test.expect(sitemap).toContain('/fi/adoptoi/</loc>')
        for (const path of [
            '/fi/adoptoi/kiitos/',
            '/en/adopt/thanks/',
            '/fi/adoptoi/lahjoita/',
            '/sv/adoptera/donera/',
        ]) {
            test.expect(sitemap).not.toContain(path)
        }
    })

    test('should pass accessibility test', async ({ page }) => {
        await page.goto('/fi/adoptoi/')

        const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(results.violations).toEqual([])
    })

    test('should keep the chosen package visible in forced colours', async ({ page }) => {
        await page.emulateMedia({ forcedColors: 'active' })
        await page.goto('/fi/adoptoi/')
        const chipBg = (value: string) =>
            page
                .locator(`input[name="quantity"][value="${value}"] + .chip`)
                .evaluate((el) => getComputedStyle(el).backgroundColor)
        await page.locator('input[name="quantity"][value="5"]').check({ force: true })
        test.expect(await chipBg('5')).not.toBe(await chipBg('2'))
    })

    // The form sits on a plain background, so contrast is checked there, with every package state.
    for (const path of ['/fi/adoptoi/', '/sv/adoptera/', '/en/adopt/']) {
        test(`should meet WCAG 2.2 AA in the form at ${path}, the featured package chosen or not`, async ({ page }) => {
            await page.goto(path)
            const axe = () =>
                new AxeBuilder({ page })
                    .include('#lomake')
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
                    .analyze()
            test.expect((await axe()).violations).toEqual([])

            await page.locator('input[name="quantity"][value="5"]').check({ force: true })
            test.expect((await axe()).violations).toEqual([])
        })
    }
})

test.describe('Sign adoption page without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('should post a donation without a name as a plain form', async ({ page }) => {
        let posted = ''
        await page.route('https://challenges.cloudflare.com/**', (route) => route.abort())
        // astro preview has no Functions: answer like handleSubmit does for a plain post.
        await page.route('**/api/adoptoi', async (route) => {
            posted = route.request().postData() ?? ''
            await route.fulfill({ headers: { Location: '/fi/adoptoi/lahjoita/?ref=K-12345&n=2&y=0&u=1' }, status: 303 })
        })
        await page.goto('/fi/adoptoi/')
        await page.getByLabel('En halua nimeäni kylttiin').check()
        await test.expect(page.getByLabel('Nimi kylttiin')).toBeHidden()
        await test.expect(page.locator('[data-sign] [data-sticker]')).toBeHidden()
        await test.expect(page.locator('input[name="consent_print"]')).toBeHidden()

        await page.getByText('2 kylttiä · 55 €').click()
        await page.getByLabel('Missä kunnassa toivot kylttisi seisovan?').selectOption('vantaa')
        await page.getByRole('textbox', { name: 'Sähköposti' }).fill('tuki@example.fi')
        await page.locator('button[type="submit"]').click()

        await page.waitForURL('**/fi/adoptoi/lahjoita/?ref=K-12345&n=2&y=0&u=1')
        const body = new URLSearchParams(posted)
        test.expect(body.get('unnamed')).toBe('yes')
        test.expect(body.get('sign_name')).toBe('')
        test.expect(body.get('quantity')).toBe('2')
        test.expect(body.has('consent_print')).toBe(false)
    })
})

test.describe('Sign adoption payment step', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page)
    })

    test('should stay out of search', async ({ page }) => {
        await page.goto('/fi/adoptoi/lahjoita/?ref=K-12345&n=1&y=0')

        await test.expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    })

    test('should reject invalid parameters', async ({ page }) => {
        await page.goto('/fi/adoptoi/lahjoita/?ref=<script>&n=99&y=0')

        await test.expect(page.locator('[data-invalid]')).toBeVisible()
        await test.expect(page.locator('[data-valid]')).toBeHidden()
        await test.expect(page.locator('[data-invalid] a')).toHaveAttribute('href', '/fi/adoptoi/')
    })

    test('should show the amount, MobilePay, the ref and the bank transfer, then link on', async ({ page }) => {
        await page.goto('/fi/adoptoi/lahjoita/?ref=K-12345&n=5&y=0')

        await test.expect(page.getByRole('heading', { level: 1 })).toHaveText('Kylttisi odottaa lahjoitustasi')
        await test.expect(page.locator('[data-almost]')).toHaveText('Melkein valmis: lahjoita 100 € MobilePayllä')
        await test.expect(page.locator('[data-donate]')).toHaveText('Lahjoita 100 euroa MobilePayllä numerolla 46492.')
        await test
            .expect(page.locator('[data-ref-note]'))
            .toHaveText('Kirjoita viestiksi K-12345, niin löydämme lahjoituksesi.')
        await test.expect(page.locator('.transfer')).toContainText('Digitaalisen itsenäisyyden puolesta ry')
        await test.expect(page.locator('.transfer .iban')).toHaveText('FI61 5780 3820 2478 06')
        // Without the edit token there is nothing to save a payer's name or a message with.
        await test.expect(page.locator('[data-payer-form]')).toBeHidden()
        await test.expect(page.locator('[data-message-form]')).toBeHidden()

        const donated = page.getByRole('link', { name: 'Lahjoitin' })
        await test.expect(donated).toHaveAttribute('href', '/fi/adoptoi/kiitos/?ref=K-12345&n=5&y=0')
        await donated.click()
        await page.waitForURL('**/fi/adoptoi/kiitos/?ref=K-12345&n=5&y=0')
    })

    test('should save the payer name and the message with the edit token', async ({ page }) => {
        const posted: unknown[] = []
        await page.route('**/api/adoptoi/viesti', async (route) => {
            posted.push(route.request().postDataJSON())
            await route.fulfill({ json: {} })
        })
        await page.goto('/fi/adoptoi/')
        await page.evaluate(() =>
            sessionStorage.setItem(
                'adoptoi',
                JSON.stringify({ name: 'Sjoerd', quantity: 1, ref: 'K-12345', token: 't' })
            )
        )
        await page.goto('/fi/adoptoi/lahjoita/?ref=K-12345&n=1&y=0')

        await page.getByLabel('Miksi adoptoin? (vapaaehtoinen)').fill('Kirkkonummi ansaitsee paremman.')
        await page.getByRole('button', { name: 'Tallenna viesti' }).click()
        await test
            .expect(page.locator('[data-message-form] [data-status]'))
            .toHaveText('Kiitos! Tarkistamme viestin ennen kuin se näkyy.')
        await page.getByLabel(/^Maksajan nimi/).fill('Anna Virtanen')
        await page.getByRole('button', { exact: true, name: 'Tallenna' }).click()
        await test.expect(page.locator('[data-payer-form] [data-status]')).toHaveText('Tallennettu.')
        test.expect(posted).toEqual([
            { message: 'Kirkkonummi ansaitsee paremman.', ref: 'K-12345', token: 't' },
            { payer_name: 'Anna Virtanen', ref: 'K-12345', token: 't' },
        ])
    })

    test('should ask no message for a donation without a name', async ({ page }) => {
        await page.goto('/fi/adoptoi/')
        await page.evaluate(() =>
            sessionStorage.setItem('adoptoi', JSON.stringify({ name: '', quantity: 2, ref: 'K-12345', token: 't' }))
        )
        await page.goto('/fi/adoptoi/lahjoita/?ref=K-12345&n=2&y=0&u=1')

        await test.expect(page.locator('[data-payer-form]')).toBeVisible()
        await test.expect(page.locator('[data-message-form]')).toBeHidden()
    })

    test('should keep the unnamed flag on the way to the thanks page', async ({ page }) => {
        await page.goto('/fi/adoptoi/lahjoita/?ref=K-12345&n=2&y=0&u=1')

        await test
            .expect(page.getByRole('link', { name: 'Lahjoitin' }))
            .toHaveAttribute('href', '/fi/adoptoi/kiitos/?ref=K-12345&n=2&y=0&u=1')
    })

    test('should skip MobilePay for a company', async ({ page }) => {
        await page.goto('/fi/adoptoi/lahjoita/?ref=K-12345&n=1&y=1')

        await test.expect(page.locator('[data-private]')).toBeHidden()
        await test.expect(page.locator('[data-company]')).toContainText('Lähetämme laskun')
        await test
            .expect(page.getByRole('link', { name: 'Jatka' }))
            .toHaveAttribute('href', '/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=1')
    })

    for (const path of ['/fi/adoptoi/lahjoita/', '/sv/adoptera/donera/', '/en/adopt/donate/']) {
        test(`should meet WCAG 2.2 AA at ${path}`, async ({ page }) => {
            await page.goto(`${path}?ref=K-12345&n=5&y=0`)
            const results = await new AxeBuilder({ page })
                .include('[data-payment]')
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
                .analyze()
            test.expect(results.violations).toEqual([])
        })
    }
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
    })

    test('should hold only the thanks, the share text and the share image', async ({ page }) => {
        await page.goto('/fi/adoptoi/')
        await page.evaluate(() =>
            sessionStorage.setItem(
                'adoptoi',
                JSON.stringify({ name: 'Sjoerd', quantity: 5, ref: 'K-12345', token: 't' })
            )
        )
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=5&y=0')

        await test.expect(page.getByRole('heading', { level: 1 })).toHaveText('Kiitos lahjoituksesta')
        await test.expect(page.locator('[data-share-text]')).toHaveText(/^Adoptoin 5 Lauri Lavannin vaalikylttiä,/)
        await test.expect(page.locator('[data-missing-name]')).toBeHidden()
        for (const gone of ['[data-almost]', '[data-message-form]', '[data-sign]', '.thank-you']) {
            await test.expect(page.locator(gone)).toHaveCount(0)
        }
        const image = page.locator('[data-share-image]')
        await test.expect(image).toHaveAttribute('src', /^blob:/)
        await test.expect(image).toHaveAttribute('alt', 'Jakokuva: Sjoerd adoptoi 5 Lauri Lavannin vaalikylttiä')
        test.expect(await image.evaluate((img: HTMLImageElement) => img.naturalHeight / img.naturalWidth)).toBe(4 / 3)
        await test.expect(page.getByRole('link', { name: 'Lataa kuva' })).toHaveAttribute('href', /^blob:/)
    })

    test('should copy the share text and the image with one click', async ({ browserName, context, page }) => {
        test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-only in Playwright')
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=0')

        const copyText = page.getByRole('button', { name: 'Kopioi teksti' })
        await copyText.click()
        await test.expect(page.locator('[data-copy-text]')).toHaveText('Kopioitu')
        test.expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
            /^Adoptoin Lauri Lavannin vaalikyltin, ja keväällä se nousee tienvarteen/
        )

        await test.expect(page.locator('[data-share-image]')).toHaveAttribute('src', /^blob:/)
        await page.getByRole('button', { name: 'Kopioi kuva' }).click()
        await test.expect(page.locator('[data-copy-image]')).toHaveText('Kopioitu')
        const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((item) => item.types))
        test.expect(types).toContain('image/png')
    })

    test('should ask for the name again when sessionStorage is empty', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=2&y=0')

        await test.expect(page.locator('[data-missing-name]')).toBeVisible()
        await test.expect(page.locator('[data-share-image]')).toHaveAttribute('alt', /Sinun nimesi/)
        await page.getByLabel('Nimi kylttiin').fill('Sjoerd')
        await test.expect(page.locator('[data-share-image]')).toHaveAttribute('alt', /Sjoerd adoptoi 2/)
    })

    test('should thank a donor without a name and share a sign without a sticker', async ({ page }) => {
        await page.goto('/fi/adoptoi/kiitos/?ref=K-12345&n=2&y=0&u=1')

        await test.expect(page.locator('[data-missing-name]')).toBeHidden()
        await test.expect(page.locator('[data-share-text]')).toHaveText(/^Tuin Lauri Lavannin vaalikylttejä/)
        await test
            .expect(page.locator('[data-share-image]'))
            .toHaveAttribute('alt', 'Jakokuva: Tuin Lauri Lavannin vaalikylttejä')
    })

    for (const path of ['/fi/adoptoi/kiitos/', '/sv/adoptera/tack/', '/en/adopt/thanks/']) {
        test(`should meet WCAG 2.2 AA at ${path}`, async ({ page }) => {
            await page.goto(`${path}?ref=K-12345&n=5&y=0`)
            await test.expect(page.locator('[data-share-image]')).toHaveAttribute('src', /^blob:/)
            const results = await new AxeBuilder({ page })
                .include('[data-thanks]')
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
                .analyze()
            test.expect(results.violations).toEqual([])
        })
    }
})
