import { getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import DesktopMenu from './DesktopMenu.astro'

describe('<DesktopMenu />', () => {
    const links = [
        { href: '/fi/about/', label: 'Laurista', title: 'Laurista' },
        { href: '/fi/blog/', label: 'Blogi', title: 'Blogi' },
    ]

    it('should render', async () => {
        const result = await renderAstroComponent(DesktopMenu, {
            props: {
                links,
            },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it.each([
        ['fi', 'Päävalikko'],
        ['en', 'Main menu'],
        ['sv', 'Huvudmeny'],
    ] as const)('should name the nav landmark in the page language (%s)', async (lang, label) => {
        const result = await renderAstroComponent(DesktopMenu, {
            props: {
                lang,
                links,
            },
        })

        expect(result.querySelector('nav')).toHaveAttribute('aria-label', label)
    })

    it('should render the main link', async () => {
        const result = await renderAstroComponent(DesktopMenu, {
            props: {
                links,
            },
        })

        expect(getByRole(result, 'link', { name: /Lauri Lavanti/i })).toHaveAttribute('href', '/fi/')
    })

    it('should render the main link for sv lang', async () => {
        const result = await renderAstroComponent(DesktopMenu, {
            props: {
                lang: 'sv',
                links,
            },
        })

        expect(getByRole(result, 'link', { name: /Lauri Lavanti/i })).toHaveAttribute('href', '/sv/')
    })

    it('should render all given links', async () => {
        const result = await renderAstroComponent(DesktopMenu, {
            props: {
                links,
            },
        })

        expect(getByRole(result, 'link', { name: 'Laurista' })).toHaveAttribute('href', '/fi/about/')
        expect(getByRole(result, 'link', { name: 'Blogi' })).toHaveAttribute('href', '/fi/blog/')
    })
})
