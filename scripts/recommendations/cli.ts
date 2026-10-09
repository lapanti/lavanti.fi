/**
 * Private inbox for the /suosittele recommendation form
 * (spec: .agents/specs/recommendations/submission-form.md).
 *
 *   npm run recommendations -- list
 *   npm run recommendations -- approve <id>
 *   npm run recommendations -- reject <id>
 *
 * approve: asks for any missing sv/en title, normalises the photo to
 * src/images/originals/<slug>.jpg (the local, gitignored archive), appends the entry to
 * src/content/recommendations.json, bumps updatedDate on the three recommendations pages,
 * commits (GPG-signed, so the key must be unlocked) on feat/recommendation-<slug> from
 * origin/main, uploads the photo to Cloudflare Images, pushes, opens the PR, deletes the
 * submission and returns to the starting branch. If a step fails before the commit, the
 * branch and photo are removed so approve can run again; after the commit, the branch is
 * kept and the remaining steps are printed as commands.
 * reject: deletes the submission.
 *
 * Env (.env): RECOMMENDATIONS_TOKEN; for approve also CF_ACCOUNT_ID and CF_API_TOKEN.
 * RECOMMENDATIONS_URL overrides the site origin (default https://lavanti.fi).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { helsinkiDateOf } from '../../src/lib/publishing.ts'
import { buildEntry, bumpUpdatedDate, type Entry, type Submission } from './entry.ts'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const DATA = join(ROOT, 'src/content/recommendations.json')
const ORIGINALS = join(ROOT, 'src/images/originals')
const PAGES = [
    'src/pages/fi/suositukset/index.mdx',
    'src/pages/sv/rekommendationer/index.mdx',
    'src/pages/en/recommendations/index.mdx',
]
const ORIGIN = process.env.RECOMMENDATIONS_URL ?? 'https://lavanti.fi'
const MAX_EDGE = 1680

const exit = (message: string): never => {
    console.error(message)
    process.exit(1)
}

/** Throws, so approve can clean up or report its progress; the dispatcher at the bottom exits. */
const fail = (message: string): never => {
    throw new Error(message)
}

const token = process.env.RECOMMENDATIONS_TOKEN ?? exit('Missing RECOMMENDATIONS_TOKEN (set it in .env).')
const auth = { Authorization: `Bearer ${token}` }

const api = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const res = await fetch(`${ORIGIN}/api/suosittele${path}`, { ...init, headers: { ...auth, ...init.headers } })
    // A 404 from Pages is the whole site's not-found page; the status and its first line are enough.
    if (!res.ok) fail(`${init.method ?? 'GET'} ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`)

    return res
}

const pending = async (): Promise<Submission[]> =>
    ((await (await api('/pending')).json()) as { submissions: Submission[] }).submissions

const find = async (id: string | undefined): Promise<Submission> => {
    if (!id) return fail('Give the submission id; `list` shows them.')
    const s = (await pending()).find((x) => x.id === id)

    return s ?? fail(`No pending submission ${id}.`)
}

const git = (...args: string[]): string => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

/** POSIX single-quoting, so a printed command survives apostrophes and newlines in names. */
const shellQuote = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`

const list = async () => {
    const all = await pending()
    if (all.length === 0) return console.log('No pending recommendations.')
    for (const s of all) {
        console.log(`${s.id}  ${s.created_at.slice(0, 10)}  ${s.name} — ${s.title_fi}`)
        console.log(`    sv: ${s.title_sv ?? '(puuttuu)'} | en: ${s.title_en ?? '(puuttuu)'}`)
        console.log(`    ${s.recommendation}\n`)
    }
}

const askTitles = async (s: Submission): Promise<{ en: string; sv: string }> => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const ask = async (lang: string, given: null | string) => {
        let answer = given ?? ''
        while (answer.trim() === '') answer = await rl.question(`${lang} title for "${s.title_fi}": `)

        return answer.trim()
    }
    const sv = await ask('Swedish', s.title_sv)
    const titles = { en: await ask('English', s.title_en), sv }
    rl.close()

    return titles
}

const uploadToCfImages = async (slug: string, jpeg: Buffer) => {
    const { CF_ACCOUNT_ID: account, CF_API_TOKEN: cfToken } = process.env
    if (!account || !cfToken) fail('Missing CF_ACCOUNT_ID or CF_API_TOKEN (set them in .env).')
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }), `${slug}.jpg`)
    form.append('id', slug)
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/images/v1`, {
        body: form,
        headers: { Authorization: `Bearer ${cfToken}` },
        method: 'POST',
    })
    const body = (await res.json()) as { errors?: { code: number; message: string }[] }
    if (res.ok) return console.log(`Uploaded ${slug} to Cloudflare Images.`)
    if (body.errors?.[0]?.code === 5409) return console.log(`Cloudflare Images already has ${slug}; keeping it.`)
    fail(`Cloudflare Images upload failed: ${JSON.stringify(body.errors)}`)
}

const approve = async (id: string | undefined) => {
    if (git('status', '--porcelain') !== '') fail('Working tree is not clean; commit or stash first.')
    const s = await find(id)
    const titles = await askTitles(s)
    const entry: Entry = buildEntry(s, titles)
    const slug = entry.image
    const relFile = `src/images/originals/${slug}.jpg`
    const file = join(ORIGINALS, `${slug}.jpg`)
    const branch = `feat/recommendation-${slug.toLowerCase()}`

    /*
     * Originals are a local, gitignored archive (Cloudflare Images serves the site), so the
     * photo is checked on disk; the entry is checked on origin/main, where the branch starts.
     */
    git('fetch', 'origin', 'main')
    const onMain = JSON.parse(git('show', 'origin/main:src/content/recommendations.json')) as Entry[]
    if (existsSync(file) || onMain.some((e) => e.image === slug)) {
        fail(`${slug} is already in use; rename by hand or reject the duplicate.`)
    }
    if (git('branch', '--list', branch) !== '' || git('ls-remote', '--heads', 'origin', branch) !== '') {
        fail(`${branch} already exists, probably from an earlier approve that stopped; finish or delete it first.`)
    }

    const photo = Buffer.from(await (await api(`/photo/${s.id}`)).arrayBuffer())
    const jpeg = await sharp(photo)
        .rotate()
        .resize({ fit: 'inside', height: MAX_EDGE, width: MAX_EDGE, withoutEnlargement: true })
        .jpeg({ mozjpeg: true, quality: 90 })
        .toBuffer()

    const title = `feat(recommendations): add ${s.name}`
    const body = `Adds the recommendation from ${s.name} (${s.title_fi}), sent through /suosittele on ${s.created_at.slice(0, 10)}.\n\nAlt text is the default template; refine it here if the photo needs a description.`
    // After the commit, each step with the command that does it by hand if approve stops there.
    const steps: { manual: string; run: () => Promise<unknown> | unknown }[] = [
        {
            manual: `upload ${relFile} to Cloudflare Images with id ${slug}`,
            run: () => uploadToCfImages(slug, jpeg),
        },
        { manual: `git push -u origin ${branch}`, run: () => git('push', '-u', 'origin', branch) },
        {
            manual: `gh pr create --base main --head ${branch} --title ${shellQuote(title)} --body ${shellQuote(body)}`,
            run: () =>
                execFileSync('gh', ['pr', 'create', '--base', 'main', '--title', title, '--body', body], {
                    cwd: ROOT,
                    stdio: 'inherit',
                }),
        },
        { manual: `npm run recommendations -- reject ${s.id}`, run: () => api(`/${s.id}`, { method: 'DELETE' }) },
    ]

    const start = git('rev-parse', '--abbrev-ref', 'HEAD')
    if (start === 'HEAD') fail('HEAD is detached; check out a branch first so approve can return to it.')
    git('switch', '-c', branch, 'origin/main')
    let committed = false
    let done = 0
    try {
        writeFileSync(file, jpeg)
        const fresh = JSON.parse(readFileSync(DATA, 'utf8')) as Entry[]
        writeFileSync(DATA, `${JSON.stringify([...fresh, entry], null, 4)}\n`)
        const today = helsinkiDateOf(new Date())
        for (const page of PAGES) {
            const path = join(ROOT, page)
            writeFileSync(path, bumpUpdatedDate(readFileSync(path, 'utf8'), today))
        }
        // The photo stays out of the commit: it lives in the gitignored originals archive.
        git('add', DATA, ...PAGES.map((p) => join(ROOT, p)))
        // Commit before any external side effect: a locked GPG key fails here, with nothing uploaded.
        execFileSync('git', ['commit', '-S', '-m', title], { cwd: ROOT, stdio: 'inherit' })
        committed = true
        for (const step of steps) {
            await step.run()
            done++
        }
    } catch (err) {
        const reason = errorText(err)
        // A cleanup step that fails is reported after the original reason, never instead of it.
        const cleanupErrors: string[] = []
        const cleanup = (...args: string[]) => {
            try {
                git(...args)
            } catch (cleanupErr) {
                cleanupErrors.push(`  git ${args.join(' ')}: ${errorText(cleanupErr)}`)
            }
        }
        const withCleanup = (lines: string[]) =>
            [...lines, ...(cleanupErrors.length > 0 ? ['Cleanup also failed:', ...cleanupErrors] : [])].join('\n')
        if (!committed) {
            // Nothing has left this machine: drop the branch so approve can simply run again.
            cleanup('reset', '--hard', '-q')
            if (existsSync(file)) rmSync(file)
            cleanup('switch', start)
            cleanup('branch', '-D', branch)
            fail(
                withCleanup([
                    reason,
                    `Nothing was committed or uploaded and ${branch} is removed; fix the cause and approve again.`,
                ])
            )
        }
        cleanup('switch', start)
        fail(
            withCleanup([
                reason,
                `Stopped after the commit${done > 0 ? ` and ${done} of ${steps.length} later steps` : ''}; ${branch} keeps the commit.`,
                'Finish by hand:',
                ...steps.slice(done).map((step) => `  ${step.manual}`),
            ])
        )
    }
    git('switch', start)
    console.log(`Done. Submission ${s.id} deleted from the inbox; back on ${start}.`)
}

const reject = async (id: string | undefined) => {
    const s = await find(id)
    await api(`/${s.id}`, { method: 'DELETE' })
    console.log(`Rejected and deleted ${s.name} (${s.id}).`)
}

const [command, id] = process.argv.slice(2)
const commands: Record<string, () => Promise<void>> = {
    approve: () => approve(id),
    list,
    reject: () => reject(id),
}
try {
    await (
        commands[command ?? ''] ?? (() => fail('Usage: npm run recommendations -- list | approve <id> | reject <id>'))
    )()
} catch (err) {
    exit(errorText(err))
}
