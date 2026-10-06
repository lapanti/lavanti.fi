import { getAllByRole } from '@testing-library/dom'
import { describe, expect, it, vi } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { joinPhotos } from '../../content/joinPhotos'
import { getImageSrcset } from '../../lib/images'
import PhotoStrip from './PhotoStrip.astro'

describe('<PhotoStrip />', () => {
    it('should render', async () => {
        const result = await renderAstroComponent(PhotoStrip, { props: { lang: 'fi', photos: joinPhotos } })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('renders one captioned figure per photo with alt in the page locale', async () => {
        const result = await renderAstroComponent(PhotoStrip, { props: { lang: 'sv', photos: joinPhotos } })
        const figures = getAllByRole(result, 'figure')

        expect(figures).toHaveLength(joinPhotos.length)
        figures.forEach((figure, i) => {
            const img = figure.querySelector('img')!
            expect(img.getAttribute('alt')).toBe(joinPhotos[i].alt.sv)
            expect(figure.querySelector('figcaption')!.textContent).toContain(joinPhotos[i].caption.sv)
        })
    })

    it('credits only the photos that carry a photographer', async () => {
        const result = await renderAstroComponent(PhotoStrip, { props: { lang: 'en', photos: joinPhotos } })
        const credits = getAllByRole(result, 'figure').map((figure) =>
            figure.querySelector('.credit')?.textContent?.trim()
        )

        expect(credits).toEqual(['Photo: Erkki Laine', 'Photo: Erkki Laine', undefined])
    })

    it('uses the localised credit prefix', async () => {
        const result = await renderAstroComponent(PhotoStrip, { props: { lang: 'fi', photos: joinPhotos } })

        expect(result.querySelector('.credit')!.textContent!.trim()).toBe('Kuva: Erkki Laine')
    })

    it('lazy-loads every image without a fetch priority', async () => {
        const result = await renderAstroComponent(PhotoStrip, { props: { lang: 'fi', photos: joinPhotos } })

        for (const img of result.querySelectorAll('img')) {
            expect(img.getAttribute('loading')).toBe('lazy')
            expect(img.hasAttribute('fetchpriority')).toBe(false)
        }
    })

    it('lays three photos out as a grid and more than three as a scroll-snapped row', async () => {
        const three = await renderAstroComponent(PhotoStrip, { props: { lang: 'fi', photos: joinPhotos } })
        const four = await renderAstroComponent(PhotoStrip, {
            props: { lang: 'fi', photos: [...joinPhotos, { ...joinPhotos[0], slug: 'neljas' }] },
        })

        expect(three.querySelector('ul')!.classList.contains('grid')).toBe(true)
        expect(four.querySelector('ul')!.classList.contains('scroll')).toBe(true)
    })

    it('makes a scroll row focusable with an accessible name, and leaves the grid alone', async () => {
        const four = [...joinPhotos, { ...joinPhotos[0], slug: 'neljas' }]
        const scroll = await renderAstroComponent(PhotoStrip, { props: { label: 'Juuret', lang: 'fi', photos: four } })
        const grid = await renderAstroComponent(PhotoStrip, {
            props: { label: 'Tiimi', lang: 'fi', photos: joinPhotos },
        })

        expect(scroll.querySelector('ul')!.getAttribute('tabindex')).toBe('0')
        expect(scroll.querySelector('ul')!.getAttribute('aria-label')).toBe('Juuret')
        expect(grid.querySelector('ul')!.hasAttribute('tabindex')).toBe(false)
        expect(grid.querySelector('ul')!.hasAttribute('aria-label')).toBe(false)
    })

    it('lets the layout prop override the count rule', async () => {
        const result = await renderAstroComponent(PhotoStrip, {
            props: { lang: 'fi', layout: 'scroll', photos: joinPhotos },
        })

        expect(result.querySelector('ul')!.classList.contains('scroll')).toBe(true)
    })

    // getImageSrcset is mocked globally in tests/setup.ts, so assert the call, not the URL math.
    it('requests the body variant with each photo’s own widths', async () => {
        vi.mocked(getImageSrcset).mockClear()
        const result = await renderAstroComponent(PhotoStrip, { props: { lang: 'fi', photos: joinPhotos } })

        expect(vi.mocked(getImageSrcset).mock.calls).toEqual(
            joinPhotos.map(({ slug, widths }) => [slug, 'body', widths])
        )
        const descriptors = [...result.querySelectorAll('img')].map((img) =>
            [...img.getAttribute('srcset')!.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]))
        )
        expect(descriptors).toEqual(joinPhotos.map(({ widths }) => widths))
    })
})
