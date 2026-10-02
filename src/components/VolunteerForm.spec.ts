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
        expect(result.querySelector('a[href="/fi/tietosuoja/#vapaaehtoiset"]')).not.toBeNull()
    })

    it('hides the honeypot from people and assistive tech', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })
        const trap = result.querySelector('input[name="website"]')

        expect(trap?.getAttribute('tabindex')).toBe('-1')
        expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull()
    })

    it('renders the Turnstile widget', async () => {
        const result = await renderAstroComponent(VolunteerForm, { props: { lang: 'fi' } })

        expect(result.querySelector('.cf-turnstile')?.getAttribute('data-sitekey')).toBeTruthy()
    })
})
