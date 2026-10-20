import { getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import AuthorCard from './AuthorCard.astro'

describe('<AuthorCard />', () => {
    it('links the name to the about page in the page language', async () => {
        const fi = await renderAstroComponent(AuthorCard, { props: { image: 'Some-photo', lang: 'fi' } })
        const sv = await renderAstroComponent(AuthorCard, { props: { image: 'Some-photo', lang: 'sv' } })

        expect(getByRole(fi, 'link', { name: 'Lauri Lavanti' }).getAttribute('href')).toBe('/fi/laurista/')
        expect(getByRole(sv, 'link', { name: 'Lauri Lavanti' }).getAttribute('href')).toBe('/sv/om-lauri/')
    })

    it('renders the given portrait as a decorative avatar', async () => {
        const result = await renderAstroComponent(AuthorCard, { props: { image: 'Some-photo', lang: 'en' } })
        const img = result.querySelector('img')

        expect(img?.getAttribute('alt')).toBe('')
        expect(img?.getAttribute('src')).toContain('/Some-photo/')
    })

    it('shows the job title and short bio in the page language', async () => {
        const result = await renderAstroComponent(AuthorCard, { props: { image: 'Some-photo', lang: 'en' } })

        expect(result.textContent).toContain('lead developer')
        expect(result.textContent).toContain('digitally independent Finland')
    })
})
