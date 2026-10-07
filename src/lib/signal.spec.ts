import { describe, expect, it } from 'vitest'

import { handleSignal, SIGNAL_GROUP_URL } from './signal'

describe('handleSignal', () => {
    it('redirects to the Signal group invite with the fragment intact', () => {
        const res = handleSignal()
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toBe(SIGNAL_GROUP_URL)
        expect(new URL(SIGNAL_GROUP_URL).hash.length).toBeGreaterThan(1)
    })

    it('is never cached, so a rotated invite takes effect immediately', () => {
        expect(handleSignal().headers.get('Cache-Control')).toBe('no-store')
    })
})
