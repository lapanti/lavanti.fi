import { describe, expect, it } from 'vitest'

import { buildEntry, bumpUpdatedDate, makeSlug, type Submission } from './entry'

const submission: Submission = {
    created_at: '2026-10-09T12:00:00.000Z',
    id: '0b5e6a1c-2f3d-4e5f-8a9b-0c1d2e3f4a5b',
    name: 'Roni Öberg',
    photo_type: 'image/jpeg',
    recommendation: 'Laurin kanssa voi luottaa siihen, että näkemyksen taustalla on ajattelua.',
    title_en: null,
    title_fi: 'Ohjelmapäällikkö',
    title_sv: 'Programledare',
}

describe('makeSlug', () => {
    it.each([
        ['Juho Makkonen', 'Juho-Makkonen'],
        ['Roni Öberg', 'Roni-Oberg'],
        ['Allu Pyhälammi', 'Allu-Pyhalammi'],
        ['Anna-Liisa Åström ', 'Anna-Liisa-Astrom'],
        ["Ville O'Brien", 'Ville-O-Brien'],
    ])('%s → %s', (name, slug) => {
        expect(makeSlug(name)).toBe(slug)
    })
})

describe('buildEntry', () => {
    it('maps the submission onto the data file shape with uninflected alt text', () => {
        expect(buildEntry(submission, { en: 'Program Manager', sv: 'Programledare' })).toEqual({
            image: 'Roni-Oberg',
            locales: {
                en: { alt: 'Portrait of Roni Öberg', title: 'Program Manager' },
                fi: { alt: 'Roni Öberg, muotokuva', title: 'Ohjelmapäällikkö' },
                sv: { alt: 'Roni Öberg, porträtt', title: 'Programledare' },
            },
            name: 'Roni Öberg',
            recommendation: submission.recommendation,
        })
    })
})

describe('bumpUpdatedDate', () => {
    it('replaces the frontmatter date only', () => {
        const mdx = "---\ntitle: 'x'\nupdatedDate: '2026-08-25'\n---\n\nText updatedDate: '2020-01-01'\n"
        expect(bumpUpdatedDate(mdx, '2026-10-09')).toBe(
            "---\ntitle: 'x'\nupdatedDate: '2026-10-09'\n---\n\nText updatedDate: '2020-01-01'\n"
        )
    })

    it('throws when the page has no updatedDate', () => {
        expect(() => bumpUpdatedDate("---\ntitle: 'x'\n---\n", '2026-10-09')).toThrow()
    })
})
