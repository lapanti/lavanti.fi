import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
    extractMdxFields,
    extractTagFields,
    findOverflows,
    HERO_GEOMETRIES,
    PLATE_HEADING_GEOMETRIES,
    segmentWidthPx,
    TOPIC_GEOMETRIES,
    toSegments,
} from './check-overflow.mjs'

const fixture = JSON.parse(readFileSync(new URL('./checks/fixtures/font-metrics-validation.json', import.meta.url)))

describe('segmentWidthPx', () => {
    // Acceptance criterion from #1421: estimates within ~5% of browser-measured
    // widths. The fixture is measured in headless Chromium by
    // scripts/generate-font-metrics.mjs alongside the glyph table.
    it.each(fixture.samples)('estimates $text at $fontPx px within 5% of the browser', ({ fontPx, text, widthPx }) => {
        const estimated = segmentWidthPx(text, fontPx)
        expect(Math.abs(estimated - widthPx) / widthPx).toBeLessThan(0.05)
    })

    it('fits KIRKKONUMMI, the widest passing name, in the 464px topic column', () => {
        expect(segmentWidthPx('KIRKKONUMMI', 88)).toBeLessThanOrEqual(464)
    })

    it('fits DIGITALISATION (461px kerned; a naive advance sum says 469px)', () => {
        expect(segmentWidthPx('DIGITALISATION', 88)).toBeLessThanOrEqual(464)
    })

    it('rejects INFRASTRUKTUR, a #1419 offender, from the 464px topic column', () => {
        expect(segmentWidthPx('INFRASTRUKTUR', 88)).toBeGreaterThan(464)
    })
})

describe('toSegments', () => {
    it('splits on soft hyphens and appends the hyphen the browser paints', () => {
        expect(toSegments('Yksityi­syyden­suoja')).toEqual(['Yksityi-', 'syyden-', 'suoja'])
    })

    it('keeps visible break glyphs on the segment they end', () => {
        expect(toSegments('Sote-uudistus')).toEqual(['Sote-', 'uudistus'])
        expect(toSegments('Otsikko: alaotsikko')).toEqual(['Otsikko:', 'alaotsikko'])
    })

    it('splits on whitespace without residue', () => {
        expect(toSegments('Culture & education')).toEqual(['Culture', '&', 'education'])
    })
})

describe('findOverflows', () => {
    it('flags an unhyphenated wide name against the topic geometry', () => {
        const failures = findOverflows('Infrastruktur', TOPIC_GEOMETRIES)
        expect(failures).toHaveLength(1)
        expect(failures[0].segment).toBe('Infrastruktur')
        expect(failures[0].availPx).toBe(464)
    })

    it('passes the same name once soft-hyphenated', () => {
        expect(findOverflows('Infra­struktur', TOPIC_GEOMETRIES)).toEqual([])
    })

    it('checks hero geometries without false positives on a long real title', () => {
        expect(findOverflows('Aluevaalit 2025', HERO_GEOMETRIES)).toEqual([])
    })

    it('flags the unhyphenated election-page heading against the plate geometry', () => {
        const failures = findOverflows('Miten äänestän eduskuntavaaleissa 2027?', PLATE_HEADING_GEOMETRIES)
        expect(failures).toHaveLength(1)
        expect(failures[0].segment).toBe('eduskuntavaaleissa')
    })

    it('passes the same heading once soft-hyphenated', () => {
        expect(findOverflows('Miten äänestän eduskunta­vaaleissa 2027?', PLATE_HEADING_GEOMETRIES)).toEqual([])
    })

    it('passes the calibration case that renders without overflow', () => {
        // "konkurrenskraft" estimates 331px but does not overflow at 375px —
        // the sv about-page horizontal-scroll e2e is the ground truth.
        expect(
            findOverflows(
                'En teknologiexpert som förenar konkurrenskraft och integritets­skydd',
                PLATE_HEADING_GEOMETRIES
            )
        ).toEqual([])
    })
})

describe('extractMdxFields', () => {
    it('extracts the frontmatter title and body heading props', () => {
        const src = [
            '---',
            "title: 'Ehdolla'",
            '---',
            '',
            '<Plate eyebrow="Vaalit" heading="Eduskuntavaalit 2027 lyhyesti" id="lyhyesti">',
            "<Faq heading='Usein kysyttyä' />",
            '</Plate>',
        ].join('\n')
        const fields = extractMdxFields(src)
        expect(fields.map((f) => [f.field, f.value])).toEqual([
            ['title', 'Ehdolla'],
            ['heading', 'Eduskuntavaalit 2027 lyhyesti'],
            ['heading', 'Usein kysyttyä'],
        ])
        expect(fields[1].geometries).toBe(PLATE_HEADING_GEOMETRIES)
    })
})

describe('extractTagFields', () => {
    it('extracts pageTitle and names locales, resolving \\uXXXX escapes', () => {
        const src = [
            'export const tag = {',
            "    names: { en: 'Infra\\u00ADstructure', fi: 'Infra', sv: 'Infra\\u00ADstruktur' },",
            "    pageTitle: { en: 'Infrastructure – title', fi: 'Infra – otsikko', sv: 'Infrastruktur – rubrik' },",
            '}',
        ].join('\n')
        const fields = extractTagFields(src)
        expect(fields.map((f) => f.field)).toEqual([
            'pageTitle.en',
            'pageTitle.fi',
            'pageTitle.sv',
            'names.en',
            'names.fi',
            'names.sv',
        ])
        const namesSv = fields.find((f) => f.field === 'names.sv')
        expect(namesSv.value).toBe('Infra­struktur')
        expect(namesSv.geometries).toBe(TOPIC_GEOMETRIES)
    })
})
