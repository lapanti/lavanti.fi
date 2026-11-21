import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import TitleBanner from './TitleBanner.astro'

describe('<TitleBanner />', () => {
    const title = 'Test Title'
    const createdAt = '2026-01-01T00:00:00Z'

    it('should render', async () => {
        const result = await renderAstroComponent(TitleBanner, {
            props: {
                createdAt,
                tags: ['artificial-intelligence'],
                title,
            },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('shows the sign in place of the split hero photo when asked', async () => {
        const props = {
            heroImage: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-hero-pysty-v2',
            lang: 'fi',
            mobileHeroImage: 'Lauri-Lavanti-kerrostalopihalla-kadet-taskuissa-hero-vaaka',
            title,
            variant: 'split',
        }
        const sign = await renderAstroComponent(TitleBanner, { props: { ...props, heroSign: true } })
        expect(sign.querySelector('picture')).toBeNull()
        const figure = sign.querySelector('.hero-sign .sign-graphic')
        expect(figure?.getAttribute('aria-hidden')).toBe('true')
        // Left out of setSignName: the hero keeps the ghost text while the form's sign updates.
        expect(figure?.hasAttribute('data-sign')).toBe(false)
        expect(figure?.querySelector('[data-sign-name]')?.textContent).toContain('Sinun')
    })
})
