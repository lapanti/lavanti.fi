import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import {
    bodyStateFor,
    buildCorpus,
    faqQuestionsOf,
    hashContent,
    hashDir,
    headingsOf,
    labelFor,
    LEAD_WORD_MAX,
    leadOf,
    stateFor,
} from './corpus'

const mdx = (title: string, description: string, body: string): string =>
    `---\nlang: 'fi'\ntitle: '${title}'\ndescription: '${description}'\n---\n\nimport P from '../../../components/P.astro'\n\nexport const components = { p: P }\n\n${body}\n`

const writeDoc = (
    root: string,
    kind: 'newsletters' | 'posts',
    id: number,
    meta: Record<string, unknown>,
    bodies: Partial<Record<'en' | 'fi' | 'sv', string>>
): string => {
    const dir = join(root, kind, String(id))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id, ...meta }))
    for (const [lang, body] of Object.entries(bodies)) {
        writeFileSync(join(dir, `${lang}.mdx`), mdx(`${lang} title ${id}`, `${lang} description ${id}`, body))
    }

    return dir
}

describe('buildCorpus', () => {
    const root = mkdtempSync(join(tmpdir(), 'jev-corpus-'))
    afterAll(() => rmSync(root, { force: true, recursive: true }))

    const longWords = Array.from({ length: LEAD_WORD_MAX }, (_unused, i) => `w${i}`).join(' ')
    const body = `First paragraph with a [link](/fi/blog/2/slug/) inside.\n\n## Why a heading?\n\nSecond paragraph.\n\n## Another heading\n\n${longWords}\n\nAfter the long one.`
    const postDir = writeDoc(
        root,
        'posts',
        1,
        { publishDate: '2026-01-01', tags: ['economy', 'freedom'] },
        { en: body, fi: body, sv: body }
    )
    writeDoc(
        root,
        'posts',
        2,
        { publishDate: '2999-12-31', tags: ['economy'] },
        { en: 'Future.', fi: 'Tuleva.', sv: 'Framtida.' }
    )
    writeDoc(
        root,
        'newsletters',
        3,
        { publishDate: '2026-02-01', sent: '2025-12-21' },
        { en: 'Issue.', fi: 'Numero.', sv: 'Nummer.' }
    )

    it('returns one Document per post and newsletter with typed keys, future-dated ones included', () => {
        const docs = buildCorpus({ root })

        expect(docs.map((d) => d.key)).toEqual(['newsletter:3', 'post:1', 'post:2'])
        expect(docs.find((d) => d.key === 'post:2')?.publishDate).toBe('2999-12-31')
        expect(docs.find((d) => d.key === 'newsletter:3')?.tags).toEqual([])
        expect(docs.find((d) => d.key === 'post:1')?.tags).toEqual(['economy', 'freedom'])
    })

    it('keeps titles and descriptions whole when the YAML escapes a single quote', () => {
        const dir = join(root, 'posts', '4')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'meta.json'), JSON.stringify({ id: 4, publishDate: '2026-03-01', tags: ['economy'] }))
        for (const lang of ['en', 'fi', 'sv']) {
            writeFileSync(
                join(dir, `${lang}.mdx`),
                `---\ntitle: 'David''s plan'\nslug: 'davids-plan'\ndescription: 'Kirkkonummi''s schools, and more'\n---\n\nBody.\n`
            )
        }
        const doc = buildCorpus({ root }).find((d) => d.key === 'post:4')

        expect(doc?.slug).toBe('davids-plan')
        expect(doc?.title).toBe("David's plan")
        expect(doc?.description).toBe("Kirkkonummi's schools, and more")
        expect(labelFor(doc!)).toBe("David's plan — Kirkkonummi's schools, and more")
    })

    it('reads text from en.mdx by default and from the requested locale otherwise', () => {
        const en = buildCorpus({ root }).find((d) => d.key === 'post:1')
        const fi = buildCorpus({ lang: 'fi', root }).find((d) => d.key === 'post:1')

        expect(en?.title).toBe('en title 1')
        expect(en?.lang).toBe('en')
        expect(en?.slug).toBe('')
        expect(fi?.title).toBe('fi title 1')
        expect(fi?.description).toBe('fi description 1')
    })

    it('exposes headings, a bounded lead and paragraphs with link markup intact', () => {
        const doc = buildCorpus({ root }).find((d) => d.key === 'post:1')

        expect(doc?.h2s).toEqual(['Why a heading?', 'Another heading'])
        expect(doc?.paragraphs[0]).toContain('[link](/fi/blog/2/slug/)')
        expect(doc?.paragraphs).toHaveLength(4)
        expect(doc?.lead).toBe('First paragraph with a link inside.\n\nSecond paragraph.')
    })

    it('hashes every sibling: an fi-only change flips the hash, an idle rerun does not', () => {
        const before = hashDir(postDir)
        const contentBefore = hashContent(postDir)

        expect(hashDir(postDir)).toBe(before)
        writeFileSync(join(postDir, 'fi.mdx'), mdx('fi title 1', 'fi description 1', 'Muutettu.'))
        const afterFi = hashDir(postDir)

        expect(afterFi).not.toBe(before)
        expect(hashContent(postDir)).not.toBe(contentBefore)
        const contentAfterFi = hashContent(postDir)
        writeFileSync(
            join(postDir, 'meta.json'),
            JSON.stringify({ id: 1, publishDate: '2026-01-02', tags: ['economy'] })
        )
        expect(hashDir(postDir)).not.toBe(afterFi)
        // A meta.json-only change (an updatedDate bump) leaves the content hash alone.
        expect(hashContent(postDir)).toBe(contentAfterFi)
        const built = buildCorpus({ root }).find((d) => d.key === 'post:1')

        expect(built?.sourceHash).toBe(hashDir(postDir))
        expect(built?.contentHash).toBe(hashContent(postDir))
    })
})

describe('leadOf', () => {
    it('keeps whole paragraphs while the total stays within the bound', () => {
        const p200 = Array.from({ length: 200 }, () => 'x').join(' ')
        const p298 = Array.from({ length: 298 }, () => 'y').join(' ')

        expect(leadOf([p200, p200, 'tail'])).toBe(p200)
        expect(leadOf(['a b', 'c d', p298])).toBe('a b\n\nc d')
        expect(leadOf(['a b', p298])).toBe(`a b\n\n${p298}`)
    })

    it('always keeps the first paragraph even when it exceeds the bound', () => {
        const p400 = Array.from({ length: 400 }, () => 'x').join(' ')

        expect(leadOf([p400, 'next'])).toBe(p400)
    })

    it('strips markup', () => {
        expect(leadOf(['See **bold** and [a link](/fi/blog/1/x/).'])).toBe('See bold and a link.')
    })
})

describe('headingsOf, stateFor, labelFor', () => {
    it('collects level-two headings by default and level-three on request', () => {
        expect(headingsOf('# H1\n\n## Two?\n\n### Three\n\n## Also two')).toEqual(['Two?', 'Also two'])
        expect(headingsOf('# H1\n\n## Two?\n\n### Three\n\n#### Four', 3)).toEqual(['Three'])
    })

    it('reads faq questions from the frontmatter in every YAML quoting style', () => {
        const fm = [
            "title: 'T'",
            'faq:',
            "  - q: 'Korvaako tekoäly ohjelmoijat?'",
            "    a: 'Ei.'",
            `  - q: "What about ''quotes''?"`,
            '    a: "No."',
            "  - q: 'Mikä on ''lainaus''?'",
            "    a: 'x'",
            '  - q: Bare question?',
            '    a: bare',
            "    - q: 'Deeper indent, as post 74 has'",
            "      a: 'x'",
            'other:',
            "  - q: 'Not in the faq block'",
        ].join('\n')

        expect(faqQuestionsOf(fm)).toEqual([
            'Korvaako tekoäly ohjelmoijat?',
            "What about ''quotes''?",
            "Mikä on 'lainaus'?",
            'Bare question?',
            'Deeper indent, as post 74 has',
        ])
        expect(faqQuestionsOf("title: 'T'\ndescription: 'q: not a faq'")).toEqual([])
        expect(faqQuestionsOf('title: "It\'s"\nfaq:\n  - q: "Isn\'t a bare apostrophe fine?"\n    a: "Yes"')).toEqual([
            "Isn't a bare apostrophe fine?",
        ])
    })

    it('builds a compact state and an English label', () => {
        const doc = {
            body: 'Lead',
            contentHash: 'c',
            description: 'Desc',
            faq: [],
            h2s: ['A?', 'B?'],
            h3s: ['C?'],
            id: 1,
            key: 'post:1' as const,
            kind: 'post' as const,
            lang: 'en' as const,
            lead: 'Lead',
            paragraphs: ['Lead'],
            publishDate: '2026-01-01',
            slug: 'title',
            sourceHash: 'abc',
            tags: [],
            title: 'Title',
        }

        expect(stateFor(doc)).toEqual({ description: 'Desc', headings: 'A?\nB?', lead: 'Lead', title: 'Title' })
        expect(bodyStateFor({ ...doc, paragraphs: ['A [link](/x/) here.', 'Second **bold** one.'] })).toEqual({
            body: 'A link here.\n\nSecond bold one.',
            description: 'Desc',
            headings: 'A?\nB?\nC?',
            title: 'Title',
        })
        expect(labelFor(doc)).toBe('Title — Desc')
        expect(labelFor({ ...doc, description: '' })).toBe('Title')
    })
})
