import { describe, expect, it } from 'vitest'

import { formatAge, formatCohortValue } from './pensionCharts'

const NBSP = ' '

describe('formatAge', () => {
    it('should print whole years without months', () => {
        expect(formatAge(65, 'fi')).toBe(`65${NBSP}v`)
    })

    it('should round decimal years to the nearest month', () => {
        expect(formatAge(65.58, 'fi')).toBe(`65${NBSP}v 7${NBSP}kk`)
        expect(formatAge(67.42, 'sv')).toBe(`67${NBSP}år 5${NBSP}mån`)
        expect(formatAge(67.92, 'en')).toBe(`67${NBSP}y 11${NBSP}mo`)
    })
})

describe('formatCohortValue', () => {
    it('should print a ratio with a decimal comma in Finnish', () => {
        expect(formatCohortValue(2, 'times', 'fi')).toBe('2,0×')
    })

    it('should print a percentage the way the other charts do', () => {
        expect(formatCohortValue(12.4, 'percent', 'fi')).toBe(`12,4${NBSP}%`)
        expect(formatCohortValue(12.4, 'percent', 'en')).toBe('12.4%')
    })
})
