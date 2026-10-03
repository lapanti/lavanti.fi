import { describe, expect, it, vi } from 'vitest'

import {
    type D1Like,
    type D1Statement,
    DONATE_URL,
    handleDonate,
    handleSignup,
    handleStats,
    parseVolunteer,
    suppress,
    utmSlug,
} from './volunteers'

interface Call {
    args: unknown[]
    sql: string
}

/** Records every statement; `results` maps a SQL fragment to the rows `all()`/`first()` return. */
const fakeDb = (results: Record<string, unknown[]> = {}, fail = false) => {
    const calls: Call[] = []
    const db: D1Like = {
        prepare(sql: string) {
            const call: Call = { args: [], sql }
            // Longest matching fragment wins, so a GROUP BY query isn't caught by its plain COUNT prefix.
            const rowsFor = () =>
                Object.entries(results)
                    .filter(([frag]) => sql.includes(frag))
                    .sort(([a], [b]) => b.length - a.length)[0]?.[1] ?? []
            const stmt: D1Statement = {
                all: async <T>() => ({ results: rowsFor() as T[] }),
                bind(...values: unknown[]) {
                    call.args = values

                    return stmt
                },
                first: async <T>() => (rowsFor()[0] ?? null) as null | T,
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

const form = (fields: Record<string, string | string[]>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x)

    return f
}

const valid = {
    'cf-turnstile-response': 'tok',
    consent: 'yes',
    email: 'Testi@Example.fi',
    help: ['tapahtumat', 'jakaminen'],
    lang: 'fi',
    municipality: 'kirkkonummi',
    name: 'Testi Henkilö',
    utm_campaign: 'Sote-2026',
    utm_source: 'linkedin',
}

const post = (fields: Record<string, string | string[]>) =>
    new Request('https://lavanti.fi/api/liity', { body: form(fields), method: 'POST' })

const turnstile =
    (success: boolean, hostname = 'lavanti.fi') =>
    async () =>
        new Response(JSON.stringify({ hostname, success }))

const NOW = new Date('2026-10-02T12:34:56Z')

describe('utmSlug', () => {
    it('lowercases valid slugs and rejects everything else', () => {
        expect(utmSlug(' LinkedIn ')).toBe('linkedin')
        expect(utmSlug('<x>')).toBeNull()
        expect(utmSlug('a'.repeat(65))).toBeNull()
        expect(utmSlug(null)).toBeNull()
    })
})

describe('parseVolunteer', () => {
    it('accepts a valid form and normalises it', () => {
        const r = parseVolunteer(form(valid), NOW)
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.row).toMatchObject({
            consent_at: NOW.toISOString(),
            email: 'testi@example.fi',
            help: '["jakaminen","tapahtumat"]',
            municipality: 'kirkkonummi',
            phone: null,
            utm_campaign: 'sote-2026',
            utm_source: 'linkedin',
        })
    })

    it.each([
        ['consent', { consent: '' }],
        ['email', { email: 'not-an-email' }],
        ['name', { name: 'x' }],
        ['municipality', { municipality: 'helsinki' }],
        ['help', { help: ['hacking'] }],
        ['phone', { phone: 'call me' }],
        ['lang', { lang: 'de' }],
        ['honeypot', { website: 'http://spam' }],
    ])('rejects %s', (code, patch) => {
        expect(parseVolunteer(form({ ...valid, ...patch }), NOW)).toEqual({ error: code, ok: false })
    })
})

describe('handleSignup', () => {
    const env = (db: D1Like) => ({ DB: db, TURNSTILE_SECRET: 'secret' })

    it('stores the row and redirects to the thank-you page', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSignup(post(valid), env(db), turnstile(true), NOW)
        expect(res.status).toBe(303)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/fi/liity/kiitos/')
        expect(calls).toHaveLength(1)
        expect(calls[0].sql).toContain('INSERT INTO volunteers')
        expect(calls[0].args).toContain('testi@example.fi')
    })

    it('sends invalid input back to the form in its own language', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSignup(post({ ...valid, consent: '', lang: 'sv' }), env(db), turnstile(true), NOW)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/sv/bli-med/?virhe=consent#lomake')
        expect(calls).toHaveLength(0)
    })

    it('stores nothing when Turnstile fails', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSignup(post(valid), env(db), turnstile(false), NOW)
        expect(res.headers.get('Location')).toContain('virhe=varmistus')
        expect(calls).toHaveLength(0)
    })

    it('rejects a Turnstile token solved on another hostname', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSignup(post(valid), env(db), turnstile(true, 'example.com'), NOW)
        expect(res.headers.get('Location')).toContain('virhe=varmistus')
        expect(calls).toHaveLength(0)
    })

    it('answers a bot with the thank-you page but stores nothing', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSignup(post({ ...valid, website: 'x' }), env(db), turnstile(true), NOW)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/fi/liity/kiitos/')
        expect(calls).toHaveLength(0)
    })

    it('fails closed without a database or Turnstile secret, and logs which is missing', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const res = await handleSignup(post(valid), {}, turnstile(true), NOW)
        expect(res.headers.get('Location')).toContain('virhe=palvelu')
        expect(log).toHaveBeenCalledWith('liity: missing DB binding TURNSTILE_SECRET')
        log.mockRestore()
    })

    it('reports a database error instead of thanking, and logs it without form data', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const { db } = fakeDb({}, true)
        const res = await handleSignup(post(valid), env(db), turnstile(true), NOW)
        expect(res.headers.get('Location')).toContain('virhe=palvelu')
        expect(log.mock.calls[0]?.[0]).toMatch(/^liity: insert failed: /)
        expect(String(log.mock.calls[0]?.[0])).not.toContain('Testi')
        log.mockRestore()
    })
})

describe('handleDonate', () => {
    it('logs the hour and campaign link, then redirects to the party form', async () => {
        const { calls, db } = fakeDb()
        const res = await handleDonate(
            new Request('https://lavanti.fi/lahjoita?utm_source=Bluesky&utm_campaign=sote&x=1'),
            { DB: db },
            NOW
        )
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toBe(DONATE_URL)
        expect(calls[0].args).toEqual(['2026-10-02T12:00:00Z', 'bluesky', 'sote'])
    })

    it('still redirects when the database fails or is missing', async () => {
        const { db } = fakeDb({}, true)
        expect((await handleDonate(new Request('https://lavanti.fi/lahjoita'), { DB: db }, NOW)).status).toBe(302)
        expect((await handleDonate(new Request('https://lavanti.fi/lahjoita'), {}, NOW)).status).toBe(302)
    })
})

describe('suppress', () => {
    it('merges cells below three into muu and drops a small muu', () => {
        expect(suppress({ a: 5, b: 1, c: 2 })).toEqual({ a: 5, muu: 3 })
        expect(suppress({ a: 5, b: 1 })).toEqual({ a: 5 })
    })
})

describe('handleStats', () => {
    const req = (auth?: string, q = '') =>
        new Request(`https://lavanti.fi/api/liity/stats${q}`, auth ? { headers: { Authorization: auth } } : {})

    it('rejects a missing or wrong token', async () => {
        const { db } = fakeDb()
        expect((await handleStats(req(), { DB: db, LIITY_STATS_TOKEN: 't' })).status).toBe(401)
        expect((await handleStats(req('Bearer x'), { DB: db, LIITY_STATS_TOKEN: 't' })).status).toBe(401)
        expect((await handleStats(req('Bearer t'), { DB: db })).status).toBe(401)
    })

    it('returns counts only, with small cells merged', async () => {
        const { db } = fakeDb({
            'COUNT(*) AS n FROM donate_clicks': [{ n: 7 }],
            'COUNT(*) AS n FROM donate_clicks GROUP BY key': [{ key: 'sote / linkedin', n: 7 }],
            'FROM volunteers GROUP BY key': [
                { key: 'sote / linkedin', n: 3 },
                { key: '- / -', n: 1 },
            ],
            'FROM volunteers GROUP BY municipality': [
                { key: 'kirkkonummi', n: 3 },
                { key: 'espoo', n: 1 },
            ],
            'SELECT COUNT(*) AS n FROM volunteers': [{ n: 4 }],
            'SELECT help FROM volunteers': [
                { help: '["jakaminen"]' },
                { help: '["jakaminen","some"]' },
                { help: '["jakaminen"]' },
                { help: '["tapahtumat"]' },
            ],
        })
        const res = await handleStats(req('Bearer t', '?since=2026-10-01'), { DB: db, LIITY_STATS_TOKEN: 't' })
        expect(res.status).toBe(200)
        expect(res.headers.get('Cache-Control')).toBe('no-store')
        const body = (await res.json()) as { donate_clicks: unknown; volunteers: Record<string, unknown> }
        expect(body.volunteers).toMatchObject({
            by_campaign_source: { 'sote / linkedin': 3 },
            by_help: { jakaminen: 3 },
            by_municipality: { kirkkonummi: 3 },
            since: '2026-10-01',
            total: 4,
        })
        expect(body.donate_clicks).toEqual({ by_campaign_source: { 'sote / linkedin': 7 }, total: 7 })
        expect(JSON.stringify(body)).not.toContain('@')
    })
})
