import { describe, expect, it } from 'vitest'

import { createClient, resolveProvider, RETRY_MAX } from './client'

const okBody = {
    answers: { yes: { noul: 0.9, type: 'noul' } },
    id: 'x',
    model: 'm',
    usage: { input_tokens: 1, output_tokens: 1 },
}

const response = (status: number, body: unknown = okBody): Response =>
    new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status })

const recordingFetch = (
    statuses: number[]
): { calls: Array<{ init: RequestInit; url: string }>; fetchImpl: typeof fetch } => {
    const calls: Array<{ init: RequestInit; url: string }> = []
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
        calls.push({ init: init ?? {}, url: String(input) })
        const status = statuses[Math.min(calls.length - 1, statuses.length - 1)]

        return response(status)
    }) as typeof fetch

    return { calls, fetchImpl }
}

const noSleep = async (): Promise<void> => {}

describe('resolveProvider', () => {
    it('uses OpenRouter when only its key is set', () => {
        expect(resolveProvider({ OPENROUTER_API_KEY: 'or' })).toEqual({
            apiKey: 'or',
            baseUrl: 'https://openrouter.ai/api',
            model: 'jev-1.13',
            name: 'openrouter',
        })
    })

    it('prefers TypeSafe when both keys are set', () => {
        expect(resolveProvider({ OPENROUTER_API_KEY: 'or', TYPESAFE_API_KEY: 'ts' })).toMatchObject({
            baseUrl: 'https://api.typesafe.ai',
            model: 'jev-1.13.0',
            name: 'typesafe',
        })
    })

    it('returns null without a key', () => {
        expect(resolveProvider({})).toBeNull()
        expect(resolveProvider({ OPENROUTER_API_KEY: '' })).toBeNull()
    })
})

describe('createClient', () => {
    const provider = {
        apiKey: 'secret-key',
        baseUrl: 'https://openrouter.ai/api',
        model: 'jev-1.13',
        name: 'openrouter',
    } as const

    it('POSTs model, state and questions with a bearer header', async () => {
        const { calls, fetchImpl } = recordingFetch([200])
        const client = createClient(provider, { fetchImpl, sleep: noSleep })
        const res = await client.ask('hello', { yes: { instructions: 'Is it?', type: 'noul' } })

        expect(res.answers.yes).toEqual({ noul: 0.9, type: 'noul' })
        expect(calls).toHaveLength(1)
        expect(calls[0].url).toBe('https://openrouter.ai/api/v1/systemone')
        expect(calls[0].init.method).toBe('POST')
        expect(calls[0].init.headers).toEqual({
            Authorization: 'Bearer secret-key',
            'Content-Type': 'application/json',
        })
        expect(JSON.parse(String(calls[0].init.body))).toEqual({
            model: 'jev-1.13',
            questions: { yes: { instructions: 'Is it?', type: 'noul' } },
            state: 'hello',
        })
    })

    it('retries 429 and 5xx with backoff, then succeeds', async () => {
        const { calls, fetchImpl } = recordingFetch([429, 503, 200])
        const slept: number[] = []
        const sleep = async (ms: number): Promise<void> => {
            slept.push(ms)
        }
        const client = createClient(provider, { fetchImpl, sleep })
        await client.ask('s', { q: { instructions: 'i', type: 'noul' } })

        expect(calls).toHaveLength(3)
        expect(slept).toEqual([500, 1000])
    })

    it('gives up after RETRY_MAX retries with an error naming status and questions but not the key', async () => {
        const { calls, fetchImpl } = recordingFetch([500])
        const client = createClient(provider, { fetchImpl, sleep: noSleep })
        const attempt = client.ask('s', {
            first: { instructions: 'i', type: 'noul' },
            second: { instructions: 'j', type: 'noul' },
        })

        await expect(attempt).rejects.toThrow('HTTP 500 for questions: first, second')
        await expect(attempt).rejects.not.toThrow('secret-key')
        expect(calls).toHaveLength(RETRY_MAX + 1)
    })

    it('does not retry a 4xx other than 429', async () => {
        const { calls, fetchImpl } = recordingFetch([400])
        const client = createClient(provider, { fetchImpl, sleep: noSleep })

        await expect(client.ask('s', { q: { instructions: 'i', type: 'noul' } })).rejects.toThrow('HTTP 400')
        expect(calls).toHaveLength(1)
    })
})
