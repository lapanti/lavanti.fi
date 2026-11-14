import { describe, expect, it } from 'vitest'

import { ADOPTION_MUNICIPALITIES } from '../lib/signAdoptions'
import { adoptionContent } from './signAdoption'

const SAMPLE_ARGS: unknown[][] = [
    [1, 24],
    [2, 24],
    ['Sjoerd', 2],
    [{ company: false, name: 'Sjoerd', quantity: 1, ref: 'K-12345' }],
    [{ company: true, name: 'Sjoerd', quantity: 2, ref: 'K-12345' }],
]

/** Every string in a locale; functions are called with each set of sample arguments. */
const strings = (value: unknown): string[] => {
    if (typeof value === 'string') return [value]
    if (typeof value === 'function') {
        const fn = value as (...args: unknown[]) => unknown

        return SAMPLE_ARGS.map((args) => fn(...args)).flatMap(strings)
    }
    if (Array.isArray(value)) return value.flatMap(strings)
    if (value && typeof value === 'object') return Object.values(value).flatMap(strings)

    return []
}

describe('adoptionContent', () => {
    it('labels every municipality in every language', () => {
        for (const t of Object.values(adoptionContent)) {
            expect(Object.keys(t.form.municipalityOptions).sort()).toEqual([...ADOPTION_MUNICIPALITIES].sort())
        }
    })

    it('has an error message for every code the handler sends', () => {
        const codes = [
            'billing_address',
            'business_id',
            'company_name',
            'consent_company',
            'consent_person',
            'consent_print',
            'email',
            'lomake',
            'municipality',
            'palvelu',
            'quantity',
            'sign_name',
            'varmistus',
        ]
        for (const t of Object.values(adoptionContent)) expect(Object.keys(t.form.errors).sort()).toEqual(codes)
    })

    it.each([
        ['fi', /\b(osta\w*|sponsor\w*|mainospaik\w*|näkyvyy\w*|palaut\w*)/i],
        ['sv', /\b(köp\w*|sponsr\w*|sponsor\w*|synlighet|återbetal\w*)/i],
        ['en', /\b(buy\w*|bought|purchas\w*|sponsor\w*|visibility|refund\w*)/i],
    ] as const)('keeps purchase and refund words out of %s', (lang, banned) => {
        for (const s of strings(adoptionContent[lang])) expect(s).not.toMatch(banned)
    })

    it('uses no dashes as punctuation', () => {
        for (const t of Object.values(adoptionContent)) {
            for (const s of strings(t)) expect(s).not.toMatch(/[–—]/)
        }
    })

    it('follows the sign count in the labels', () => {
        const fi = adoptionContent.fi.form
        expect(fi.cta(1)).toBe('Adoptoi kyltti')
        expect(fi.cta(2)).toBe('Adoptoi 2 kylttiä')
        expect(fi.chip(5)).toBe('5 kylttiä · 150 €')
        expect(fi.pinned('Sjoerd', 1)).toBe('Kylttisi: Sjoerd')
        expect(fi.pinned('Sjoerd', 2)).toBe('Kylttisi: Sjoerd · 2 kylttiä')
        expect(fi.consentPrint(2)).toContain('vaalikyltteihin')
        expect(adoptionContent.fi.mobilePay.donate(60)).toBe('Lahjoita 60 euroa MobilePayllä numerolla 46492.')
        expect(adoptionContent.en.form.chip(1)).toBe('1 sign · €30')
        expect(adoptionContent.sv.form.cta(3)).toBe('Adoptera 3 skyltar')
    })

    it('writes the confirmation email without empty double lines', () => {
        const { body, subject } = adoptionContent.fi.mail({
            company: false,
            name: 'Sjoerd',
            quantity: 2,
            ref: 'K-12345',
        })
        expect(subject).toBe('Kylttisi on adoptoitu')
        expect(body).toContain('"Sjoerd"')
        expect(body).toContain('K-12345')
        expect(body).not.toMatch(/\n\n\n/)
        expect(adoptionContent.en.mail({ company: true, name: 'Paja Oy', quantity: 1, ref: 'K-1' }).body).toContain(
            'invoice'
        )
    })
})
