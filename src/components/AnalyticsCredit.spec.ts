import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import { footerAnalyticsCreditHref } from '../content/footer'
import AnalyticsCredit from './AnalyticsCredit.astro'

describe('<AnalyticsCredit />', () => {
    it('renders the Simple Analytics text link with the detector URL intact', async () => {
        const result = await renderAstroComponent(AnalyticsCredit, { props: { href: footerAnalyticsCreditHref } })
        const link = result.querySelector('a.sa-credit')

        expect(link?.getAttribute('href')).toBe(
            'https://www.simpleanalytics.com/lavanti.fi?utm_source=lavanti.fi&utm_content=badge'
        )
        expect(link?.getAttribute('aria-label')).toBe('100% privacy-first analytics by Simple Analytics')
        expect(link?.getAttribute('lang')).toBe('en')
        expect(link?.querySelector('.sa-credit__caption')?.textContent).toBe('100% privacy-first analytics')
        expect(link?.querySelector('.sa-credit__byline svg')?.getAttribute('aria-hidden')).toBe('true')
    })
})
