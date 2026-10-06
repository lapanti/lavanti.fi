import { getByRole, queryByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import ImageWithCaption from './ImageWithCaption.astro'

describe('<ImageWithCaption />', () => {
    it('should render nothing when no local image provided', async () => {
        const result = await renderAstroComponent(ImageWithCaption, {
            props: {
                caption: 'Test Caption',
            },
        })

        const figure = queryByRole(result, 'figure')
        expect(figure).toBeNull()
    })

    it('renders only the caption when no photographer is given', async () => {
        const result = await renderAstroComponent(ImageWithCaption, {
            props: { alt: 'Kuvaus', caption: 'Kuvateksti', image: 'kuva-nimesta' },
        })

        const figure = getByRole(result, 'figure')
        expect(figure.getAttribute('aria-label')).toBe('Kuvateksti')
        expect(figure.querySelector('figcaption')!.textContent!.trim()).toBe('Kuvateksti')
        expect(figure.querySelector('.credit')).toBeNull()
    })

    it('renders a localised credit line after the caption when a photographer is given', async () => {
        const result = await renderAstroComponent(ImageWithCaption, {
            props: { alt: 'Bild', caption: 'Bildtext', image: 'kuva-nimesta', lang: 'sv', photographer: 'Erkki Laine' },
        })

        const figure = getByRole(result, 'figure')
        expect(figure.getAttribute('aria-label')).toBe('Bildtext')
        expect(figure.querySelector('.credit')!.textContent!.trim()).toBe('Foto: Erkki Laine')
        expect(figure.querySelector('figcaption')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(
            'Bildtext Foto: Erkki Laine'
        )
    })

    it('defaults the credit prefix to Finnish', async () => {
        const result = await renderAstroComponent(ImageWithCaption, {
            props: { caption: 'Kuvateksti', image: 'kuva-nimesta', photographer: 'Erkki Laine' },
        })

        expect(result.querySelector('.credit')!.textContent!.trim()).toBe('Kuva: Erkki Laine')
    })

    it('lazy-loads the image without a fetch priority', async () => {
        const result = await renderAstroComponent(ImageWithCaption, {
            props: { caption: 'Kuvateksti', image: 'kuva-nimesta' },
        })
        const img = result.querySelector('img')!

        expect(img.getAttribute('loading')).toBe('lazy')
        expect(img.hasAttribute('fetchpriority')).toBe(false)
    })
})
