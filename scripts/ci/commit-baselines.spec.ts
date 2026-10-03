import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { commitPaths, parsePorcelain } from './commit-baselines'

describe('commitPaths', () => {
    it('defaults to tests when unset or blank', () => {
        expect(commitPaths(undefined)).toEqual(['tests'])
        expect(commitPaths('  ')).toEqual(['tests'])
    })

    it('splits a space-separated list', () => {
        expect(commitPaths('src tests')).toEqual(['src', 'tests'])
    })
})

describe('parsePorcelain', () => {
    it('splits modified and untracked files into additions', () => {
        const status =
            ' M tests/e2e/blogPage.spec.ts-snapshots/blog-chromium-linux.png\n?? tests/e2e/newPage.spec.ts-snapshots/new-chromium-linux.png\n'
        expect(parsePorcelain(status)).toEqual({
            additions: [
                'tests/e2e/blogPage.spec.ts-snapshots/blog-chromium-linux.png',
                'tests/e2e/newPage.spec.ts-snapshots/new-chromium-linux.png',
            ],
            deletions: [],
        })
    })

    it('splits deleted files into deletions', () => {
        const status =
            ' D tests/e2e/oldPage.spec.ts-snapshots/old-chromium-linux.png\n M tests/e2e/blogPage.spec.ts-snapshots/blog.txt\n'
        expect(parsePorcelain(status)).toEqual({
            additions: ['tests/e2e/blogPage.spec.ts-snapshots/blog.txt'],
            deletions: ['tests/e2e/oldPage.spec.ts-snapshots/old-chromium-linux.png'],
        })
    })

    it('returns empty changes for empty status output', () => {
        expect(parsePorcelain('')).toEqual({ additions: [], deletions: [] })
        expect(parsePorcelain('\n')).toEqual({ additions: [], deletions: [] })
    })
})

/*
 * Regression for the ENOENT that failed scheduled-publish on 2026-09-02: git
 * C-quotes non-ASCII paths under its default core.quotePath=true, so a Swedish
 * aria golden reached readFileSync as a quoted octal-escaped literal. The commit
 * step now runs status with core.quotePath=false; this exercises the real git
 * invocation because the bug lived in the flag, not in parsePorcelain.
 */
describe('status invocation on non-ASCII paths', () => {
    let repo: string
    const relPath =
        'tests/e2e/blogSwePage.spec.ts-snapshots/Blog-Page-på-svenska-should-match-aria-snapshot-1-Google-Chrome.aria.yml'

    beforeEach(() => {
        repo = mkdtempSync(path.join(tmpdir(), 'commit-baselines-'))
        execSync('git init -q', { cwd: repo })
        mkdirSync(path.join(repo, path.dirname(relPath)), { recursive: true })
        writeFileSync(path.join(repo, relPath), 'aria:\n')
    })

    afterEach(() => {
        rmSync(repo, { force: true, recursive: true })
    })

    it('yields a path readFileSync can open', () => {
        const status = execSync('git -c core.quotePath=false status --porcelain -uall -- tests', {
            cwd: repo,
            encoding: 'utf8',
        })
        const { additions } = parsePorcelain(status)
        expect(additions).toEqual([relPath])
        expect(() => readFileSync(path.join(repo, additions[0]))).not.toThrow()
    })
})
