/**
 * openverse.ts
 *
 * Author-run: finds CC0, PDM and CC BY images on Openverse for a post hero,
 * downloads the chosen original into src/images/originals/ (not committed)
 * for scripts/upload-to-cf-images.mts, and prints the `heroImageCredit`
 * block for the post's meta.json. Never part of the build.
 *
 * Usage:
 *   npm run openverse -- search <query…> [--aspect wide|square|tall] [--size small|medium|large] [--n 20] [--json]
 *   npm run openverse -- fetch <id> --slug <cf-image-id> [--dry-run]
 *   npm run openverse -- credit <id> [--modified]
 *
 * Anonymous by default; OPENVERSE_CLIENT_ID/SECRET in .env raise the rate
 * limit and the page size. Spec: .agents/specs/images/spec.md § Hero image credit
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import {
    assertAllowed,
    assertUuid,
    authToken,
    detailUrl,
    extFor,
    filterResults,
    getJson,
    heroCredit,
    maxPageSize,
    type OpenverseImage,
    searchUrl,
    USER_AGENT,
} from './lib/openverse.ts'
/* eslint-enable import-x/extensions */

export const USAGE = `usage:
  npm run openverse -- search <query…> [--aspect wide|square|tall] [--size small|medium|large] [--n 20] [--json]
  npm run openverse -- fetch <id> --slug <cf-image-id> [--dry-run]
  npm run openverse -- credit <id> [--modified]`

export interface Io {
    fetch: typeof fetch
    log: (s: string) => void
    originalsDir: string
}

const SLUG = /^[A-Za-z0-9][A-Za-z0-9-]*$/

const trunc = (s: null | string | undefined, n: number): string => {
    const str = String(s ?? '')

    return str.length > n ? `${str.slice(0, n - 1)}…` : str
}

async function search(q: string, flags: Record<string, boolean | string | undefined>, io: Io): Promise<void> {
    const token = await authToken({ fetchImpl: io.fetch })
    const url = searchUrl(q, {
        aspect: flags.aspect as string | undefined,
        maxPage: maxPageSize(token),
        n: flags.n as string | undefined,
        size: flags.size as string | undefined,
    })
    const data = await getJson<{ result_count: number; results: OpenverseImage[] }>(url, { fetchImpl: io.fetch, token })
    const rows = filterResults(data.results)
    if (flags.json) {
        io.log(JSON.stringify({ result_count: data.result_count, results: rows }, null, 2))
        return
    }
    io.log(`${data.result_count} matches (CC0/PDM/CC BY); showing ${rows.length}`)
    for (const r of rows) {
        const lic = `${String(r.license).toUpperCase()} ${r.license_version ?? ''}`.trim()
        io.log(
            `${r.id}  ${lic}  ${r.width ?? '?'}×${r.height ?? '?'}  ${trunc(r.title, 40)} — ${trunc(r.creator, 24)} [${r.provider ?? '?'}]\n` +
                `    ${r.foreign_landing_url ?? ''}\n    ${r.url ?? ''}`
        )
    }
}

async function fetchCmd(id: string, slug: string | undefined, dryRun: boolean, io: Io): Promise<void> {
    assertUuid(id)
    if (!slug || !SLUG.test(slug)) throw new Error('fetch needs --slug <cf-image-id> (letters, digits, hyphens)')
    const token = await authToken({ fetchImpl: io.fetch })
    const item = await getJson<OpenverseImage>(detailUrl(id), { fetchImpl: io.fetch, token })
    assertAllowed(item)
    if (!item.url) throw new Error(`${id}: no file URL in the Openverse record`)
    const path = join(io.originalsDir, `${slug}${extFor(item)}`)
    const lic = `${String(item.license).toUpperCase()} ${item.license_version ?? ''}`.trim()
    if (dryRun) {
        io.log(`would download ${item.url} → ${path} (${lic}); verify on ${item.foreign_landing_url ?? '?'}`)
        return
    }
    const res = await io.fetch(item.url, { headers: { 'user-agent': USER_AGENT } })
    if (!res.ok) throw new Error(`download ${item.url}: HTTP ${res.status}`)
    mkdirSync(io.originalsDir, { recursive: true })
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
    io.log(`${item.id} → ${path}`)
    io.log(`license: ${lic} — VERIFY on ${item.foreign_landing_url ?? '?'}`)
    io.log(`next: upload it, set heroImage "${slug}", then \`npm run openverse -- credit ${item.id}\``)
}

async function creditCmd(id: string, modified: boolean, io: Io): Promise<void> {
    assertUuid(id)
    const token = await authToken({ fetchImpl: io.fetch })
    const item = await getJson<OpenverseImage>(detailUrl(id), { fetchImpl: io.fetch, token })
    io.log(JSON.stringify({ heroImageCredit: heroCredit(item, { modified }) }, null, 4))
}

export async function main(argv: string[], io: Io): Promise<number> {
    const { positionals, values } = parseArgs({
        allowPositionals: true,
        args: argv,
        options: {
            aspect: { type: 'string' },
            'dry-run': { type: 'boolean' },
            json: { type: 'boolean' },
            modified: { type: 'boolean' },
            n: { type: 'string' },
            size: { type: 'string' },
            slug: { type: 'string' },
        },
    })
    const [cmd, ...rest] = positionals
    if (cmd === 'search' && rest.length) await search(rest.join(' '), values, io)
    else if (cmd === 'fetch' && rest.length === 1) await fetchCmd(rest[0], values.slug, values['dry-run'] ?? false, io)
    else if (cmd === 'credit' && rest.length === 1) await creditCmd(rest[0], values.modified ?? false, io)
    else throw new Error(USAGE)
    return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const io: Io = {
        fetch,
        log: (s) => console.log(s),
        originalsDir: resolve(fileURLToPath(import.meta.url), '../../src/images/originals'),
    }
    main(process.argv.slice(2), io).then(
        (code) => (process.exitCode = code),
        (e: unknown) => {
            console.error(`openverse: ${e instanceof Error ? e.message : String(e)}`)
            process.exitCode = 2
        }
    )
}
