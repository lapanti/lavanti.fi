import type { D1Like, D1Statement } from './formHandling'

import { describe, expect, it, vi } from 'vitest'

import {
    handleDelete,
    handlePending,
    handlePhoto,
    handleStats,
    handleSubmit,
    MAX_PHOTO_BYTES,
    parseSubmission,
    type R2Like,
    sniffPhotoType,
} from './recommendationSubmissions'

interface Call {
    args: unknown[]
    sql: string
}

/** Records every statement run; `rows` is what `all()`/`first()` return. */
const fakeDb = (rows: unknown[] = [], fail = false) => {
    const calls: Call[] = []
    const db: D1Like = {
        prepare(sql: string) {
            const call: Call = { args: [], sql }
            const stmt: D1Statement = {
                all: async <T>() => ({ results: rows as T[] }),
                bind(...values: unknown[]) {
                    call.args = values

                    return stmt
                },
                first: async <T>() => (rows[0] ?? null) as null | T,
                run: async () => {
                    if (fail) throw new Error('db down')
                    calls.push(call)
                },
            }

            return stmt
        },
    }

    return { calls, db }
}

const fakeR2 = () => {
    const objects = new Map<string, { bytes: ArrayBuffer; type?: string }>()
    const r2: R2Like = {
        delete: async (key) => {
            objects.delete(key)
        },
        get: async (key) => {
            const o = objects.get(key)

            return o ? { body: new Blob([o.bytes]).stream(), httpMetadata: { contentType: o.type } } : null
        },
        put: async (key, value, options) =>
            objects.set(key, { bytes: value, type: options?.httpMetadata?.contentType }),
    }

    return { objects, r2 }
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0])

const valid = {
    'cf-turnstile-response': 'tok',
    consent: 'yes',
    name: 'Testi Henkilö',
    recommendation: 'Lauri on osaava ja aikaansaava ehdokas, jota suosittelen lämpimästi.',
    title_en: '',
    title_fi: 'Toimitusjohtaja',
    title_sv: 'Verkställande direktör',
}

const form = (fields: Record<string, string>, photo: Blob | null = new File([JPEG], 'kuva.jpg')) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(fields)) f.append(k, v)
    if (photo) f.append('photo', photo)

    return f
}

const post = (fields: Record<string, string>, photo?: Blob | null) =>
    new Request('https://lavanti.fi/api/suosittele', { body: form(fields, photo), method: 'POST' })

const turnstile =
    (success: boolean, hostname = 'lavanti.fi') =>
    async () =>
        new Response(JSON.stringify({ hostname, success }))

const NOW = new Date('2026-10-09T12:00:00Z')
const ID = '0b5e6a1c-2f3d-4e5f-8a9b-0c1d2e3f4a5b'

describe('sniffPhotoType', () => {
    it('reads the type from the bytes', () => {
        expect(sniffPhotoType(JPEG)).toBe('image/jpeg')
        expect(sniffPhotoType(PNG)).toBe('image/png')
        expect(sniffPhotoType(WEBP)).toBe('image/webp')
        expect(sniffPhotoType(GIF)).toBeNull()
    })
})

describe('parseSubmission', () => {
    it('accepts a valid form and stores empty optional titles as null', async () => {
        const r = await parseSubmission(form(valid), NOW)
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.row).toMatchObject({
            consent_at: NOW.toISOString(),
            name: 'Testi Henkilö',
            photo_type: 'image/jpeg',
            title_en: null,
            title_fi: 'Toimitusjohtaja',
            title_sv: 'Verkställande direktör',
        })
    })

    it('trusts the bytes over the browser-sent type', async () => {
        const r = await parseSubmission(form(valid, new File([PNG], 'x.jpg', { type: 'image/jpeg' })), NOW)
        expect(r.ok && r.row.photo_type).toBe('image/png')
    })

    it.each([
        ['honeypot', { website: 'http://spam' }],
        ['name', { name: 'x' }],
        ['title_fi', { title_fi: '' }],
        ['title_sv', { title_sv: 'x'.repeat(101) }],
        ['title_en', { title_en: 'x'.repeat(101) }],
        ['recommendation', { recommendation: 'Liian lyhyt.' }],
        ['recommendation', { recommendation: 'x'.repeat(801) }],
        ['consent', { consent: '' }],
    ])('rejects %s', async (code, patch) => {
        expect(await parseSubmission(form({ ...valid, ...patch }), NOW)).toEqual({ error: code, ok: false })
    })

    it.each([
        ['a missing photo', null],
        ['an empty photo', new File([], 'x.jpg')],
        ['a GIF', new File([GIF], 'x.gif', { type: 'image/gif' })],
        ['an oversize photo', new File([JPEG, new Uint8Array(MAX_PHOTO_BYTES)], 'x.jpg')],
    ])('rejects %s', async (_, photo) => {
        expect(await parseSubmission(form(valid, photo), NOW)).toEqual({ error: 'photo', ok: false })
    })
})

describe('handleSubmit', () => {
    const setup = (dbFail = false) => {
        const d = fakeDb([], dbFail)
        const r = fakeR2()

        return { ...d, ...r, env: { DB: d.db, RECOMMENDATION_PHOTOS: r.r2, TURNSTILE_SECRET: 'secret' } }
    }

    it('stores the row and the photo, then redirects to the thank-you page', async () => {
        const { calls, env, objects } = setup()
        const res = await handleSubmit(post(valid), env, turnstile(true), NOW, () => ID)
        expect(res.status).toBe(303)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/fi/suosittele/kiitos/')
        expect(calls).toHaveLength(1)
        expect(calls[0].sql).toContain('INSERT INTO recommendation_submissions')
        expect(calls[0].args[0]).toBe(ID)
        expect(objects.get(`submissions/${ID}`)?.type).toBe('image/jpeg')
    })

    it('sends invalid input back to the form and stores nothing', async () => {
        const { calls, env, objects } = setup()
        const res = await handleSubmit(post({ ...valid, consent: '' }), env, turnstile(true), NOW)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/fi/suosittele/?virhe=consent#lomake')
        expect(calls).toHaveLength(0)
        expect(objects.size).toBe(0)
    })

    it.each([
        ['fails', turnstile(false)],
        ['was solved on another hostname', turnstile(true, 'example.com')],
    ])('stores nothing when Turnstile %s', async (_, fetchFn) => {
        const { calls, env, objects } = setup()
        const res = await handleSubmit(post(valid), env, fetchFn, NOW)
        expect(res.headers.get('Location')).toContain('virhe=varmistus')
        expect(calls).toHaveLength(0)
        expect(objects.size).toBe(0)
    })

    it('answers a bot with the thank-you page but stores nothing', async () => {
        const { calls, env, objects } = setup()
        const res = await handleSubmit(post({ ...valid, website: 'x' }), env, turnstile(true), NOW)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/fi/suosittele/kiitos/')
        expect(calls).toHaveLength(0)
        expect(objects.size).toBe(0)
    })

    it('fails closed without its bindings and logs which are missing', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const res = await handleSubmit(post(valid), { TURNSTILE_SECRET: 'secret' }, turnstile(true), NOW)
        expect(res.headers.get('Location')).toContain('virhe=palvelu')
        expect(log).toHaveBeenCalledWith('suosittele: missing DB RECOMMENDATION_PHOTOS')
        log.mockRestore()
    })

    it('removes the photo again when the insert fails', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const { env, objects } = setup(true)
        const res = await handleSubmit(post(valid), env, turnstile(true), NOW, () => ID)
        expect(res.headers.get('Location')).toContain('virhe=palvelu')
        expect(objects.size).toBe(0)
        log.mockRestore()
    })
})

describe('inbox endpoints', () => {
    const authed = (url: string, method = 'GET', token = 'inbox') =>
        new Request(url, { headers: { Authorization: `Bearer ${token}` }, method })

    const setup = (rows: unknown[] = []) => {
        const d = fakeDb(rows)
        const r = fakeR2()

        return {
            ...d,
            ...r,
            env: { DB: d.db, LIITY_STATS_TOKEN: 'stats', RECOMMENDATION_PHOTOS: r.r2, RECOMMENDATIONS_TOKEN: 'inbox' },
        }
    }

    it.each([
        [
            'pending',
            (env: never) => handlePending(authed('https://lavanti.fi/api/suosittele/pending', 'GET', 'x'), env),
        ],
        [
            'photo',
            (env: never) => handlePhoto(authed('https://lavanti.fi/api/suosittele/photo/x', 'GET', 'x'), env, ID),
        ],
        ['delete', (env: never) => handleDelete(authed('https://lavanti.fi/api/suosittele/x', 'DELETE', 'x'), env, ID)],
        ['stats', (env: never) => handleStats(authed('https://lavanti.fi/api/suosittele/stats', 'GET', 'x'), env)],
    ])('%s answers 401 to a wrong token', async (_, call) => {
        const { env } = setup()
        const res = await call(env as never)
        expect(res.status).toBe(401)
    })

    it('does not accept the stats token for the inbox', async () => {
        const { env } = setup()
        const res = await handlePending(authed('https://lavanti.fi/api/suosittele/pending', 'GET', 'stats'), env)
        expect(res.status).toBe(401)
    })

    it('lists pending submissions', async () => {
        const { env } = setup([{ id: ID, name: 'Testi' }])
        const res = await handlePending(authed('https://lavanti.fi/api/suosittele/pending'), env)
        expect(await res.json()).toEqual({ submissions: [{ id: ID, name: 'Testi' }] })
    })

    it('serves the stored photo with its type', async () => {
        const { env, objects } = setup()
        objects.set(`submissions/${ID}`, { bytes: JPEG.buffer, type: 'image/jpeg' })
        const res = await handlePhoto(authed(`https://lavanti.fi/api/suosittele/photo/${ID}`), env, ID)
        expect(res.headers.get('Content-Type')).toBe('image/jpeg')
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG)
    })

    it('answers 404 for an unknown or malformed id', async () => {
        const { env } = setup()
        expect((await handlePhoto(authed('https://lavanti.fi/x'), env, ID)).status).toBe(404)
        expect((await handlePhoto(authed('https://lavanti.fi/x'), env, '../etc')).status).toBe(404)
    })

    it('deletes both the photo and the row', async () => {
        const { calls, env, objects } = setup()
        objects.set(`submissions/${ID}`, { bytes: JPEG.buffer })
        const res = await handleDelete(authed(`https://lavanti.fi/api/suosittele/${ID}`, 'DELETE'), env, ID)
        expect(res.status).toBe(200)
        expect(objects.size).toBe(0)
        expect(calls[0]).toEqual({ args: [ID], sql: 'DELETE FROM recommendation_submissions WHERE id = ?' })
    })

    it('stats returns the pending count only', async () => {
        const { env } = setup([{ n: 2 }])
        const res = await handleStats(authed('https://lavanti.fi/api/suosittele/stats', 'GET', 'stats'), env)
        expect(await res.json()).toEqual({ pending: 2 })
    })
})
