import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { findOffenders, readUpdatedDate, today, unitOf, withoutUpdatedDate } from './updated-date'

describe('unitOf', () => {
    it('treats a page as its own unit, carrying updatedDate in its frontmatter', () => {
        expect(unitOf('src/pages/fi/yhteystiedot/index.mdx')).toEqual({
            field: 'src/pages/fi/yhteystiedot/index.mdx',
            unit: 'src/pages/fi/yhteystiedot/index.mdx',
        })
    })

    it('folds every locale of a post into one unit keyed on its meta.json', () => {
        const expected = { field: 'src/content/posts/77/meta.json', unit: 'src/content/posts/77' }
        expect(unitOf('src/content/posts/77/fi.mdx')).toEqual(expected)
        expect(unitOf('src/content/posts/77/sv.mdx')).toEqual(expected)
        expect(unitOf('src/content/posts/77/meta.json')).toEqual(expected)
    })

    it('folds every locale of a newsletter issue into one unit keyed on its meta.json', () => {
        const expected = { field: 'src/content/newsletters/1/meta.json', unit: 'src/content/newsletters/1' }
        expect(unitOf('src/content/newsletters/1/en.mdx')).toEqual(expected)
        expect(unitOf('src/content/newsletters/1/meta.json')).toEqual(expected)
    })

    it('ignores files that carry no updatedDate', () => {
        expect(unitOf('src/components/Footer.astro')).toBeNull()
        expect(unitOf('src/content/footer.ts')).toBeNull()
        expect(unitOf('README.md')).toBeNull()
    })
})

describe('withoutUpdatedDate', () => {
    it('blanks the frontmatter field so a bump alone reads as unchanged', () => {
        const a = "---\nlang: fi\nupdatedDate: '2026-01-01'\n---\nBody\n"
        const b = "---\nlang: fi\nupdatedDate: '2026-09-11'\n---\nBody\n"
        expect(withoutUpdatedDate('page.mdx', a)).toBe(withoutUpdatedDate('page.mdx', b))
    })

    it('keeps a real body change visible', () => {
        const a = "---\nupdatedDate: '2026-01-01'\n---\nBody\n"
        const b = "---\nupdatedDate: '2026-01-01'\n---\nDifferent\n"
        expect(withoutUpdatedDate('page.mdx', a)).not.toBe(withoutUpdatedDate('page.mdx', b))
    })

    it('ignores key order and the date in meta.json', () => {
        const a = JSON.stringify({ id: 1, publishDate: '2026-01-01', updatedDate: '2026-01-01' })
        const b = JSON.stringify({ id: 1, publishDate: '2026-01-01', updatedDate: '2026-09-11' })
        expect(withoutUpdatedDate('meta.json', a)).toBe(withoutUpdatedDate('meta.json', b))
    })
})

describe('readUpdatedDate', () => {
    it('reads both shapes', () => {
        expect(readUpdatedDate('page.mdx', "updatedDate: '2026-09-11'\n")).toBe('2026-09-11')
        expect(readUpdatedDate('meta.json', '{"updatedDate":"2026-09-11"}')).toBe('2026-09-11')
    })

    it('returns null when absent or unreadable', () => {
        expect(readUpdatedDate('page.mdx', 'lang: fi\n')).toBeNull()
        expect(readUpdatedDate('meta.json', 'not json')).toBeNull()
        expect(readUpdatedDate('page.mdx', null)).toBeNull()
    })
})

describe('findOffenders', () => {
    const repo = mkdtempSync(join(tmpdir(), 'updated-date-'))
    const git = (...args: string[]): string => execFileSync('git', args, { cwd: repo, encoding: 'utf8' })
    const write = (path: string, content: string): void => {
        mkdirSync(join(repo, path, '..'), { recursive: true })
        writeFileSync(join(repo, path), content)
    }
    const page = (date: string, body: string): string => `---\nlang: fi\nupdatedDate: '${date}'\n---\n${body}\n`

    beforeAll(() => {
        git('init', '-q')
        git('config', 'user.email', 't@example.com')
        git('config', 'user.name', 'Test')
        write('src/pages/fi/sivu/index.mdx', page('2026-01-01', 'Alkuperäinen'))
        mkdirSync(join(repo, 'src/content/posts/77'), { recursive: true })
        write('src/content/posts/77/meta.json', JSON.stringify({ id: 77, updatedDate: '2026-01-01' }))
        write('src/content/posts/77/fi.mdx', '---\nslug: x\n---\nTeksti\n')
        git('add', '-A')
        git('commit', '-qm', 'seed')
    })
    afterAll(() => rmSync(repo, { force: true, recursive: true }))

    const staged = (files: string[]) => findOffenders({ cwd: repo, files, from: 'HEAD', now: '2026-09-11', to: '' })

    it('flags a page whose body changed without a bump', () => {
        write('src/pages/fi/sivu/index.mdx', page('2026-01-01', 'Muutettu'))
        git('add', '-A')
        expect(staged(['src/pages/fi/sivu/index.mdx'])).toEqual([
            { field: 'src/pages/fi/sivu/index.mdx', unit: 'src/pages/fi/sivu/index.mdx' },
        ])
    })

    it('passes once the page bumps its date', () => {
        write('src/pages/fi/sivu/index.mdx', page('2026-09-11', 'Muutettu'))
        git('add', '-A')
        expect(staged(['src/pages/fi/sivu/index.mdx'])).toEqual([])
    })

    it('passes when only the date moved', () => {
        write('src/pages/fi/sivu/index.mdx', page('2026-09-12', 'Muutettu'))
        git('add', '-A')
        expect(staged(['src/pages/fi/sivu/index.mdx'])).toEqual([])
    })

    it("flags a post whose locale file changed, pointing at the post's meta.json", () => {
        write('src/content/posts/77/fi.mdx', '---\nslug: x\n---\nToinen teksti\n')
        git('add', '-A')
        expect(staged(['src/content/posts/77/fi.mdx'])).toEqual([
            { field: 'src/content/posts/77/meta.json', unit: 'src/content/posts/77' },
        ])
    })

    it('passes when the post bumps meta.json alongside the locale file', () => {
        write('src/content/posts/77/meta.json', JSON.stringify({ id: 77, updatedDate: '2026-09-11' }))
        git('add', '-A')
        expect(staged(['src/content/posts/77/fi.mdx', 'src/content/posts/77/meta.json'])).toEqual([])
    })

    it('accepts a second edit on a day the page was already dated', () => {
        write('src/pages/fi/samapaiva/index.mdx', page('2026-09-11', 'Ensimmäinen'))
        git('add', '-A')
        git('commit', '-qm', 'same-day seed')
        write('src/pages/fi/samapaiva/index.mdx', page('2026-09-11', 'Toinen muokkaus'))
        git('add', '-A')
        expect(staged(['src/pages/fi/samapaiva/index.mdx'])).toEqual([])
    })

    it('still flags a stale date that merely is not today', () => {
        write('src/pages/fi/vanha/index.mdx', page('2026-01-01', 'Ensin'))
        git('add', '-A')
        git('commit', '-qm', 'stale seed')
        write('src/pages/fi/vanha/index.mdx', page('2026-01-01', 'Muutettu'))
        git('add', '-A')
        expect(staged(['src/pages/fi/vanha/index.mdx'])).toEqual([
            { field: 'src/pages/fi/vanha/index.mdx', unit: 'src/pages/fi/vanha/index.mdx' },
        ])
    })

    it('flags a date moved backwards, which describes no fresh revision', () => {
        write('src/pages/fi/taakse/index.mdx', page('2026-05-05', 'Ensin'))
        git('add', '-A')
        git('commit', '-qm', 'backwards seed')
        write('src/pages/fi/taakse/index.mdx', page('2026-01-01', 'Muutettu'))
        git('add', '-A')
        expect(staged(['src/pages/fi/taakse/index.mdx'])).toEqual([
            { field: 'src/pages/fi/taakse/index.mdx', unit: 'src/pages/fi/taakse/index.mdx' },
        ])
    })

    it('ignores a newly added page, which sets its dates at creation', () => {
        write('src/pages/fi/uusi/index.mdx', page('2026-09-11', 'Uusi'))
        git('add', '-A')
        expect(staged(['src/pages/fi/uusi/index.mdx'])).toEqual([])
    })
})

describe('today', () => {
    it('formats local time the way the frontmatter does', () => {
        expect(today(new Date(2026, 8, 1))).toBe('2026-09-01')
        expect(today(new Date(2026, 11, 31))).toBe('2026-12-31')
    })
})
