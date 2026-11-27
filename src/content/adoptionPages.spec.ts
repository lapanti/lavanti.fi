import { describe, expect, it } from 'vitest'

import { adoptionPages, adoptionPagesFor, validateAdoptionPages } from './adoptionPages'

const page = { lang: 'fi', name: 'Sjoerd', slug: 'sjoerd' }

describe('adoptionPages', () => {
    it('loads the committed list', () => {
        expect(Array.isArray(adoptionPages)).toBe(true)
        expect(adoptionPagesFor('fi').every((p) => p.lang === 'fi')).toBe(true)
    })

    it('keeps a valid entry and drops an empty message', () => {
        expect(validateAdoptionPages([{ ...page, message: '' }])).toEqual([page])
        expect(validateAdoptionPages([{ ...page, message: 'Hei' }])).toEqual([{ ...page, message: 'Hei' }])
    })

    it.each([
        [{}, 'not an array'],
        [[{ ...page, slug: 'Sjoerd' }], 'bad slug'],
        [[{ ...page, slug: 'kiitos' }], 'reserved'],
        [[page, page], 'duplicate'],
        [[{ ...page, name: 'S' }], 'bad name'],
        [[{ ...page, lang: 'de' }], 'bad lang'],
        [[{ ...page, message: 'x'.repeat(141) }], 'bad message'],
    ])('rejects %j (%s)', (entries, reason) => {
        expect(() => validateAdoptionPages(entries)).toThrow(reason === 'not an array' ? /array/ : reason)
    })
})
