import { describe, expect, it } from 'vitest'

import { EMBARGO_DAYS, embargoLiftDate, helsinkiDateOf, helsinkiDayStartUtc, isPublishedBy } from './publishing'

describe('helsinkiDayStartUtc', () => {
    it.each([
        ['winter (+02:00)', '2026-01-15', '2026-01-14T22:00:00.000Z'],
        ['summer (+03:00)', '2026-07-01', '2026-06-30T21:00:00.000Z'],
        // Clocks go forward at 01:00 UTC; local midnight is still on +02:00.
        ['spring-forward day', '2026-03-29', '2026-03-28T22:00:00.000Z'],
        // Clocks go back at 01:00 UTC; local midnight is still on +03:00.
        ['fall-back day', '2026-10-25', '2026-10-24T21:00:00.000Z'],
    ])('%s', (_, day, expected) => {
        expect(helsinkiDayStartUtc(day)).toBe(expected)
    })
})

describe('helsinkiDateOf', () => {
    it('formats as YYYY-MM-DD', () => {
        expect(helsinkiDateOf(new Date('2026-08-31T12:00:00Z'))).toBe('2026-08-31')
    })

    it('rolls to the next day at Helsinki midnight in winter (EET, UTC+2)', () => {
        expect(helsinkiDateOf(new Date('2026-01-15T21:59:59Z'))).toBe('2026-01-15')
        expect(helsinkiDateOf(new Date('2026-01-15T22:00:00Z'))).toBe('2026-01-16')
    })

    it('rolls to the next day at Helsinki midnight in summer (EEST, UTC+3)', () => {
        expect(helsinkiDateOf(new Date('2026-06-15T20:59:59Z'))).toBe('2026-06-15')
        expect(helsinkiDateOf(new Date('2026-06-15T21:00:00Z'))).toBe('2026-06-16')
    })
})

describe('isPublishedBy', () => {
    it('includes past publish dates', () => {
        expect(isPublishedBy('2026-08-30', '2026-08-31')).toBe(true)
    })

    it('includes posts published today', () => {
        expect(isPublishedBy('2026-08-31', '2026-08-31')).toBe(true)
    })

    it('excludes future publish dates', () => {
        expect(isPublishedBy('2026-09-01', '2026-08-31')).toBe(false)
    })

    it('compares across month and year boundaries', () => {
        expect(isPublishedBy('2025-12-31', '2026-01-01')).toBe(true)
        expect(isPublishedBy('2026-10-01', '2026-09-30')).toBe(false)
    })
})

describe('embargoLiftDate', () => {
    it('is 42 days, a whole number of weeks', () => {
        expect(EMBARGO_DAYS).toBe(42)
        expect(EMBARGO_DAYS % 7).toBe(0)
    })

    it('adds the embargo to the send date', () => {
        expect(embargoLiftDate('2026-03-14')).toBe('2026-04-25')
        expect(embargoLiftDate('2026-09-15')).toBe('2026-10-27')
    })

    it('crosses month and year boundaries and the DST switch', () => {
        expect(embargoLiftDate('2026-11-25')).toBe('2027-01-06')
        expect(embargoLiftDate('2026-02-20')).toBe('2026-04-03')
    })
})
