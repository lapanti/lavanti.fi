import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { personDescription } from './person'

const PAGES = {
    en: ['en/index.mdx', 'en/about/index.mdx', 'en/elections/index.mdx'],
    fi: ['fi/index.mdx', 'fi/laurista/index.mdx', 'fi/eduskuntavaalit/index.mdx'],
    sv: ['sv/index.mdx', 'sv/om-lauri/index.mdx', 'sv/riksdagsvalet/index.mdx'],
} as const

/*
 * Answer engines assemble a candidate from what is said about him across sources, so the
 * tunnistelause only works if it reads identically everywhere. The front, about and
 * elections pages each carry it verbatim; a reworded copy fragments the signal.
 */
describe('tunnistelause', () => {
    for (const [lang, pages] of Object.entries(PAGES) as [keyof typeof PAGES, readonly string[]][]) {
        for (const page of pages) {
            it(`should appear verbatim on ${page}`, () => {
                const source = readFileSync(join(process.cwd(), 'src/pages', page), 'utf8')
                expect(source).toContain(personDescription[lang])
            })
        }
    }
})
