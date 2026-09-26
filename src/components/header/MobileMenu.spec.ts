import { getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import MobileMenu from './MobileMenu.astro'

describe('<MobileMenu />', () => {
    const links = [
        { href: '/fi/about/', label: 'Laurista', title: 'Laurista' },
        { href: '/fi/blog/', label: 'Blogi', title: 'Blogi' },
    ]

    it('should render', async () => {
        const result = await renderAstroComponent(MobileMenu, {
            props: {
                links,
            },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should render a menu button that toggles the nav popover', async () => {
        const result = await renderAstroComponent(MobileMenu, {
            props: {
                links,
            },
        })

        const button = getByRole(result, 'button', { name: 'Valikko' })
        const nav = result.querySelector('nav[popover]')
        expect(button).toHaveAttribute('popovertarget', 'mobile-nav')
        expect(nav).toHaveAttribute('id', 'mobile-nav')
        expect(nav).toHaveAttribute('aria-label', 'Valikko')
    })

    it.each([
        ['en', 'Menu'],
        ['sv', 'Meny'],
    ] as const)('should localize the menu button for %s', async (lang, label) => {
        const result = await renderAstroComponent(MobileMenu, {
            props: {
                lang,
                links,
            },
        })

        expect(getByRole(result, 'button', { name: label })).toHaveAttribute('popovertarget', 'mobile-nav')
    })

    it('should render the main link', async () => {
        const result = await renderAstroComponent(MobileMenu, {
            props: {
                links,
            },
        })

        expect(getByRole(result, 'link', { name: /Lauri Lavanti/i })).toHaveAttribute('href', '/fi/')
    })

    it('should render the main link for sv lang', async () => {
        const result = await renderAstroComponent(MobileMenu, {
            props: {
                lang: 'sv',
                links,
            },
        })

        expect(getByRole(result, 'link', { name: /Lauri Lavanti/i })).toHaveAttribute('href', '/sv/')
    })

    it('should render all given links', async () => {
        const result = await renderAstroComponent(MobileMenu, {
            props: {
                links,
            },
        })

        expect(getByRole(result, 'link', { name: 'Laurista' })).toHaveAttribute('href', '/fi/about/')
        expect(getByRole(result, 'link', { name: 'Blogi' })).toHaveAttribute('href', '/fi/blog/')
    })
})
