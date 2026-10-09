import type { D1Like, D1Statement } from '../src/lib/formHandling'

/** Fakes for the Pages Functions form handlers (src/lib/volunteers.ts, recommendationSubmissions.ts). */

interface Call {
    args: unknown[]
    sql: string
}

/**
 * Records every statement run; `results` maps a SQL fragment to the rows `all()`/`first()` return
 * (`''` matches every statement). With `fail`, `run()` throws as if the database were down.
 */
export const fakeDb = (results: Record<string, unknown[]> = {}, fail = false) => {
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

/** A Turnstile siteverify stub answering `success` for `hostname`. */
export const turnstile =
    (success: boolean, hostname = 'lavanti.fi') =>
    async () =>
        new Response(JSON.stringify({ hostname, success }))
