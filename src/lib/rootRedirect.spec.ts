import { describe, expect, it } from 'vitest'

import { handleRoot, rootTarget } from './rootRedirect'

describe('rootTarget', () => {
    it.each([
        [null, '/fi/'],
        ['', '/fi/'],
        ['fi-FI,fi;q=0.9', '/fi/'],
        ['sv-SE,sv;q=0.9,en;q=0.8', '/sv/'],
        ['SV', '/sv/'],
        ['en-US,en;q=0.9', '/fi/'],
        ['de-DE', '/fi/'],
        ['en;q=0.5,sv;q=0.8', '/sv/'],
        ['sv;q=0.5,fi;q=0.8', '/fi/'],
        ['*', '/fi/'],
        ['sv;q=abc,en', '/fi/'],
    ])('maps %j to %s', (header, expected) => {
        expect(rootTarget(header)).toBe(expected)
    })
})

describe('handleRoot', () => {
    it('answers with a one-hop 302 that varies on Accept-Language', () => {
        const response = handleRoot(new Request('https://lavanti.fi/', { headers: { 'Accept-Language': 'sv-FI' } }))

        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toBe('/sv/')
        expect(response.headers.get('Vary')).toBe('Accept-Language')
    })

    it('keeps the query string', () => {
        const response = handleRoot(new Request('https://lavanti.fi/?utm_source=vihreat'))

        expect(response.headers.get('Location')).toBe('/fi/?utm_source=vihreat')
    })
})
