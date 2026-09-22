import { getByText } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import NewsletterProvenance from './NewsletterProvenance.astro'

describe('<NewsletterProvenance />', () => {
    it('should render', async () => {
        const result = await renderAstroComponent(NewsletterProvenance, { props: { lang: 'fi', sent: '2026-03-14' } })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('renders the send date in the locale sentence with a machine-readable <time>', async () => {
        const result = await renderAstroComponent(NewsletterProvenance, { props: { lang: 'fi', sent: '2026-03-14' } })

        expect(result.querySelector('p')).toHaveTextContent('Lähetetty tilaajille 14.03.2026.')
        expect(result.querySelector('time')).toHaveAttribute('datetime', '2026-03-14')
        expect(getByText(result, '14.03.2026')).toBeDefined()
    })

    it('localises the sentence', async () => {
        const en = await renderAstroComponent(NewsletterProvenance, { props: { lang: 'en', sent: '2026-03-14' } })
        const sv = await renderAstroComponent(NewsletterProvenance, { props: { lang: 'sv', sent: '2026-11-02' } })

        expect(en.querySelector('p')).toHaveTextContent('Sent to subscribers on 14.03.2026.')
        expect(sv.querySelector('p')).toHaveTextContent('Skickat till prenumeranterna 02.11.2026.')
    })
})
