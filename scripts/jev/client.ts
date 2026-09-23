/**
 * client.ts
 *
 * Minimal HTTP client for TypeSafe AI's System One endpoint (the Jev decision
 * model), reachable directly or through OpenRouter. No SDK: Node's global
 * fetch is enough, and the wire format is the same on both providers.
 *
 * Spec: .agents/specs/jev/spec.md
 */

import { setTimeout as delay } from 'node:timers/promises'

export const RETRY_MAX = 3
const RETRY_BASE_MS = 500
export const NO_PROVIDER_NOTICE = 'skipped: no OPENROUTER_API_KEY or TYPESAFE_API_KEY'
/** Jev accepts at most this many options in one choice question. */
export const CHOICE_OPTION_MAX = 255

export type QuestionSpec =
    | { criteria: Record<string, string>; instructions: string; type: 'choice' }
    | { criteria: string[]; instructions: string; type: 'score' }
    | { instructions: string; type: 'noul' }

type SystemOneState = Record<string, unknown> | string | string[]

interface SystemOneRequest {
    model: string
    questions: Record<string, QuestionSpec>
    state: SystemOneState
}

export type Answer =
    | { choice: string; confidence: number; probabilities: Record<string, number>; type: 'choice' }
    | { confidence: number; probabilities: Record<string, number>; score: string; type: 'score' }
    | { noul: number; type: 'noul' }

export interface SystemOneResponse {
    answers: Record<string, Answer>
    id: string
    model: string
    usage: { cost?: number; input_tokens: number; output_tokens: number }
}

export interface Provider {
    apiKey: string
    baseUrl: string
    model: string
    name: 'openrouter' | 'typesafe'
}

export interface JevClient {
    ask(state: SystemOneState, questions: Record<string, QuestionSpec>): Promise<SystemOneResponse>
    provider: Provider
}

interface ClientDeps {
    fetchImpl?: typeof fetch
    sleep?: (ms: number) => Promise<void>
}

/** Pick the provider from the environment. TypeSafe direct wins over OpenRouter; null when neither key is set. */
export function resolveProvider(env: NodeJS.ProcessEnv): Provider | null {
    if (env.TYPESAFE_API_KEY) {
        return {
            apiKey: env.TYPESAFE_API_KEY,
            baseUrl: 'https://api.typesafe.ai',
            model: 'jev-1.13.0',
            name: 'typesafe',
        }
    }
    if (env.OPENROUTER_API_KEY) {
        return {
            apiKey: env.OPENROUTER_API_KEY,
            baseUrl: 'https://openrouter.ai/api',
            model: 'jev-1.13',
            name: 'openrouter',
        }
    }

    return null
}

const isRetryable = (status: number): boolean => status === 429 || status >= 500

export function createClient(provider: Provider, deps: ClientDeps = {}): JevClient {
    const fetchImpl = deps.fetchImpl ?? fetch
    const sleep = deps.sleep ?? ((ms: number) => delay(ms))
    const url = `${provider.baseUrl}/v1/systemone`

    const ask = async (state: SystemOneState, questions: Record<string, QuestionSpec>): Promise<SystemOneResponse> => {
        const body = JSON.stringify({ model: provider.model, questions, state } satisfies SystemOneRequest)
        const names = Object.keys(questions).join(', ')
        let lastStatus = 0
        for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
            if (attempt > 0) await sleep(RETRY_BASE_MS * 2 ** (attempt - 1))
            const res = await fetchImpl(url, {
                body,
                headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
                method: 'POST',
            })
            if (res.ok) return (await res.json()) as SystemOneResponse
            lastStatus = res.status
            if (!isRetryable(res.status)) break
        }

        // The message names the status and the questions, never the key.
        throw new Error(`Jev (${provider.name}) returned HTTP ${lastStatus} for questions: ${names}`)
    }

    return { ask, provider }
}

/** Run fn over items with at most `concurrency` in flight, preserving order; stops handing out work after the first failure. */
export async function mapConcurrent<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array<R>(items.length)
    let next = 0
    let failed = false
    const worker = async (): Promise<void> => {
        // Stop handing out new (paid) work once any item has failed; the first error rejects the whole run.
        while (next < items.length && !failed) {
            const index = next++
            try {
                results[index] = await fn(items[index], index)
            } catch (error) {
                failed = true
                throw error
            }
        }
    }
    await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker))

    return results
}
