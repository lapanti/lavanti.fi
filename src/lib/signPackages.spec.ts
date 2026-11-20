import { describe, expect, it } from 'vitest'

import {
    byPackage,
    isPackage,
    MAX_SIGNS,
    PACKAGE_SIGNS,
    packageEuros,
    perSignEuros,
    SIGN_PACKAGES,
} from './signPackages'

describe('sign packages', () => {
    it('offers 1, 2, 3, 5 and 10 signs, one sign at 30 €', () => {
        expect(PACKAGE_SIGNS).toEqual([1, 2, 3, 5, 10])
        expect(MAX_SIGNS).toBe(10)
        expect(packageEuros(1)).toBe(30)
    })

    it('makes every bigger package cheaper per sign and dearer in total', () => {
        for (const [prev, next] of SIGN_PACKAGES.slice(1).map((p, i) => [SIGN_PACKAGES[i], p])) {
            expect(perSignEuros(next)).toBeLessThan(perSignEuros(prev))
            expect(next.euros).toBeGreaterThan(prev.euros)
        }
    })

    it('features exactly the five-sign package at 100 €', () => {
        expect(SIGN_PACKAGES.filter((p) => p.featured)).toEqual([{ euros: 100, featured: true, signs: 5 }])
    })

    it('never lets a smaller package cost more than the featured one', () => {
        for (const p of SIGN_PACKAGES.filter((x) => x.signs < 5)) expect(p.euros).toBeLessThan(100)
    })

    it('rejects counts no package offers', () => {
        expect(isPackage(4)).toBe(false)
        expect(isPackage(20)).toBe(false)
        expect(() => packageEuros(4)).toThrow(RangeError)
    })

    it('keys values by sign count', () => {
        expect(byPackage((p) => p.euros)).toEqual({ 1: 30, 2: 55, 3: 80, 5: 100, 10: 190 })
        expect(perSignEuros({ euros: 55, signs: 2 })).toBe(27.5)
    })
})
