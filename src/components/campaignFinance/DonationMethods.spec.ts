import { getAllByRole, getByRole } from '@testing-library/dom'
import { afterEach, describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import { campaignFinance, financeLabels, supportAssociation } from '../../content/campaignFinance'
import DonationMethods from './DonationMethods.astro'

const LANGS = ['en', 'fi', 'sv'] as const

const BANK_TERMS = {
    en: '/en/elections/campaign-finance/donation-terms/#bank-transfer',
    fi: '/fi/eduskuntavaalit/vaalirahoitus/lahjoitusehdot/#tilisiirto',
    sv: '/sv/riksdagsvalet/valfinansiering/donationsvillkor/#bankoverforing',
} as const

const render = (lang: (typeof LANGS)[number]) => renderAstroComponent(DonationMethods, { props: { id: 'tue', lang } })

describe('<DonationMethods />', () => {
    const open = campaignFinance.donationsOpen

    afterEach(() => {
        campaignFinance.donationsOpen = open
    })

    it.each(LANGS)('should list MobilePay first and the party page last (%s)', async (lang) => {
        const result = await render(lang)
        const labels = financeLabels[lang].donationMethods
        const titles = getAllByRole(result, 'heading', { level: 3 }).map((node) => node.textContent)

        expect(titles).toEqual([labels.mobilePay.title, labels.bankTransfer.title, labels.card.title])
    })

    it.each(LANGS)('should link the short URLs and the bank transfer terms (%s)', async (lang) => {
        campaignFinance.donationsOpen = true
        const result = await render(lang)
        const hrefs = getAllByRole(result, 'link').map((node) => node.getAttribute('href'))

        expect(hrefs).toEqual(['https://lavanti.fi/mp', BANK_TERMS[lang], 'https://lavanti.fi/lahjoita'])
    })

    it('should offer the MobilePay number, recipient and IBAN for copying', async () => {
        const result = await render('fi')
        const values = [...result.querySelectorAll('button[data-copy]')].map((node) => node.getAttribute('data-copy'))

        expect(values).toEqual([
            supportAssociation.mobilePayNumber,
            supportAssociation.name,
            supportAssociation.iban.replaceAll(' ', ''),
        ])
    })

    it('should keep copy buttons hidden until the script finds the Clipboard API', async () => {
        const result = await render('fi')

        for (const button of result.querySelectorAll('button[data-copy]')) {
            expect(button.hasAttribute('hidden')).toBe(true)
        }
    })

    it('should name the field each copy button copies', async () => {
        const result = await render('fi')
        const labels = financeLabels.fi.donationMethods

        const names = [...result.querySelectorAll('button[data-copy]')].map((node) => node.getAttribute('aria-label'))

        expect(names).toEqual([
            `${labels.copy}: ${labels.mobilePay.number}`,
            `${labels.copy}: ${labels.bankTransfer.recipient}`,
            `${labels.copy}: ${labels.bankTransfer.iban}`,
        ])
    })

    it('should replace only the party link while donations are closed', async () => {
        campaignFinance.donationsOpen = false
        const result = await render('fi')
        const hrefs = getAllByRole(result, 'link').map((node) => node.getAttribute('href'))

        expect(hrefs).not.toContain('https://lavanti.fi/lahjoita')
        expect(hrefs).toContain('https://lavanti.fi/mp')
        expect(result.textContent).toContain(financeLabels.fi.donate.pending)
    })

    it('should use the section id and heading it is given', async () => {
        const result = await render('en')

        expect(result.querySelector('section')?.getAttribute('id')).toBe('tue')
        expect(getByRole(result, 'heading', { level: 2 }).textContent).toContain(
            financeLabels.en.donationMethods.heading
        )
    })
})
