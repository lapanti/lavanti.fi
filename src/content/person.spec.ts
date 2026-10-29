import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { personDescription } from './person'

type Lang = keyof typeof personDescription

const FRONT = { en: 'en/index.mdx', fi: 'fi/index.mdx', sv: 'sv/index.mdx' }
const ABOUT = { en: 'en/about/index.mdx', fi: 'fi/laurista/index.mdx', sv: 'sv/om-lauri/index.mdx' }
const ELECTIONS = { en: 'en/elections/index.mdx', fi: 'fi/eduskuntavaalit/index.mdx', sv: 'sv/riksdagsvalet/index.mdx' }

/** Frontmatter is YAML and cannot import, so these copies are literal (front FAQ, elections intro). */
const LITERAL = [FRONT, ELECTIONS]
/** Page bodies render the sentence from person.ts (front WhoBio, about background). */
const IMPORTED = [FRONT, ABOUT]

const read = (page: string) => readFileSync(join(process.cwd(), 'src/pages', page), 'utf8')

/*
 * Answer engines assemble a candidate from what is said about him across sources, so the
 * tunnistelause only works if it reads identically everywhere. A reworded copy fragments
 * the signal.
 */
describe('tunnistelause', () => {
    for (const pages of LITERAL) {
        for (const [lang, page] of Object.entries(pages) as [Lang, string][]) {
            it(`should appear verbatim in the frontmatter of ${page}`, () => {
                expect(read(page)).toContain(personDescription[lang])
            })
        }
    }

    for (const pages of IMPORTED) {
        for (const [lang, page] of Object.entries(pages) as [Lang, string][]) {
            it(`should be rendered from person.ts in the body of ${page}`, () => {
                expect(read(page)).toContain(`{personDescription.${lang}}`)
            })
        }
    }
})
