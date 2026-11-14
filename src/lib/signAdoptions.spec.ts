import { describe, expect, it, vi } from 'vitest'

import { fakeDb, turnstile } from '../../tests/formFakes'
import {
    ADOPTION_MUNICIPALITIES,
    DISTRICT_MUNICIPALITIES,
    handleAction,
    handleMessage,
    handlePending,
    handleRevoke,
    handleStats,
    handleSubmit,
    handleWall,
    hashToken,
    isValidBusinessId,
    isValidSignName,
    newEditToken,
    newRefCode,
    normaliseName,
    parseAdoption,
} from './signAdoptions'

const form = (fields: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(fields)) f.append(k, v)

    return f
}

const valid = {
    'cf-turnstile-response': 'tok',
    consent_person: 'yes',
    consent_print: 'yes',
    email: 'Testi@Example.fi',
    lang: 'fi',
    municipality: 'kirkkonummi',
    quantity: '2',
    sign_name: '  Åsa  Ødegaard ',
    utm_campaign: 'Adoptoi',
    utm_source: 'instagram',
}

const company = {
    ...valid,
    billing_address: 'laskut@paja.fi',
    business_id: '0112038-9',
    company_name: '3D-Paja Oy',
    consent_company: 'yes',
    sign_name: '3D-Paja Oy',
}

const NOW = new Date('2026-11-14T12:00:00Z')
const gen = { ref: () => 'K-12345', token: () => 'secret-token' }

const post = (fields: Record<string, string>, accept = 'application/json') =>
    new Request('https://lavanti.fi/api/adoptoi', { body: form(fields), headers: { Accept: accept }, method: 'POST' })

const env = (db = fakeDb().db) => ({ DB: db, TURNSTILE_SECRET: 's' })

describe('municipalities', () => {
    it('lists the 25 district municipalities without Helsinki, plus no preference', () => {
        expect(DISTRICT_MUNICIPALITIES).toHaveLength(25)
        expect(DISTRICT_MUNICIPALITIES).not.toContain('helsinki')
        expect(ADOPTION_MUNICIPALITIES.at(-1)).toBe('ei-toivetta')
    })
})

describe('name rules', () => {
    it('normalises to NFC and collapses whitespace', () => {
        expect(normaliseName(' Äijä   Ö ')).toBe('Äijä Ö')
    })

    it('accepts letters in any script and the allowed punctuation', () => {
        for (const n of ['Sjoerd', 'Åsa Ødegaard', "O'Brien", 'Anna-Liisa K.', 'Ló’pez']) {
            expect(isValidSignName(n, false)).toBe(true)
        }
    })

    it('rejects digits and & without a company, too short and too long names', () => {
        expect(isValidSignName('3D-Paja Oy', false)).toBe(false)
        expect(isValidSignName('A & B', false)).toBe(false)
        expect(isValidSignName('A', false)).toBe(false)
        expect(isValidSignName('a'.repeat(25), false)).toBe(false)
        expect(isValidSignName('<b>', false)).toBe(false)
        expect(isValidSignName('3D-Paja & Co Oy', true)).toBe(true)
    })
})

describe('isValidBusinessId', () => {
    it('checks the Y-tunnus check digit', () => {
        expect(isValidBusinessId('0112038-9')).toBe(true)
        expect(isValidBusinessId('0112038-8')).toBe(false)
        expect(isValidBusinessId('1572860-0')).toBe(true)
        expect(isValidBusinessId('112038-9')).toBe(false)
    })

    it('rejects a remainder of 1, which has no valid check digit', () => {
        // 0000110: 1 × 8 + 1 × 4 = 12, and 12 mod 11 = 1.
        expect(isValidBusinessId('0000110-0')).toBe(false)
        expect(isValidBusinessId('0000110-1')).toBe(false)
    })
})

describe('parseAdoption', () => {
    it('accepts a private adoption and normalises it', () => {
        const r = parseAdoption(form(valid), NOW)
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.row).toMatchObject({
            company_name: null,
            consent_company_at: null,
            consent_page_at: null,
            consent_print_at: NOW.toISOString(),
            consent_public_at: null,
            email: 'testi@example.fi',
            public: 0,
            quantity: 2,
            sign_name: 'Åsa Ødegaard',
            utm_campaign: 'adoptoi',
            utm_source: 'instagram',
        })
    })

    it('takes the stepper value when the other-number chip is chosen', () => {
        const r = parseAdoption(form({ ...valid, quantity: 'muu', quantity_other: '12' }), NOW)
        expect(r.ok && r.row.quantity).toBe(12)
        expect(parseAdoption(form({ ...valid, quantity: 'muu' }), NOW)).toEqual({ error: 'quantity', ok: false })
    })

    it('treats the page opt-in as a list opt-in', () => {
        const r = parseAdoption(form({ ...valid, page: 'yes' }), NOW)
        expect(r.ok && r.row.public).toBe(1)
        expect(r.ok && r.row.consent_page_at).toBe(NOW.toISOString())
        const listed = parseAdoption(form({ ...valid, public: 'yes' }), NOW)
        expect(listed.ok && listed.row.consent_public_at).toBe(NOW.toISOString())
    })

    it('accepts a company with a valid business ID and its declaration', () => {
        const r = parseAdoption(form(company), NOW)
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.row).toMatchObject({
            billing_address: 'laskut@paja.fi',
            business_id: '0112038-9',
            company_name: '3D-Paja Oy',
            consent_company_at: NOW.toISOString(),
        })
    })

    it.each([
        [{ lang: 'de' }, 'lang'],
        [{ website: 'x' }, 'honeypot'],
        [{ sign_name: 'Mikko 2' }, 'sign_name'],
        [{ quantity: '0' }, 'quantity'],
        [{ quantity: '21' }, 'quantity'],
        [{ quantity: '2.5' }, 'quantity'],
        [{ municipality: 'helsinki' }, 'municipality'],
        [{ email: 'nope' }, 'email'],
        [{ consent_print: '' }, 'consent_print'],
        [{ consent_person: '' }, 'consent_person'],
    ])('rejects %o as %s', (patch, code) => {
        expect(parseAdoption(form({ ...valid, ...patch }), NOW)).toEqual({ error: code, ok: false })
    })

    it.each([
        [{ company_name: 'x'.repeat(101) }, 'company_name'],
        [{ business_id: '0112038-8' }, 'business_id'],
        [{ billing_address: '' }, 'billing_address'],
        [{ consent_company: '' }, 'consent_company'],
    ])('rejects company %o as %s', (patch, code) => {
        expect(parseAdoption(form({ ...company, ...patch }), NOW)).toEqual({ error: code, ok: false })
    })
})

describe('generators', () => {
    it('makes K-NNNNN refs and 22-character tokens', () => {
        expect(newRefCode()).toMatch(/^K-[1-9]\d{4}$/)
        expect(newEditToken()).toMatch(/^[A-Za-z0-9_-]{22}$/)
    })

    it('redraws values in the biased tail instead of folding them with modulo', () => {
        const draws = [0xffffffff, 5]
        const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
            ;(array as Uint32Array)[0] = draws.shift() ?? 0

            return array
        })
        expect(newRefCode()).toBe('K-10005')
        expect(spy).toHaveBeenCalledTimes(2)
        spy.mockRestore()
    })

    it('hashes a token to hex SHA-256', async () => {
        expect(await hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    })
})

describe('handleSubmit', () => {
    it('stores a pending row and returns the ref and token as JSON', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSubmit(post(valid), env(db), turnstile(true), NOW, gen)
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ ref: 'K-12345', token: 'secret-token' })
        expect(calls).toHaveLength(1)
        expect(calls[0].sql).toContain('INSERT INTO sign_adoptions')
        expect(calls[0].args).toContain('K-12345')
        expect(calls[0].args).toContain(await hashToken('secret-token'))
        expect(calls[0].args).not.toContain('secret-token')
    })

    it('redirects a plain form post to the thanks page with ref, count and company flag only', async () => {
        const res = await handleSubmit(post({ ...company, lang: 'sv' }, 'text/html'), env(), turnstile(true), NOW, gen)
        expect(res.status).toBe(303)
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/sv/adoptera/tack/?ref=K-12345&n=2&y=1')
    })

    it('returns a fixed error code and stores nothing', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSubmit(post({ ...valid, quantity: '50' }), env(db), turnstile(true), NOW, gen)
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'quantity' })
        expect(calls).toHaveLength(0)

        const back = await handleSubmit(post({ ...valid, email: 'x', lang: 'en' }, ''), env(db), turnstile(true))
        expect(back.headers.get('Location')).toBe('https://lavanti.fi/en/adopt/?virhe=email#lomake')
    })

    it('answers a filled honeypot like a success and stores nothing', async () => {
        const { calls, db } = fakeDb()
        const res = await handleSubmit(post({ ...valid, website: 'bot' }), env(db), turnstile(true), NOW, gen)
        expect(await res.json()).toEqual({ ref: 'K-12345', token: 'secret-token' })
        const html = await handleSubmit(post({ ...valid, website: 'bot' }, ''), env(db), turnstile(true), NOW, gen)
        expect(html.headers.get('Location')).toContain('/fi/adoptoi/kiitos/?ref=K-12345&n=1&y=0')
        expect(calls).toHaveLength(0)
    })

    it('fails closed on Turnstile and on missing bindings', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const bad = await handleSubmit(post(valid), env(), turnstile(false), NOW, gen)
        expect(await bad.json()).toEqual({ error: 'varmistus' })
        const missing = await handleSubmit(post(valid), {}, turnstile(true), NOW, gen)
        expect(missing.status).toBe(503)
        expect(errorLog).toHaveBeenCalledWith('adoptoi: missing DB binding TURNSTILE_SECRET')
        errorLog.mockRestore()
    })

    it('retries a ref collision and gives up on other storage errors', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        let attempts = 0
        const refs = ['K-11111', 'K-22222']
        const colliding = {
            prepare: () => ({
                all: async () => ({ results: [] }),
                bind: () => colliding.prepare(),
                first: async () => null,
                run: async () => {
                    attempts++
                    if (attempts === 1) throw new Error('UNIQUE constraint failed: sign_adoptions.ref_code')
                },
            }),
        }
        const res = await handleSubmit(post(valid), { DB: colliding, TURNSTILE_SECRET: 's' }, turnstile(true), NOW, {
            ref: () => refs.shift() ?? 'K-99999',
            token: () => 't',
        })
        expect(await res.json()).toEqual({ ref: 'K-22222', token: 't' })

        const down = await handleSubmit(post(valid), env(fakeDb({}, true).db), turnstile(true), NOW, gen)
        expect(down.status).toBe(503)
        expect(errorLog).toHaveBeenCalledWith('adoptoi: insert failed: db down')
        errorLog.mockRestore()
    })

    it('sends a malformed body back to the Finnish form', async () => {
        const req = new Request('https://lavanti.fi/api/adoptoi', { body: 'x', method: 'POST' })
        const res = await handleSubmit(req, env(), turnstile(true))
        expect(res.headers.get('Location')).toBe('https://lavanti.fi/fi/adoptoi/?virhe=lomake#lomake')
        const jsonReq = new Request('https://lavanti.fi/api/adoptoi', {
            body: 'x',
            headers: { Accept: 'application/json' },
            method: 'POST',
        })
        expect(await (await handleSubmit(jsonReq, env(), turnstile(true))).json()).toEqual({ error: 'lomake' })
    })
})

describe('handleMessage', () => {
    const msg = (body: unknown) =>
        new Request('https://lavanti.fi/api/adoptoi/viesti', { body: JSON.stringify(body), method: 'POST' })

    const target = async (patch: Record<string, unknown> = {}) => ({
        created_at: '2026-11-14T11:00:00Z',
        edit_token_hash: await hashToken('tok'),
        id: 7,
        message_at: null,
        status: 'pending',
        ...patch,
    })

    it('stores a message for moderation', async () => {
        const { calls, db } = fakeDb({ 'WHERE ref_code': [await target()] })
        const res = await handleMessage(
            msg({ message: ' Siksi,  että ', ref: 'K-12345', token: 'tok' }),
            { DB: db },
            NOW
        )
        expect(await res.json()).toEqual({ saved: true })
        expect(calls[0].sql).toContain('message = ?, message_approved_at = NULL')
        expect(calls[0].args).toEqual([NOW.toISOString(), 'Siksi, että', 7])
    })

    it('stores the payer name while pending and clears it with an empty value', async () => {
        const { calls, db } = fakeDb({ 'WHERE ref_code': [await target()] })
        await handleMessage(msg({ payer_name: '', ref: 'K-12345', token: 'tok' }), { DB: db }, NOW)
        expect(calls[0].sql).toContain('payer_name = ?')
        expect(calls[0].args).toEqual([NOW.toISOString(), null, 7])
    })

    it('answers a wrong token and an unknown ref the same way', async () => {
        const { calls, db } = fakeDb({ 'WHERE ref_code': [await target()] })
        expect((await handleMessage(msg({ message: 'x', ref: 'K-12345', token: 'nope' }), { DB: db })).status).toBe(404)
        expect((await handleMessage(msg({ message: 'x', ref: 'K-1', token: 'tok' }), { DB: db })).status).toBe(404)
        const empty = fakeDb().db
        expect((await handleMessage(msg({ message: 'x', ref: 'K-12345', token: 'tok' }), { DB: empty })).status).toBe(
            404
        )
        expect(calls).toHaveLength(0)
    })

    it('rate-limits, closes old approved rows and validates lengths', async () => {
        const recent = fakeDb({ 'WHERE ref_code': [await target({ message_at: '2026-11-14T11:59:50Z' })] }).db
        expect(
            (await handleMessage(msg({ message: 'x', ref: 'K-12345', token: 'tok' }), { DB: recent }, NOW)).status
        ).toBe(429)
        const old = fakeDb({
            'WHERE ref_code': [await target({ created_at: '2026-11-01T00:00:00Z', status: 'approved' })],
        }).db
        expect(
            (await handleMessage(msg({ message: 'x', ref: 'K-12345', token: 'tok' }), { DB: old }, NOW)).status
        ).toBe(409)
        const approved = fakeDb({ 'WHERE ref_code': [await target({ status: 'approved' })] }).db
        expect(
            (await handleMessage(msg({ payer_name: 'Matti', ref: 'K-12345', token: 'tok' }), { DB: approved }, NOW))
                .status
        ).toBe(409)
        const db = fakeDb().db
        const long = await handleMessage(msg({ message: 'x'.repeat(141), ref: 'K-12345', token: 'tok' }), { DB: db })
        expect(await long.json()).toEqual({ error: 'message' })
        const payer = await handleMessage(msg({ payer_name: 'M', ref: 'K-12345', token: 'tok' }), { DB: db })
        expect(await payer.json()).toEqual({ error: 'payer_name' })
        expect((await handleMessage(msg({ ref: 'K-12345', token: 'tok' }), { DB: db })).status).toBe(400)
    })

    it('handles a missing database and a malformed body', async () => {
        expect((await handleMessage(msg({}), {})).status).toBe(503)
        const bad = new Request('https://lavanti.fi/api/adoptoi/viesti', { body: '{', method: 'POST' })
        expect((await handleMessage(bad, { DB: fakeDb().db })).status).toBe(400)
    })
})

describe('handleWall', () => {
    it('shows nothing below three approved rows', async () => {
        const { db } = fakeDb({ 'COUNT(*) AS n, COALESCE': [{ n: 2, signs: 9 }] })
        const res = await handleWall({ DB: db })
        expect(await res.json()).toEqual({ messages: [], municipalities: {}, names: [], signs: null })
    })

    it('returns counts, suppressed municipalities, names and approved messages only', async () => {
        const { db } = fakeDb({
            'COUNT(*) AS n, COALESCE': [{ n: 4, signs: 14 }],
            'GROUP BY key': [
                { key: 'kirkkonummi', n: 12 },
                { key: 'espoo', n: 1 },
                { key: 'vantaa', n: 1 },
            ],
            'SELECT sign_name AS name FROM': [{ name: 'Sjoerd' }, { name: 'Anna' }, { name: 'Mikko' }],
            'SELECT sign_name AS name, message': [{ email: 'x@y.fi', message: 'Hei', name: 'Anna' }],
        })
        const res = await handleWall({ DB: db })
        expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
        expect(await res.json()).toEqual({
            messages: [{ message: 'Hei', name: 'Anna' }],
            municipalities: { kirkkonummi: 12 },
            names: ['Sjoerd', 'Anna', 'Mikko'],
            signs: 14,
        })
    })

    it('hides names and messages until three names have opted in', async () => {
        const { db } = fakeDb({
            'COUNT(*) AS n, COALESCE': [{ n: 5, signs: 5 }],
            'SELECT sign_name AS name FROM': [{ name: 'Sjoerd' }],
        })
        const body = await (await handleWall({ DB: db })).json()
        expect(body).toMatchObject({ messages: [], names: [], signs: 5 })
    })

    it('reports a missing database without caching', async () => {
        const res = await handleWall({})
        expect(res.status).toBe(503)
        expect(res.headers.get('Cache-Control')).toBe('no-store')
    })
})

const authed = (url: string, init: RequestInit = {}, token = 'admin') =>
    new Request(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } })

describe('inbox', () => {
    it('refuses a missing or wrong token', async () => {
        const e = { ADOPTIONS_TOKEN: 'admin', DB: fakeDb().db }
        expect((await handlePending(authed('https://lavanti.fi/api/adoptoi/pending', {}, 'x'), e)).status).toBe(401)
        expect((await handleAction(new Request('https://lavanti.fi/api/adoptoi/1'), e, '1')).status).toBe(401)
        expect((await handleRevoke(new Request('https://lavanti.fi/api/adoptoi/1'), e, '1')).status).toBe(401)
        expect(
            (await handlePending(authed('https://lavanti.fi/api/adoptoi/pending'), { ADOPTIONS_TOKEN: 'admin' })).status
        ).toBe(503)
    })

    it('lists pending rows and messages, or approved rows, without the token hash', async () => {
        const { db } = fakeDb({ 'message_approved_at IS NULL': [{ id: 2 }], "status = 'pending'": [{ id: 1 }] })
        const res = await handlePending(authed('https://lavanti.fi/api/adoptoi/pending'), {
            ADOPTIONS_TOKEN: 'admin',
            DB: db,
        })
        expect(await res.json()).toEqual({ adoptions: [{ id: 1 }], messages: [{ id: 2 }] })

        const spy = vi.fn()
        const recording = {
            prepare: (sql: string) => {
                spy(sql)

                return fakeDb({ '': [{ id: 3 }] }).db.prepare(sql)
            },
        }
        const approved = await handlePending(authed('https://lavanti.fi/api/adoptoi/pending?status=approved'), {
            ADOPTIONS_TOKEN: 'admin',
            DB: recording,
        })
        expect(await approved.json()).toEqual({ adoptions: [{ id: 3 }] })
        expect(spy.mock.calls[0][0]).not.toContain('edit_token_hash')
    })
})

describe('handleAction', () => {
    const act = (body: unknown) =>
        authed('https://lavanti.fi/api/adoptoi/7', { body: JSON.stringify(body), method: 'POST' })
    const e = (row: unknown) => {
        const fake = fakeDb({ 'WHERE id = ?': row ? [row] : [] })

        return { calls: fake.calls, env: { ADOPTIONS_TOKEN: 'admin', DB: fake.db } }
    }

    it('approves a pending row with the payment channel', async () => {
        const { calls, env: x } = e({ id: 7, message: null, status: 'pending' })
        const res = await handleAction(act({ action: 'approve', paid_via: 'mobilepay' }), x, '7', NOW)
        expect(await res.json()).toEqual({ action: 'approve', id: 7 })
        expect(calls[0].sql).toContain("status = 'approved'")
        expect(calls[0].args).toEqual([NOW.toISOString(), 'mobilepay', 7])
    })

    it.each([
        ['reject', 'pending', "status = 'rejected'"],
        ['approve-message', 'approved', 'message_approved_at = ?'],
        ['reject-message', 'approved', 'message = NULL'],
        ['printed', 'approved', 'printed_at = ?'],
    ])('%s updates a %s row', async (action, status, sql) => {
        const { calls, env: x } = e({ id: 7, message: 'Hei', status })
        expect((await handleAction(act({ action }), x, '7', NOW)).status).toBe(200)
        expect(calls[0].sql).toContain(sql)
    })

    it('refuses impossible transitions, unknown rows and bad input', async () => {
        const approved = e({ id: 7, message: null, status: 'approved' }).env
        expect((await handleAction(act({ action: 'approve' }), approved, '7')).status).toBe(409)
        expect((await handleAction(act({ action: 'reject' }), approved, '7')).status).toBe(409)
        expect((await handleAction(act({ action: 'approve-message' }), approved, '7')).status).toBe(409)
        const pending = e({ id: 7, message: null, status: 'pending' }).env
        expect((await handleAction(act({ action: 'printed' }), pending, '7')).status).toBe(409)
        expect((await handleAction(act({ action: 'approve' }), e(null).env, '7')).status).toBe(404)
        expect((await handleAction(act({ action: 'nuke' }), pending, '7')).status).toBe(400)
        expect((await handleAction(act({ action: 'approve' }), pending, 'x')).status).toBe(404)
        const bad = authed('https://lavanti.fi/api/adoptoi/7', { body: '{', method: 'POST' })
        expect((await handleAction(bad, pending, '7')).status).toBe(400)
    })

    it('stores an unknown payment channel as null', async () => {
        const { calls, env: x } = e({ id: 7, message: null, status: 'pending' })
        await handleAction(act({ action: 'approve', paid_via: 'cash' }), x, '7', NOW)
        expect(calls[0].args).toEqual([NOW.toISOString(), null, 7])
    })
})

describe('handleRevoke', () => {
    it('deletes the row', async () => {
        const { calls, db } = fakeDb()
        const res = await handleRevoke(
            authed('https://lavanti.fi/api/adoptoi/7', { method: 'DELETE' }),
            { ADOPTIONS_TOKEN: 'admin', DB: db },
            '7'
        )
        expect(await res.json()).toEqual({ deleted: 7 })
        expect(calls[0]).toEqual({ args: [7], sql: 'DELETE FROM sign_adoptions WHERE id = ?' })
        expect(
            (await handleRevoke(authed('https://lavanti.fi/api/adoptoi/x'), { ADOPTIONS_TOKEN: 'admin', DB: db }, 'x'))
                .status
        ).toBe(404)
    })
})

describe('handleStats', () => {
    const stats = (q = '') => authed(`https://lavanti.fi/api/adoptoi/stats${q}`, {}, 'stats')

    it('returns counts only', async () => {
        const { db } = fakeDb({ 'COUNT(*)': [{ n: 3 }], 'SUM(quantity)': [{ n: 8 }] })
        const res = await handleStats(stats('?since=2026-11-13'), { DB: db, LIITY_STATS_TOKEN: 'stats' })
        expect(await res.json()).toEqual({ approved: 3, pending: 3, signs: 8, since: '2026-11-13', since_count: 3 })
        const none = await handleStats(stats('?since=2026-02-30'), { DB: db, LIITY_STATS_TOKEN: 'stats' })
        expect(await none.json()).toMatchObject({ since: null, since_count: null })
    })

    it('needs the stats token and a database', async () => {
        expect((await handleStats(stats(), { LIITY_STATS_TOKEN: 'other' })).status).toBe(401)
        expect((await handleStats(stats(), { LIITY_STATS_TOKEN: 'stats' })).status).toBe(503)
        const { db } = fakeDb()
        expect(await (await handleStats(stats(), { DB: db, LIITY_STATS_TOKEN: 'stats' })).json()).toEqual({
            approved: 0,
            pending: 0,
            signs: 0,
            since: null,
            since_count: null,
        })
    })
})
