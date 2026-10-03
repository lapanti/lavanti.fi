/**
 * commit-baselines.ts
 *
 * Commits regenerated snapshot baselines to a branch via the GitHub GraphQL
 * createCommitOnBranch mutation. GitHub signs API-created commits with its
 * web-flow key, which satisfies the signed-commit branch protection without
 * any signing key being present in CI (update-screenshots.yml documents the
 * manual locally-signed alternative).
 *
 * Env: GITHUB_TOKEN (PAT so downstream pull_request workflows trigger),
 * GITHUB_REPOSITORY (owner/name), BRANCH (existing branch at current HEAD),
 * COMMIT_MESSAGE. Changed paths are read from `git status --porcelain -- <paths>`,
 * where COMMIT_PATHS is a space-separated pathspec list (default `tests`);
 * campaign-finance-update.yml widens it to commit its src/ edits alongside.
 */

import { execFileSync, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface FileChanges {
    additions: string[]
    deletions: string[]
}

export function parsePorcelain(status: string): FileChanges {
    const additions: string[] = []
    const deletions: string[] = []

    for (const line of status.split('\n')) {
        if (line.trim() === '') continue
        const code = line.slice(0, 2)
        const path = line.slice(3)
        if (code.includes('D')) deletions.push(path)
        else additions.push(path)
    }

    return { additions, deletions }
}

/** Pathspecs to commit: COMMIT_PATHS split on whitespace, `tests` when unset or blank. */
export function commitPaths(value: string | undefined): string[] {
    const paths = (value ?? '').split(/\s+/).filter(Boolean)

    return paths.length > 0 ? paths : ['tests']
}

const MUTATION = `mutation ($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) { commit { oid } }
}`

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
    const { BRANCH, COMMIT_MESSAGE, GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env
    if (!BRANCH || !COMMIT_MESSAGE || !GITHUB_REPOSITORY || !GITHUB_TOKEN) {
        process.stderr.write(
            'commit-baselines: BRANCH, COMMIT_MESSAGE, GITHUB_REPOSITORY and GITHUB_TOKEN are required\n'
        )
        process.exit(2)
    }

    /*
     * -uall lists files inside untracked directories individually (git collapses
     * them to one `dir/` entry by default, which readFileSync can't consume).
     * core.quotePath=false stops git C-quoting non-ASCII paths (e.g. Swedish
     * aria goldens like `…-på-svenska-…`), which would reach readFileSync as a
     * quoted, octal-escaped literal and fail with ENOENT.
     */
    const paths = commitPaths(process.env.COMMIT_PATHS)
    const status = execFileSync(
        'git',
        ['-c', 'core.quotePath=false', 'status', '--porcelain', '-uall', '--', ...paths],
        {
            encoding: 'utf8',
        }
    )
    const { additions, deletions } = parsePorcelain(status)
    if (additions.length === 0 && deletions.length === 0) {
        process.stderr.write(`commit-baselines: no changes under ${paths.join(', ')} to commit\n`)
        process.exit(1)
    }

    const input = {
        branch: { branchName: BRANCH, repositoryNameWithOwner: GITHUB_REPOSITORY },
        expectedHeadOid: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        fileChanges: {
            additions: additions.map((path) => ({ contents: readFileSync(path).toString('base64'), path })),
            deletions: deletions.map((path) => ({ path })),
        },
        message: { headline: COMMIT_MESSAGE },
    }

    const res = await fetch('https://api.github.com/graphql', {
        body: JSON.stringify({ query: MUTATION, variables: { input } }),
        headers: { authorization: `bearer ${GITHUB_TOKEN}` },
        method: 'POST',
    })
    const json = (await res.json()) as {
        data?: { createCommitOnBranch?: { commit?: { oid?: string } } }
        errors?: unknown
    }
    if (!res.ok || json.errors) {
        process.stderr.write(
            `commit-baselines: createCommitOnBranch failed: HTTP ${res.status} ${JSON.stringify(json.errors ?? json)}\n`
        )
        process.exit(2)
    }

    process.stdout.write(
        `Committed ${additions.length} addition(s), ${deletions.length} deletion(s): ${json.data?.createCommitOnBranch?.commit?.oid}\n`
    )
}
