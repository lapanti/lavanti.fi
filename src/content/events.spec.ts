import { describe, expect, it } from 'vitest'

import { campaignEvents } from './events'

const LANGS = ['en', 'fi', 'sv'] as const

describe('campaign events data', () => {
    it('should export a non-empty array', () => {
        expect(campaignEvents.length).toBeGreaterThan(0)
    })

    it('every entry should have an ISO calendar date', () => {
        for (const event of campaignEvents) {
            expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
    })

    it('should be ordered chronologically', () => {
        const dates = campaignEvents.map((event) => event.date)

        expect(dates).toEqual([...dates].sort())
    })

    it('every entry should have a unique id', () => {
        const ids = campaignEvents.map((event) => event.id)

        expect(new Set(ids).size).toBe(ids.length)
    })

    it('every entry should have non-empty locale strings in all languages', () => {
        for (const event of campaignEvents) {
            for (const lang of LANGS) {
                expect(event.locales[lang].description).toBeTruthy()
                expect(event.locales[lang].locality).toBeTruthy()
                expect(event.locales[lang].title).toBeTruthy()
                expect(event.locales[lang].venue).toBeTruthy()
            }
        }
    })

    it('every entry should carry a postal address for the Event JSON-LD', () => {
        for (const event of campaignEvents) {
            expect(event.postalCode).toMatch(/^\d{5}$/)
            expect(event.streetAddress).toBeTruthy()
        }
    })

    it('every entry with a clock time should have it as HH:MM', () => {
        for (const event of campaignEvents.filter((e) => e.startTime)) {
            expect(event.startTime).toMatch(/^\d{2}:\d{2}$/)
        }

        for (const event of campaignEvents.filter((e) => e.endTime)) {
            expect(event.endTime).toMatch(/^\d{2}:\d{2}$/)
        }
    })

    it('every Facebook link should be an https Facebook URL', () => {
        for (const event of campaignEvents.filter((e) => e.fbUrl)) {
            expect(event.fbUrl).toMatch(/^https:\/\/(fb\.me|(www\.)?facebook\.com)\//)
        }
    })

    it('should not give an entry an end time without a start time', () => {
        for (const event of campaignEvents.filter((e) => e.endTime)) {
            expect(event.startTime).toBeTruthy()
        }
    })
})
