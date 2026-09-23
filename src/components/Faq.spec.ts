import { getByRole, getByText, queryByText } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import Faq from './Faq.astro'

describe('<Faq />', () => {
    const faq = [
        { a: 'Because the policy requires it.', q: 'Why is the FAQ visible?' },
        { a: 'Two or more.', q: 'How many entries does it take?' },
    ]

    it('should render', async () => {
        const result = await renderAstroComponent(Faq, {
            props: { eyebrow: 'Q & A', faq, heading: 'Usein kysyttyä' },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should render the eyebrow and the heading it is given', async () => {
        const result = await renderAstroComponent(Faq, {
            props: { eyebrow: 'Q & A', faq, heading: 'Vanliga frågor' },
        })

        expect(getByText(result, 'Q & A')).toBeTruthy()
        expect(getByText(result, 'Vanliga frågor')).toBeTruthy()
    })

    it('should render every question as a heading with its answer', async () => {
        const result = await renderAstroComponent(Faq, {
            props: { eyebrow: 'Q & A', faq, heading: 'Usein kysyttyä' },
        })

        for (const { a, q } of faq) {
            expect(getByRole(result, 'heading', { level: 3, name: q })).toBeTruthy()
            expect(getByText(result, a)).toHaveClass('a1')
        }
    })

    it('should render nothing but the shell for an empty list', async () => {
        const result = await renderAstroComponent(Faq, {
            props: { eyebrow: 'Q & A', faq: [], heading: 'Usein kysyttyä' },
        })

        expect(queryByText(result, faq[0].q)).toBeNull()
    })
})
