import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import {
    authToken,
    extFor,
    filterResults,
    heroCredit,
    licenseLabel,
    maxPageSize,
    type OpenverseImage,
    searchUrl,
} from './lib/openverse'
import { type Io, main, USAGE } from './openverse'

const ID = '0aff3595-8168-440b-83ff-7a80b65dea42'

const item = (over: Partial<OpenverseImage> = {}): OpenverseImage => ({
    creator: 'Jane Doe',
    creator_url: 'https://example.org/jane',
    filetype: 'jpg',
    foreign_landing_url: 'https://example.org/photo',
    height: 800,
    id: ID,
    license: 'by',
    license_url: 'https://creativecommons.org/licenses/by/2.0/',
    license_version: '2.0',
    mature: false,
    provider: 'flickr',
    title: 'Server hall',
    url: 'https://example.org/photo.jpg',
    width: 1000,
    ...over,
})

const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, status })

/** A fetch stub that answers by URL prefix and records each request URL. */
const stubFetch = (routes: Record<string, () => Response>) => {
    const calls: string[] = []
    const impl = (async (input: Request | string | URL) => {
        const url = String(input)
        calls.push(url)
        const key = Object.keys(routes).find((k) => url.startsWith(k))
        if (!key) throw new Error(`unexpected fetch ${url}`)
        return routes[key]()
    }) as typeof fetch

    return { calls, impl }
}

const dirs: string[] = []
const tempDir = (): string => {
    const d = mkdtempSync(join(tmpdir(), 'openverse-'))
    dirs.push(d)
    return d
}
afterAll(() => dirs.forEach((d) => rmSync(d, { force: true, recursive: true })))

const run = async (argv: string[], fetchImpl: typeof fetch, originalsDir = tempDir()) => {
    const out: string[] = []
    const io: Io = { fetch: fetchImpl, log: (s) => out.push(s), originalsDir }
    const code = await main(argv, io)

    return { code, out: out.join('\n') }
}

describe('searchUrl', () => {
    it('fixes the license and mature filters', () => {
        const p = new URL(searchUrl(' data centre ', { aspect: 'wide' })).searchParams
        expect(p.get('q')).toBe('data centre')
        expect(p.get('license')).toBe('cc0,pdm,by')
        expect(p.get('mature')).toBe('false')
        expect(p.get('aspect_ratio')).toBe('wide')
    })

    it('caps the page size by auth state', () => {
        expect(new URL(searchUrl('x', { maxPage: maxPageSize(null), n: 99 })).searchParams.get('page_size')).toBe('20')
        expect(new URL(searchUrl('x', { maxPage: maxPageSize('t'), n: 99 })).searchParams.get('page_size')).toBe('50')
    })

    it('rejects an empty query', () => {
        expect(() => searchUrl('  ')).toThrow('empty query')
    })
})

describe('filterResults', () => {
    it('drops disallowed licences and mature results', () => {
        const rows = [
            item(),
            item({ id: 'nc', license: 'by-nc' }),
            item({ id: 'm', mature: true }),
            item({ id: 'z', license: 'CC0' }),
        ]
        expect(filterResults(rows).map((r) => r.id)).toEqual([ID, 'z'])
    })
})

describe('extFor', () => {
    it('maps the filetype, then the URL, then falls back to .jpg', () => {
        expect(extFor(item({ filetype: 'jpeg' }))).toBe('.jpg')
        expect(extFor(item({ filetype: null, url: 'https://x/y.PNG?s=1' }))).toBe('.png')
        expect(extFor(item({ filetype: 'gif', url: 'https://x/y.gif' }))).toBe('.jpg')
    })
})

describe('licenseLabel', () => {
    it('labels the three allowed licences', () => {
        expect(licenseLabel(item())).toBe('CC BY 2.0')
        expect(licenseLabel(item({ license: 'cc0', license_version: '1.0' }))).toBe('CC0 1.0')
        expect(licenseLabel(item({ license: 'pdm', license_version: null }))).toBe('Public Domain Mark')
    })

    it('throws on anything else', () => {
        expect(() => licenseLabel(item({ license: 'by-sa' }))).toThrow('not allowed')
    })
})

describe('heroCredit', () => {
    it('returns TASL fields for meta.json', () => {
        expect(heroCredit(item(), { modified: true })).toEqual({
            creator: 'Jane Doe',
            creatorUrl: 'https://example.org/jane',
            landingUrl: 'https://example.org/photo',
            license: 'CC BY 2.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
            modified: true,
            title: 'Server hall',
        })
    })

    it('omits empty fields', () => {
        expect(heroCredit(item({ creator: ' ', creator_url: null, title: '' }))).toEqual({
            landingUrl: 'https://example.org/photo',
            license: 'CC BY 2.0',
            licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
            modified: false,
        })
    })

    it('refuses a disallowed licence', () => {
        expect(() => heroCredit(item({ license: 'by-nd' }))).toThrow('refused')
    })
})

describe('authToken', () => {
    it('is null without credentials', async () => {
        expect(await authToken({ env: {} })).toBeNull()
    })

    it('exchanges client credentials for a token', async () => {
        const { calls, impl } = stubFetch({
            'https://api.openverse.org/v1/auth_tokens': () => json({ access_token: 'tok' }),
        })
        const env = { OPENVERSE_CLIENT_ID: 'id', OPENVERSE_CLIENT_SECRET: 's' }
        expect(await authToken({ env, fetchImpl: impl })).toBe('tok')
        expect(calls).toHaveLength(1)
    })
})

describe('main', () => {
    it('prints usage for an unknown command', async () => {
        const { impl } = stubFetch({})
        await expect(run(['nope'], impl)).rejects.toThrow(USAGE)
    })

    it('search lists only allowed results', async () => {
        const { impl } = stubFetch({
            'https://api.openverse.org/v1/images/?': () =>
                json({ result_count: 2, results: [item(), item({ id: 'nc', license: 'by-nc' })] }),
        })
        const { out } = await run(['search', 'data', 'centre'], impl)
        expect(out).toContain('2 matches (CC0/PDM/CC BY); showing 1')
        expect(out).toContain(`${ID}  BY 2.0  1000×800  Server hall — Jane Doe [flickr]`)
        expect(out).not.toContain('nc  ')
    })

    it('fetch saves the original under the slug', async () => {
        const dir = tempDir()
        const { impl } = stubFetch({
            [`https://api.openverse.org/v1/images/${ID}/`]: () => json(item()),
            'https://example.org/photo.jpg': () => new Response('JPEGBYTES'),
        })
        const { out } = await run(['fetch', ID, '--slug', 'datakeskus-vaaka'], impl, dir)
        expect(readFileSync(join(dir, 'datakeskus-vaaka.jpg'), 'utf8')).toBe('JPEGBYTES')
        expect(out).toContain('VERIFY on https://example.org/photo')
    })

    it('fetch --dry-run downloads nothing', async () => {
        const dir = tempDir()
        const { calls, impl } = stubFetch({ [`https://api.openverse.org/v1/images/${ID}/`]: () => json(item()) })
        await run(['fetch', ID, '--slug', 'x', '--dry-run'], impl, dir)
        expect(calls).toHaveLength(1)
        expect(existsSync(join(dir, 'x.jpg'))).toBe(false)
    })

    it('fetch refuses a disallowed licence before downloading', async () => {
        const { calls, impl } = stubFetch({
            [`https://api.openverse.org/v1/images/${ID}/`]: () => json(item({ license: 'by-nc' })),
        })
        await expect(run(['fetch', ID, '--slug', 'x'], impl)).rejects.toThrow('refused')
        expect(calls).toHaveLength(1)
    })

    it('fetch validates the id and the slug', async () => {
        const { impl } = stubFetch({})
        await expect(run(['fetch', '0aff3595', '--slug', 'x'], impl)).rejects.toThrow('UUID')
        await expect(run(['fetch', ID, '--slug', '../x'], impl)).rejects.toThrow('--slug')
    })

    it('credit prints the meta.json block', async () => {
        const { impl } = stubFetch({ [`https://api.openverse.org/v1/images/${ID}/`]: () => json(item()) })
        const { out } = await run(['credit', ID, '--modified'], impl)
        expect(JSON.parse(out)).toEqual({ heroImageCredit: heroCredit(item(), { modified: true }) })
    })

    it('surfaces rate limiting', async () => {
        const { impl } = stubFetch({ [`https://api.openverse.org/v1/images/${ID}/`]: () => json({}, 429) })
        await expect(run(['credit', ID], impl)).rejects.toThrow('HTTP 429')
    })
})
