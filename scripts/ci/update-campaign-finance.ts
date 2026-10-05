/**
 * update-campaign-finance.ts
 *
 * Applies a weekly figures payload to src/content/campaignFinanceFigures.json and
 * bumps updatedDate on the three finance pages. Run by campaign-finance-update.yml,
 * which a weekly job outside this repo triggers with a repository_dispatch event;
 * the workflow then regenerates baselines and opens a PR for a person to merge.
 *
 * The workflow runs this before `npm ci`, so it imports nothing but Node built-ins
 * and src/lib/publishing.ts. The source and category lists below mirror the types in
 * src/content/campaignFinance.ts; a spec holds them in step.
 *
 * The JSON is written whole, in canonical key order, as `JSON.stringify(…, null, 4)`
 * plus a newline — byte-identical to Prettier under .prettierrc.mjs, which a spec
 * checks — so the bot's commit can never fail a format or lint check.
 *
 * Env: PAYLOAD — JSON
 *   `{ asOf, raised: { <source>: { banked, pending } }, spent: { <category>: { budgeted, banked, committed } } }`.
 * Prints `unchanged` and edits nothing when raised and spent already match, whatever
 * asOf says; otherwise prints a before/after table, also written to TABLE_FILE when set.
 * Writes `changed=true|false` to $GITHUB_OUTPUT when set.
 * Exit 0 on success or no-op, 1 on an invalid payload.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

// eslint-disable-next-line import-x/extensions -- node --experimental-strip-types needs explicit extensions
import { helsinkiDateOf } from '../../src/lib/publishing.ts'

/** Holds the manual `budget` the payload is validated against. */
export const MODULE_PATH = 'src/content/campaignFinance.ts'

/** The figures this script owns and rewrites whole. */
export const FIGURES_PATH = 'src/content/campaignFinanceFigures.json'

/** The pages that render the figures in full; their updatedDate tracks both files. */
export const FINANCE_PAGES = [
    'src/pages/fi/eduskuntavaalit/vaalirahoitus/index.mdx',
    'src/pages/sv/riksdagsvalet/valfinansiering/index.mdx',
    'src/pages/en/elections/campaign-finance/index.mdx',
] as const

/** `FundingSource` in §6 order, which is also the file's key order. */
export const FUNDING_SOURCES = ['own', 'loans', 'private', 'companies', 'party', 'partyAssociations', 'other'] as const

/** `ExpenseCategory` in the disclosure form's order, which is also the file's key order. */
export const EXPENSE_CATEGORIES = ['media', 'outdoor', 'print', 'design', 'events', 'supportCosts', 'other'] as const

const INCOME_FIELDS = ['banked', 'pending'] as const
const EXPENSE_FIELDS = ['budgeted', 'banked', 'committed'] as const

type Source = (typeof FUNDING_SOURCES)[number]
type Category = (typeof EXPENSE_CATEGORIES)[number]
type Income = Record<(typeof INCOME_FIELDS)[number], number>
type Expense = Record<(typeof EXPENSE_FIELDS)[number], number>

export interface FinancePayload {
    asOf: string
    raised: Record<Source, Income>
    spent: Record<Category, Expense>
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isEuro = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

/** Every problem with one group (`raised` or `spent`): keys, then each entry's fields and amounts. */
function groupProblems(name: string, group: unknown, keys: readonly string[], fields: readonly string[]): string[] {
    if (!isObject(group)) return [`${name} must be an object`]
    const problems: string[] = []
    const present = Object.keys(group)
    const unknown = present.filter((key) => !keys.includes(key))
    const missing = keys.filter((key) => !present.includes(key))
    if (unknown.length > 0) problems.push(`${name} has unknown keys: ${unknown.join(', ')}`)
    if (missing.length > 0) problems.push(`${name} is missing keys: ${missing.join(', ')}`)
    for (const key of keys.filter((candidate) => present.includes(candidate))) {
        const entry = group[key]
        if (!isObject(entry)) {
            problems.push(`${name}.${key} must be an object`)
            continue
        }
        const extra = Object.keys(entry).filter((field) => !fields.includes(field))
        if (extra.length > 0) problems.push(`${name}.${key} has unknown fields: ${extra.join(', ')}`)
        for (const field of fields) {
            if (!isEuro(entry[field]))
                problems.push(
                    `${name}.${key}.${field} must be a non-negative integer, got ${JSON.stringify(entry[field])}`
                )
        }
    }
    return problems
}

const sumOf = <K extends string, F extends string>(group: Record<K, Record<F, number>>, field: F): number =>
    Object.values<Record<F, number>>(group).reduce((total, entry) => total + entry[field], 0)

/** The figures with every key in canonical order, whatever order they arrived in. */
export function canonical(figures: FinancePayload): FinancePayload {
    const order = <T extends Record<string, number>>(entry: T, fields: readonly (keyof T)[]): T =>
        Object.fromEntries(fields.map((field) => [field, entry[field]])) as unknown as T

    return {
        asOf: figures.asOf,
        raised: Object.fromEntries(
            FUNDING_SOURCES.map((source) => [source, order(figures.raised[source], INCOME_FIELDS)])
        ) as Record<Source, Income>,
        spent: Object.fromEntries(
            EXPENSE_CATEGORIES.map((category) => [category, order(figures.spent[category], EXPENSE_FIELDS)])
        ) as Record<Category, Expense>,
    }
}

/** The file's exact text: Prettier's JSON output under the repo config. */
export const serializeFigures = (figures: FinancePayload): string => `${JSON.stringify(canonical(figures), null, 4)}\n`

/** Validated payload in canonical order, or an Error naming every problem found. */
export function parsePayload(raw: string, budget: number, today: string): FinancePayload {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (error) {
        throw new Error(`payload is not JSON: ${(error as Error).message}`, { cause: error })
    }
    if (!isObject(parsed)) throw new Error('payload is not an object')
    const { asOf, raised, spent } = parsed

    const problems: string[] = []
    if (typeof asOf !== 'string' || !ISO_DATE.test(asOf) || Number.isNaN(Date.parse(asOf))) {
        problems.push(`asOf must be an ISO date, got ${JSON.stringify(asOf)}`)
    } else if (asOf > today) {
        problems.push(`asOf ${asOf} is in the future (today ${today})`)
    }
    problems.push(...groupProblems('raised', raised, FUNDING_SOURCES, INCOME_FIELDS))
    problems.push(...groupProblems('spent', spent, EXPENSE_CATEGORIES, EXPENSE_FIELDS))
    if (problems.length > 0) throw new Error(problems.join('\n'))

    const payload = canonical(parsed as unknown as FinancePayload)
    const raisedBanked = sumOf(payload.raised, 'banked')
    const raisedTotal = raisedBanked + sumOf(payload.raised, 'pending')
    const spentBanked = sumOf(payload.spent, 'banked')
    if (raisedTotal > budget) problems.push(`total raised ${raisedTotal} (banked + pending) exceeds budget ${budget}`)
    // Committed spending may run ahead of the account; paid-out money cannot.
    if (spentBanked > raisedBanked) problems.push(`spent ${spentBanked} exceeds banked raised ${raisedBanked}`)
    if (problems.length > 0) throw new Error(problems.join('\n'))

    return payload
}

/** The manual `budget` from the data module. */
export function readBudget(source: string): number {
    const matches = [...source.matchAll(/^\s+budget: (\d+),$/gm)]
    if (matches.length !== 1) throw new Error(`${MODULE_PATH}: expected one "budget:" line, found ${matches.length}`)
    return Number(matches[0][1])
}

export const readFigures = (source: string): FinancePayload => JSON.parse(source) as FinancePayload

export const figuresChanged = (current: FinancePayload, payload: FinancePayload): boolean => {
    const figuresOnly = ({ raised, spent }: FinancePayload): string =>
        JSON.stringify(canonical({ asOf: '', raised, spent }))

    return figuresOnly(current) !== figuresOnly(payload)
}

/** MDX source with its frontmatter updatedDate set to `date`. */
export function setUpdatedDate(path: string, source: string, date: string): string {
    const pattern = /^updatedDate: '\d{4}-\d{2}-\d{2}'$/m
    if (!pattern.test(source)) throw new Error(`${path}: no updatedDate line in the frontmatter`)
    return source.replace(pattern, `updatedDate: '${date}'`)
}

/** Before/after table for the PR body, so the reviewer checks figures, not a diff. */
export function changeTable(before: FinancePayload, after: FinancePayload): string {
    const income = (entry: Income): string => `${entry.banked} + ${entry.pending}`
    const expense = (entry: Expense): string => `${entry.banked} + ${entry.committed} / ${entry.budgeted}`
    const rows: [string, string, string][] = [
        ...FUNDING_SOURCES.map((source): [string, string, string] => [
            `raised.${source}`,
            income(before.raised[source]),
            income(after.raised[source]),
        ]),
        [
            'raised total',
            income({ banked: sumOf(before.raised, 'banked'), pending: sumOf(before.raised, 'pending') }),
            income({ banked: sumOf(after.raised, 'banked'), pending: sumOf(after.raised, 'pending') }),
        ],
        ...EXPENSE_CATEGORIES.map((category): [string, string, string] => [
            `spent.${category}`,
            expense(before.spent[category]),
            expense(after.spent[category]),
        ]),
        ...(['budgeted', 'banked', 'committed'] as const).map((field): [string, string, string] => [
            `spent total ${field}`,
            String(sumOf(before.spent, field)),
            String(sumOf(after.spent, field)),
        ]),
    ]

    return [
        `Figures as of ${after.asOf} (previously ${before.asOf}), whole euros.`,
        'Raised: banked + pending. Spent: paid + committed / budgeted.',
        '',
        '| Field | Before | After |',
        '|---|---:|---:|',
        ...rows.map(([field, from, to]) => `| ${from === to ? field : `**${field}**`} | ${from} | ${to} |`),
    ].join('\n')
}

function main(): void {
    const raw = process.env.PAYLOAD
    if (!raw) {
        console.error('update-campaign-finance: PAYLOAD is required')
        process.exit(1)
    }
    const output = (changed: boolean): void => {
        if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`)
    }

    const today = helsinkiDateOf(new Date())
    const current = readFigures(readFileSync(FIGURES_PATH, 'utf8'))
    const payload = parsePayload(raw, readBudget(readFileSync(MODULE_PATH, 'utf8')), today)

    if (!figuresChanged(current, payload)) {
        console.log('unchanged')
        output(false)
        return
    }

    writeFileSync(FIGURES_PATH, serializeFigures(payload))
    for (const page of FINANCE_PAGES) {
        writeFileSync(page, setUpdatedDate(page, readFileSync(page, 'utf8'), today))
    }
    const table = changeTable(current, payload)
    console.log(table)
    if (process.env.TABLE_FILE) writeFileSync(process.env.TABLE_FILE, `${table}\n`)
    output(true)
}

if (import.meta.filename === process.argv[1]) {
    try {
        main()
    } catch (error) {
        console.error(`update-campaign-finance: ${(error as Error).message}`)
        process.exit(1)
    }
}
