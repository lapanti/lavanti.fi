import AxeBuilder from '@axe-core/playwright' /* eslint-disable-line import-x/no-named-as-default */
import test from '@playwright/test'

/*
 * The /suosittele form (spec: .agents/specs/recommendations/submission-form.md). Behavioural
 * checks only: the page is noindex and Finnish only, so it has no screenshot or aria goldens.
 * The Turnstile script is blocked so the run never depends on challenges.cloudflare.com.
 */
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])

test.describe('Recommendation form page', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://challenges.cloudflare.com/**', (route) => route.abort())
    })

    test('should render the form and stay out of search', async ({ page }) => {
        await page.goto('/fi/suosittele/')

        await test.expect(page.getByRole('heading', { level: 1 })).toHaveText('Suosittele Lauria')
        await test.expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
        await test.expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
        const form = page.locator('form#lomake')
        await test.expect(form).toHaveAttribute('action', '/api/suosittele')
        await test.expect(form).toHaveAttribute('enctype', 'multipart/form-data')
        for (const label of ['Nimi', 'Titteli', 'Suositus', 'Kuva itsestäsi']) {
            await test.expect(page.getByLabel(label, { exact: false }).first()).toBeVisible()
        }
    })

    test('should be absent from the sitemap', async ({ request }) => {
        const sitemap = await (await request.get('/sitemap-0.xml')).text()
        test.expect(sitemap).not.toContain('suosittele')
    })

    test('should enable sending once the required fields, photo and consent are given', async ({ page }) => {
        await page.goto('/fi/suosittele/')
        const button = page.getByRole('button', { name: 'Lähetä suositus' })
        await test.expect(button).toHaveAttribute('aria-disabled', 'true')

        await page.getByLabel('Nimi').fill('Testi Henkilö')
        await page.locator('#recommendation-title-fi').fill('Toimitusjohtaja')
        await page.locator('#recommendation-text').fill('Lauri on osaava ja aikaansaava ehdokas.')
        await page
            .locator('#recommendation-photo')
            .setInputFiles({ buffer: JPEG, mimeType: 'image/jpeg', name: 'k.jpg' })
        await test.expect(page.locator('#recommendation-preview')).toBeVisible()
        await test.expect(button).toHaveAttribute('aria-disabled', 'true')

        await page.locator('input[name="consent"]').check()
        await test.expect(button).toHaveAttribute('aria-disabled', 'false')
    })

    test('should show the error a rejected post sends back', async ({ page }) => {
        await page.goto('/fi/suosittele/?virhe=photo#lomake')

        await test.expect(page.getByRole('alert')).toContainText('Valitse kuva uudelleen')
        await test.expect(page.locator('#recommendation-photo')).toHaveAttribute('aria-invalid', 'true')
    })

    test('should pass accessibility test', async ({ page }) => {
        await page.goto('/fi/suosittele/')

        const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
        test.expect(accessibilityScanResults.violations).toEqual([])
    })
})
