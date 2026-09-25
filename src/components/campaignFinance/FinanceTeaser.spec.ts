import { getAllByRole, getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { campaignFinance, financeLabels } from '../../content/campaignFinance'
import { summaryTiles } from '../../lib/campaignFinance'
import FinanceTeaser from './FinanceTeaser.astro'

const LANGS = ['en', 'fi', 'sv'] as const

describe('<FinanceTeaser />', () => {
    it('should render', async () => {
        const result = await renderAstroComponent(FinanceTeaser, {
            props: { href: '/fi/eduskuntavaalit/vaalirahoitus/', id: 'rahoitus', lang: 'fi' },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should show budget, raised, the commitment and the gap', async () => {
        const result = await renderAstroComponent(FinanceTeaser, {
            props: { href: '/fi/eduskuntavaalit/vaalirahoitus/', id: 'rahoitus', lang: 'fi' },
        })

        const labels = getAllByRole(result, 'term').map((node) => node.textContent)

        expect(labels).toEqual([
            financeLabels.fi.budget,
            financeLabels.fi.raised,
            financeLabels.fi.committed,
            financeLabels.fi.gap,
        ])
    })

    it('should read its figures from the campaign finance data', async () => {
        const result = await renderAstroComponent(FinanceTeaser, {
            props: { href: '/fi/eduskuntavaalit/vaalirahoitus/', id: 'rahoitus', lang: 'fi' },
        })
        const definitions = getAllByRole(result, 'definition').map((node) => node.textContent)
        const tiles = summaryTiles(campaignFinance, 'fi')

        expect(definitions).toEqual(tiles.map((tile) => `${tile.value}${tile.note ?? ''}`))
    })

    it('should use the section id it is given', async () => {
        const result = await renderAstroComponent(FinanceTeaser, {
            props: { href: '/en/elections/campaign-finance/', id: 'finance', lang: 'en' },
        })

        expect(result.querySelector('section')?.getAttribute('id')).toBe('finance')
    })

    it('should link to the finance page', async () => {
        const result = await renderAstroComponent(FinanceTeaser, {
            props: { href: '/fi/eduskuntavaalit/vaalirahoitus/', id: 'rahoitus', lang: 'fi' },
        })
        const link = getByRole(result, 'link')

        expect(link.getAttribute('href')).toBe('/fi/eduskuntavaalit/vaalirahoitus/')
        expect(link).toHaveClass('link-rule')
        expect(link).toHaveTextContent(financeLabels.fi.teaser.cta)
    })

    it('should ask its heading as a question in every locale', async () => {
        for (const lang of LANGS) {
            const result = await renderAstroComponent(FinanceTeaser, {
                props: { href: `/${lang}/`, id: 'finance', lang },
            })

            expect(getByRole(result, 'heading', { level: 2 })).toHaveTextContent(financeLabels[lang].teaser.heading)
        }
    })
})
