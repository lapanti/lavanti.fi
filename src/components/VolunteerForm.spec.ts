import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import VolunteerForm from './VolunteerForm.astro'

describe('<VolunteerForm lang="fi" />', () => {
    it('posts natively to the sign-up function', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const form = result.querySelector('form')

        expect(form?.getAttribute('action')).toBe('/api/liity')
        expect(form?.getAttribute('method')).toBe('post')
    })

    it('asks only for the agreed fields', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const names = [...result.querySelectorAll('input, select')].map((el) => el.getAttribute('name'))

        expect(new Set(names)).toEqual(
            new Set([
                'lang',
                'utm_source',
                'utm_campaign',
                'name',
                'email',
                'phone',
                'municipality',
                'help',
                'website',
                'consent',
            ])
        )
    })

    it('requires consent and links it to the privacy notice', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const consent = result.querySelector('input[name="consent"]')

        expect(consent?.hasAttribute('required')).toBe(true)
        expect(result.querySelector('a[href="/fi/tietosuoja/"]')).not.toBeNull()
    })

    it('hides the honeypot from people and assistive tech', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const trap = result.querySelector('input[name="website"]')

        expect(trap?.getAttribute('tabindex')).toBe('-1')
        expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull()
    })

    it('puts a focusable error box before the first field', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const box = result.querySelector('#volunteer-error')

        expect(box?.getAttribute('tabindex')).toBe('-1')
        expect(box?.getAttribute('role')).toBe('alert')
        expect(result.querySelector('#lomake')?.firstElementChild).toBe(box)
    })

    it('keeps typed values for an error round-trip but never the consent', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const script = [...result.querySelectorAll('script')].map((s) => s.textContent).join('\n')

        expect(script).toContain("var KEY = 'volunteer-form'")
        expect(script).toContain("var FIELDS = ['name', 'email', 'phone', 'municipality']")
        expect(script).not.toMatch(/data\.consent|data\[.consent.\]/)
    })

    it('renders the Turnstile widget', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })

        const widget = result.querySelector('.cf-turnstile')

        expect(widget?.getAttribute('data-sitekey')).toBe('0x4AAAAAAFMh8S3Jk7UPxASR')
        expect(widget?.getAttribute('data-language')).toBe('fi')
    })
})

describe.each([
    ['sv', '/sv/dataskydd/', 'Anmäl dig'],
    ['en', '/en/privacy-policy/', 'Sign up'],
] as const)('<VolunteerForm lang="%s" />', (lang, privacyHref, submit) => {
    it('posts its language and links its own privacy page', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang } })

        expect(result.querySelector('input[name="lang"]')?.getAttribute('value')).toBe(lang)
        expect(result.querySelector(`a[href="${privacyHref}"]`)).not.toBeNull()
        expect(result.querySelector('button[type="submit"]')?.textContent).toBe(submit)
    })
})
