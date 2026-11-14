import { describe, expect, it } from 'vitest'

import {
    type Adoption,
    adoptionSlug,
    capCheck,
    donation,
    formatPages,
    looksLikeCompany,
    mailtoUrl,
    pageEntry,
    payerKey,
    payerTotals,
    printCsv,
    resolveIds,
    sameName,
} from './entry'

const row = (patch: Partial<Adoption> = {}): Adoption => ({
    approved_at: null,
    billing_address: null,
    business_id: null,
    company_name: null,
    consent_page_at: null,
    created_at: '2026-11-14T10:00:00Z',
    email: 'sjoerd@example.fi',
    id: 1,
    lang: 'fi',
    message: null,
    message_approved_at: null,
    municipality: 'kirkkonummi',
    paid_via: null,
    payer_name: null,
    printed_at: null,
    public: 0,
    quantity: 1,
    ref_code: 'K-12345',
    sign_name: 'Sjoerd',
    status: 'pending',
    ...patch,
})

describe('looksLikeCompany', () => {
    it.each(['Paja Oy', 'Paja Oyj', 'Kahvila Ab', 'Tmi Virtanen', 'Lohjan Sport ry', 'Rakennus Ky.', 'Osuuskunta Osk'])(
        'flags %s',
        (name) => expect(looksLikeCompany(name)).toBe(true)
    )

    it.each(['Sjoerd', 'Abraham Oyelaran', 'Ryan', 'Kyösti'])('lets %s through', (name) => {
        expect(looksLikeCompany(name)).toBe(false)
    })
})

describe('payer totals and caps', () => {
    it('keys the giver by company, then payer, then sign name', () => {
        expect(payerKey(row({ company_name: 'Paja Oy', payer_name: 'Matti' }))).toBe('paja oy')
        expect(payerKey(row({ payer_name: ' Matti  Meikäläinen ' }))).toBe('matti meikäläinen')
        expect(payerKey(row())).toBe('sjoerd')
    })

    it('compares names without case or spacing', () => {
        expect(sameName(' sjoerd ', 'Sjoerd')).toBe(true)
        expect(sameName('Matti', 'Sjoerd')).toBe(false)
    })

    it('sums approved donations per giver', () => {
        const totals = payerTotals([row({ quantity: 2 }), row({ quantity: 3 }), row({ sign_name: 'Anna' })])
        expect(totals.get('sjoerd')).toBe(150)
        expect(totals.get('anna')).toBe(30)
        expect(donation(row({ quantity: 20 }))).toBe(600)
    })

    it('warns from 2 000 euros and stops above 6 000', () => {
        expect(capCheck(1990)).toBe('ok')
        expect(capCheck(2000)).toBe('warn')
        expect(capCheck(6000)).toBe('warn')
        expect(capCheck(6030)).toBe('stop')
    })
})

describe('resolveIds', () => {
    it('accepts ids and refs and reports the rest', () => {
        const rows = [row(), row({ id: 2, ref_code: 'K-22222' })]
        expect(resolveIds(['1', 'K-22222', '9', 'K-00000'], rows)).toEqual({ ids: [1, 2], unknown: ['9', 'K-00000'] })
    })
})

describe('adoptionSlug', () => {
    it('strips diacritics and punctuation', () => {
        expect(adoptionSlug('Åsa Ødegaard', [])).toBe('asa-odegaard')
        expect(adoptionSlug("Anna-Liisa O'Brien Jr.", [])).toBe('anna-liisa-o-brien-jr')
    })

    it('avoids taken and reserved slugs', () => {
        expect(adoptionSlug('Sjoerd', ['sjoerd', 'sjoerd-2'])).toBe('sjoerd-3')
        expect(adoptionSlug('Kiitos', [])).toBe('kiitos-2')
        expect(adoptionSlug('…', [])).toBe('kummi')
    })
})

describe('pageEntry', () => {
    it('carries only an approved message', () => {
        expect(pageEntry(row({ message: 'Hei' }), [])).toEqual({ lang: 'fi', name: 'Sjoerd', slug: 'sjoerd' })
        expect(pageEntry(row({ message: 'Hei', message_approved_at: '2026-11-14' }), [])).toEqual({
            lang: 'fi',
            message: 'Hei',
            name: 'Sjoerd',
            slug: 'sjoerd',
        })
        expect(formatPages([])).toBe('[]\n')
    })
})

describe('mailtoUrl', () => {
    it('opens a confirmation in the adopter language', () => {
        const url = mailtoUrl(row({ lang: 'sv', quantity: 2 }))
        expect(url.startsWith('mailto:sjoerd@example.fi?subject=')).toBe(true)
        expect(decodeURIComponent(url)).toContain('Dina skyltar är adopterade')
        expect(decodeURIComponent(url)).toContain('K-12345')
    })
})

describe('printCsv', () => {
    it('quotes cells that need it', () => {
        const csv = printCsv([row({ company_name: 'Paja "Oy", Ab', sign_name: 'Paja Oy' })])
        expect(csv).toBe(
            'id,ref_code,sign_name,quantity,municipality,company_name\n1,K-12345,Paja Oy,1,kirkkonummi,"Paja ""Oy"", Ab"\n'
        )
    })
})
