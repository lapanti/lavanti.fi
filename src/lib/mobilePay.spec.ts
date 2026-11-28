import { beforeEach, describe, expect, it } from 'vitest'

import { fakeMobilePay, MOBILEPAY_ENV as ENV, signedWebhook } from '../../tests/mobilePayFakes'
import {
    capturePayment,
    createPayment,
    getPayment,
    mobilePayConfig,
    paymentReference,
    refOfPayment,
    registerWebhook,
    resetTokenCache,
    verifyWebhook,
} from './mobilePay'

const config = mobilePayConfig(ENV)!

const headers = (init: RequestInit) => init.headers as Record<string, string>

beforeEach(resetTokenCache)

describe('mobilePayConfig', () => {
    it('is null until every key is set, and defaults to production', () => {
        expect(mobilePayConfig({ ...ENV, MOBILEPAY_MSN: '' })).toBeNull()
        expect(mobilePayConfig({})).toBeNull()
        expect(mobilePayConfig({ ...ENV, MOBILEPAY_API: undefined })?.api).toBe('https://api.vipps.no')
        expect(config.api).toBe('https://apitest.vipps.no')
    })
})

describe('payment references', () => {
    it('fits the API pattern and carries the adoption ref', () => {
        const reference = paymentReference('K-12345', new Date('2026-11-28T10:00:00Z'))
        expect(reference).toMatch(/^[a-zA-Z0-9-]{8,64}$/)
        expect(refOfPayment(reference)).toBe('K-12345')
    })

    it('refuses references this site did not create', () => {
        expect(refOfPayment('acme-shop-123')).toBeNull()
        expect(refOfPayment('adoptoi-K-1234-abc')).toBeNull()
        expect(refOfPayment('adoptoi-K-12345-ABC')).toBeNull()
    })
})

describe('createPayment', () => {
    it('gets a token once, then creates a WEB_REDIRECT payment in euro cents', async () => {
        const { calls, fetchFn } = fakeMobilePay({ redirectUrl: 'https://landing.vipps.no?token=x' })
        const p = {
            cents: 5500,
            description: 'Lahjoitus vaalikeräykseen (Adoptoi kyltti)',
            reference: 'adoptoi-K-12345-abc',
            returnUrl: 'https://lavanti.fi/fi/adoptoi/lahjoita/?ref=K-12345&n=2&y=0&mp=1',
            scope: 'name',
        }
        expect(await createPayment(config, fetchFn, p)).toBe('https://landing.vipps.no?token=x')
        await createPayment(config, fetchFn, p)

        expect(calls.map((c) => c.url)).toEqual([
            'https://apitest.vipps.no/accesstoken/get',
            'https://apitest.vipps.no/epayment/v1/payments',
            'https://apitest.vipps.no/epayment/v1/payments',
        ])
        expect(headers(calls[0].init)).toMatchObject({
            'Merchant-Serial-Number': '123456',
            'Ocp-Apim-Subscription-Key': 'sub',
            client_id: 'id',
            client_secret: 'secret',
        })
        expect(headers(calls[1].init)).toMatchObject({
            Authorization: 'Bearer at',
            'Idempotency-Key': 'adoptoi-K-12345-abc',
            'Merchant-Serial-Number': '123456',
        })
        expect(JSON.parse(calls[1].init.body as string)).toEqual({
            amount: { currency: 'EUR', value: 5500 },
            paymentDescription: p.description,
            paymentMethod: { type: 'WALLET' },
            profile: { scope: 'name' },
            reference: p.reference,
            returnUrl: p.returnUrl,
            userFlow: 'WEB_REDIRECT',
        })
    })

    it('throws on an error status or a response without a redirect URL', async () => {
        const p = { cents: 3000, description: 'x'.repeat(3), reference: 'adoptoi-K-12345-a', returnUrl: 'https://x' }
        await expect(createPayment(config, fakeMobilePay({}, 400).fetchFn, p)).rejects.toThrow('400')
        await expect(createPayment(config, fakeMobilePay({}).fetchFn, p)).rejects.toThrow('redirectUrl')
        const noToken = async () => new Response('', { status: 401 })
        resetTokenCache()
        await expect(createPayment(config, noToken, p)).rejects.toThrow('access token')
    })
})

describe('getPayment', () => {
    it('reads the state, amounts and the shared name', async () => {
        const { fetchFn } = fakeMobilePay({
            aggregate: { authorizedAmount: { currency: 'EUR', value: 3000 }, capturedAmount: { value: 0 } },
            state: ['AUTHORIZED'],
            userDetails: { firstName: ' Åsa ', lastName: 'Ødegaard' },
        })
        expect(await getPayment(config, fetchFn, 'adoptoi-K-12345-a')).toEqual({
            authorized: 3000,
            captured: 0,
            payerName: 'Åsa Ødegaard',
            state: 'AUTHORIZED',
        })
    })

    it('accepts a plain string state and no profile', async () => {
        const { fetchFn } = fakeMobilePay({ state: 'ABORTED' })
        expect(await getPayment(config, fetchFn, 'adoptoi-K-12345-a')).toEqual({
            authorized: 0,
            captured: 0,
            payerName: null,
            state: 'ABORTED',
        })
    })
})

describe('capturePayment', () => {
    it('captures with an idempotency key per reference', async () => {
        const { calls, fetchFn } = fakeMobilePay({ aggregate: { capturedAmount: { value: 3000 } } })
        expect(await capturePayment(config, fetchFn, 'adoptoi-K-12345-a', 3000)).toBe(3000)
        expect(calls[1].url).toBe('https://apitest.vipps.no/epayment/v1/payments/adoptoi-K-12345-a/capture')
        expect(headers(calls[1].init)['Idempotency-Key']).toBe('capture-adoptoi-K-12345-a')
        expect(JSON.parse(calls[1].init.body as string)).toEqual({
            modificationAmount: { currency: 'EUR', value: 3000 },
        })
    })
})

describe('registerWebhook', () => {
    it('registers the authorized event', async () => {
        const { calls, fetchFn } = fakeMobilePay({ id: 'w1', secret: 's3cret' })
        expect(await registerWebhook(config, fetchFn, 'https://lavanti.fi/api/adoptoi/mobilepay')).toEqual({
            id: 'w1',
            secret: 's3cret',
        })
        expect(JSON.parse(calls[1].init.body as string)).toEqual({
            events: ['epayments.payment.authorized.v1'],
            url: 'https://lavanti.fi/api/adoptoi/mobilepay',
        })
    })
})

describe('verifyWebhook', () => {
    const body = '{"name":"AUTHORIZED","reference":"adoptoi-K-12345-a"}'

    it('accepts a correctly signed request', async () => {
        expect(await verifyWebhook(await signedWebhook(body, 'sec'), body, 'sec')).toBe(true)
        const withQuery = await signedWebhook(body, 'sec', 'https://lavanti.fi/api/adoptoi/mobilepay?x=1')
        expect(await verifyWebhook(withQuery, body, 'sec')).toBe(true)
    })

    it('refuses a changed body, a wrong secret and missing headers', async () => {
        expect(await verifyWebhook(await signedWebhook(body, 'sec'), body.replace('a"', 'b"'), 'sec')).toBe(false)
        expect(await verifyWebhook(await signedWebhook(body, 'sec'), body, 'other')).toBe(false)
        const bare = new Request('https://lavanti.fi/api/adoptoi/mobilepay', { body, method: 'POST' })
        expect(await verifyWebhook(bare, body, 'sec')).toBe(false)
    })
})
