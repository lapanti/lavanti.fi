import { describe, expect, it } from 'vitest'

import { faqSectionLabels, hasFaqSection } from './faq'

const item = (n: number) => ({ a: `Answer ${n}`, q: `Question ${n}?` })

describe('hasFaqSection', () => {
    it('is false when there is no faq at all', () => {
        expect(hasFaqSection(undefined)).toBe(false)
        expect(hasFaqSection([])).toBe(false)
    })

    it('is false for a single entry, which cannot make a FAQPage rich result', () => {
        expect(hasFaqSection([item(1)])).toBe(false)
    })

    it('is true from two entries up', () => {
        expect(hasFaqSection([item(1), item(2)])).toBe(true)
        expect(hasFaqSection([item(1), item(2), item(3)])).toBe(true)
    })
})

describe('faqSectionLabels', () => {
    it('carries an eyebrow and a heading for every language', () => {
        expect(faqSectionLabels).toEqual({
            en: { eyebrow: 'Q & A', heading: 'Frequently asked questions' },
            fi: { eyebrow: 'Q & A', heading: 'Usein kysyttyä' },
            sv: { eyebrow: 'Q & A', heading: 'Vanliga frågor' },
        })
    })
})
