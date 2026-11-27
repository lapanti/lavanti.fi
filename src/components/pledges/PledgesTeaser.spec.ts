import { getAllByRole, getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { LANGS } from '../../content/nav'
import { pledgePages, sortedPledges } from '../../content/pledges'
import PledgesTeaser from './PledgesTeaser.astro'

describe('<PledgesTeaser />', () => {
    /*
     * No render snapshot: the teaser reads the live pledges data, so a literal-markup
     * snapshot would break on every new entry.
     */
    it('should show at most three of the newest entries', async () => {
        const result = await renderAstroComponent(PledgesTeaser, { props: { id: 'sitoumukset', lang: 'fi' } })
        const expected = sortedPledges()
            .slice(0, 3)
            .map((p) => p.locales.fi.title)

        expect(getAllByRole(result, 'heading', { level: 3 }).map((h) => h.textContent)).toEqual(expected)
    })

    it('should use the section id it is given', async () => {
        const result = await renderAstroComponent(PledgesTeaser, { props: { id: 'pledges', lang: 'en' } })

        expect(result.querySelector('section')?.getAttribute('id')).toBe('pledges')
    })

    it('should link to the pledges page in every locale', async () => {
        for (const lang of LANGS) {
            const result = await renderAstroComponent(PledgesTeaser, { props: { id: 'x', lang } })
            const link = result.querySelector('a.link-rule')

            expect(link?.getAttribute('href')).toBe(pledgePages[lang])
            expect(getByRole(result, 'heading', { level: 2 }).textContent?.trim().endsWith('?')).toBe(true)
        }
    })
})
