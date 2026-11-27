import { describe, expect, it } from 'vitest'

import { LANGS } from './nav'
import { PLEDGE_KINDS, pledges, sortedPledges } from './pledges'
import { tags } from './tags'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

describe('pledges data', () => {
    it('should export a non-empty array', () => {
        expect(pledges.length).toBeGreaterThan(0)
    })

    it('every id should be unique kebab-case', () => {
        const ids = pledges.map((p) => p.id)

        expect(new Set(ids).size).toBe(ids.length)
        for (const id of ids) {
            expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        }
    })

    it('every kind should be a known value', () => {
        for (const p of pledges) {
            expect(PLEDGE_KINDS).toContain(p.kind)
        }
    })

    it('every signedDate should be a real ISO date', () => {
        for (const p of pledges) {
            expect(p.signedDate).toMatch(ISO_DATE)
            expect(new Date(`${p.signedDate}T00:00:00Z`).toISOString().slice(0, 10)).toBe(p.signedDate)
        }
    })

    it('every url should be https', () => {
        for (const p of pledges) {
            expect(p.url).toMatch(/^https:\/\//)
            for (const o of p.organizers) {
                expect(o.url).toMatch(/^https:\/\//)
            }
        }
    })

    it('every entry should have title and summary in all locales', () => {
        for (const p of pledges) {
            for (const lang of LANGS) {
                expect(p.locales[lang]?.title, `${p.id} ${lang} title`).toBeTruthy()
                expect(p.locales[lang]?.summary, `${p.id} ${lang} summary`).toBeTruthy()
            }
        }
    })

    it('a note, when present in one locale, should be present in all', () => {
        for (const p of pledges) {
            const withNote = LANGS.filter((lang) => p.locales[lang].note)

            expect([0, LANGS.length]).toContain(withNote.length)
        }
    })

    it('every entry should name at least one organizer in all locales', () => {
        for (const p of pledges) {
            expect(p.organizers.length).toBeGreaterThan(0)
            for (const o of p.organizers) {
                for (const lang of LANGS) {
                    expect(o.name[lang], `${p.id} organizer ${lang}`).toBeTruthy()
                }
            }
        }
    })

    it('every tag should exist', () => {
        const known = new Set(tags.map((t) => t.id))

        for (const p of pledges) {
            for (const tag of p.tags ?? []) {
                expect(known.has(tag), `${p.id}: ${tag}`).toBe(true)
            }
        }
    })
})

describe('sortedPledges', () => {
    it('should order newest first', () => {
        const base = pledges[0]
        const older = { ...base, id: 'older', signedDate: '2026-01-01' }
        const newer = { ...base, id: 'newer', signedDate: '2026-12-01' }

        expect(sortedPledges([older, newer]).map((p) => p.id)).toEqual(['newer', 'older'])
    })
})
