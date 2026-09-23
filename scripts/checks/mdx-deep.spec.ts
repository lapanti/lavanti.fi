import { describe, expect, it } from 'vitest'

import {
    checkFile,
    fmField,
    FRESHNESS_DAYS,
    PASSAGE_WORD_MAX,
    proseParagraphs,
    splitMdx,
    stripMarkup,
    wordCount,
} from './mdx-deep'

// ── shared test fixtures ──────────────────────────────────────────────────────

const TODAY = new Date('2026-05-02')

const VALID_BODY_LINES = [
    '',
    '## Miksi tekoäly muuttaa kaiken?',
    '',
    'Tekoäly tekee kahdessa minuutissa sen, mihin kehittäjältä meni ennen kaksi viikkoa.',
    'Tämä muutos on perustavanlaatuinen.',
    '',
    '### Miten tämä näkyy käytännössä?',
    '',
    'Konkretia: koodin tuottaminen automatisoituu, päätöksenteko ei.',
    '',
    '[Lue lisää tekoälystä](/fi/blog/47/vuosi-2026-on-tekoalyn/)',
    '[Digitaalinen itsenäisyys](/fi/blog/53/digitaalinen-itsenaisyys/)',
    '[Tekoäly julkisessa hallinnossa](/fi/blog/44/tekoaly-ei-pysty-mihin-tahansa/)',
]

function validBody() {
    return VALID_BODY_LINES.join('\n')
}

// ── splitMdx ─────────────────────────────────────────────────────────────────

describe('splitMdx', () => {
    it('returns empty frontmatter and full content when no --- delimiters', () => {
        const content = 'no frontmatter here'
        const { body, frontmatter } = splitMdx(content)

        expect(frontmatter).toBe('')
        expect(body).toBe(content)
    })

    it('splits frontmatter and body correctly', () => {
        const content = '---\ntitle: foo\n---\nbody content\n'
        const { body, frontmatter } = splitMdx(content)

        expect(frontmatter).toBe('title: foo')
        expect(body).toBe('body content\n')
    })
})

// ── fmField ───────────────────────────────────────────────────────────────────

describe('fmField', () => {
    it('extracts double-quoted values', () => {
        expect(fmField('title: "hello world"', 'title')).toBe('hello world')
    })

    it('extracts single-quoted values', () => {
        expect(fmField("title: 'hello world'", 'title')).toBe('hello world')
    })

    it('handles Finnish special characters', () => {
        expect(fmField("title: 'Tekoäly muuttaa kehittäjän palkan'", 'title')).toBe('Tekoäly muuttaa kehittäjän palkan')
    })

    it('returns null when field is absent', () => {
        expect(fmField('lang: fi', 'slug')).toBeNull()
    })

    it("unescapes YAML's doubled single quote instead of truncating", () => {
        expect(fmField("title: 'David''s plan for Kirkkonummi''s schools'", 'title')).toBe(
            "David's plan for Kirkkonummi's schools"
        )
        expect(fmField("description: 'Ends with a quote'''\nalt: 'x'", 'description')).toBe("Ends with a quote'")
    })
})

// ── wordCount ─────────────────────────────────────────────────────────────────

describe('wordCount', () => {
    it('counts words correctly', () => {
        expect(wordCount('one two three')).toBe(3)
    })

    it('returns 0 for empty/whitespace', () => {
        expect(wordCount('  ')).toBe(0)
    })
})

// ── proseParagraphs ───────────────────────────────────────────────────────────

describe('proseParagraphs', () => {
    it('excludes headings and code blocks', () => {
        const body = '## Heading\n\nSome prose paragraph here.\n\n```js\nconst x = 1\n```\n'
        const paras = proseParagraphs(body)

        expect(paras).toHaveLength(1)
        expect(paras[0]).toBe('Some prose paragraph here.')
    })
})

// ── stripMarkup ───────────────────────────────────────────────────────────────

describe('stripMarkup', () => {
    it('converts links to their label text', () => {
        expect(stripMarkup('[read more](/fi/blog/1/slug/)')).toBe('read more')
    })

    it('removes heading markers', () => {
        expect(stripMarkup('## A heading')).toBe('A heading')
    })

    it('removes image syntax entirely', () => {
        expect(stripMarkup('![alt text](image.jpg)')).toBe('')
    })
})

// ── checkFile: passage length ─────────────────────────────────────────────────

describe('checkFile — passage length', () => {
    const base = { isBlogPost: false, today: TODAY }

    it(`errors when a prose paragraph exceeds ${PASSAGE_WORD_MAX} words`, () => {
        const longPara = Array.from({ length: PASSAGE_WORD_MAX + 10 }, (_, i) => `word${i}`).join(' ')
        const body = `\n## Heading\n\n${longPara}\n`
        const errors = checkFile({ body, ...base })

        expect(errors.some((e) => e.includes('prose passage too long'))).toBe(true)
    })

    it('passes when paragraphs are within the limit', () => {
        const shortPara = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ')
        const body = `\n## Heading\n\n${shortPara}\n`
        const errors = checkFile({ body, ...base })

        expect(errors.some((e) => e.includes('prose passage too long'))).toBe(false)
    })

    it('runs passage check for non-blog pages too', () => {
        const longPara = Array.from({ length: PASSAGE_WORD_MAX + 5 }, (_, i) => `word${i}`).join(' ')
        const body = `\n${longPara}\n`
        const errors = checkFile({ body, isBlogPost: false, today: TODAY })

        expect(errors.some((e) => e.includes('prose passage too long'))).toBe(true)
    })
})

// ── checkFile: freshness ──────────────────────────────────────────────────────

describe('checkFile — freshness', () => {
    const base = { body: validBody(), isBlogPost: true }

    it(`errors when publishDate is >${FRESHNESS_DAYS} days ago and updatedDate is absent`, () => {
        const errors = checkFile({ ...base, publishDate: '2025-11-01', today: TODAY, updatedDate: null })

        expect(errors.some((e) => e.includes('no updatedDate'))).toBe(true)
    })

    it('passes when post is fresh (under 90 days)', () => {
        const errors = checkFile({ ...base, publishDate: '2026-04-01', today: TODAY, updatedDate: null })

        expect(errors.some((e) => e.includes('no updatedDate'))).toBe(false)
    })

    it('passes when updatedDate is present even if post is old', () => {
        const errors = checkFile({ ...base, publishDate: '2025-11-01', today: TODAY, updatedDate: '2026-04-01' })

        expect(errors.some((e) => e.includes('no updatedDate'))).toBe(false)
    })

    it('does not run freshness check for non-blog pages', () => {
        const errors = checkFile({
            ...base,
            isBlogPost: false,
            publishDate: '2025-01-01',
            today: TODAY,
            updatedDate: null,
        })

        expect(errors.some((e) => e.includes('no updatedDate'))).toBe(false)
    })
})
