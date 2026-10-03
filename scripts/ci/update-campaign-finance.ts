/**
 * update-campaign-finance.ts
 *
 * Applies a weekly figures payload to src/content/campaignFinance.ts and bumps
 * updatedDate on the three finance pages. Run by campaign-finance-update.yml,
 * which a weekly job outside this repo triggers with a repository_dispatch event;
 * the workflow then regenerates baselines and opens a PR for a person to merge.
 *
 * The module is edited as text, not regenerated: only the literal values of
 * asOf, raised.*, spent and ownCommitment inside the `campaignFinance` object
 * change, so comments and everything else in the file stay as written.
 *
 * Env: PAYLOAD — JSON `{ asOf, raised: Record<FundingSource, number>, spent }`.
 * Prints `unchanged` and edits nothing when raised and spent already match;
 * otherwise prints a before/after table, also written to TABLE_FILE when set.
 * Writes `changed=true|false` to $GITHUB_OUTPUT when set.
 * Exit 0 on success or no-op, 1 on an invalid payload or module.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

// eslint-disable-next-line import-x/extensions -- node --experimental-strip-types needs explicit extensions
import { helsinkiDateOf } from '../../src/lib/publishing.ts'

export const MODULE_PATH = 'src/content/campaignFinance.ts'

/** The pages that render the module's figures in full; their updatedDate tracks the module. */
export const FINANCE_PAGES = [
    'src/pages/fi/eduskuntavaalit/vaalirahoitus/index.mdx',
    'src/pages/sv/riksdagsvalet/valfinansiering/index.mdx',
    'src/pages/en/elections/campaign-finance/index.mdx',
] as const

/** Mirrors `FundingSource` in the module; a spec holds the two in step. */
export const FUNDING_SOURCES = ['companies', 'loans', 'other', 'own', 'party', 'partyAssociations', 'private'] as const

type Source = (typeof FUNDING_SOURCES)[number]

export interface FinancePayload {
    asOf: string
    raised: Record<Source, number>
    spent: number
}

export interface Figures extends FinancePayload {
    budget: number
    ownCommitment: number
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const BLOCK_START = 'export const campaignFinance: CampaignFinance = {'

const isEuro = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

const sum = (raised: Record<Source, number>): number => FUNDING_SOURCES.reduce((total, key) => total + raised[key], 0)

/** Validated payload, or an Error naming every problem found. */
export function parsePayload(raw: string, budget: number, today: string): FinancePayload {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch (error) {
        throw new Error(`payload is not JSON: ${(error as Error).message}`, { cause: error })
    }
    if (typeof parsed !== 'object' || parsed === null) throw new Error('payload is not an object')
    const { asOf, raised, spent } = parsed as Record<string, unknown>

    const problems: string[] = []
    if (typeof asOf !== 'string' || !ISO_DATE.test(asOf) || Number.isNaN(Date.parse(asOf))) {
        problems.push(`asOf must be an ISO date, got ${JSON.stringify(asOf)}`)
    } else if (asOf > today) {
        problems.push(`asOf ${asOf} is in the future (today ${today})`)
    }
    if (!isEuro(spent)) problems.push(`spent must be a non-negative integer, got ${JSON.stringify(spent)}`)
    if (typeof raised !== 'object' || raised === null) {
        problems.push('raised must be an object')
    } else {
        const keys = Object.keys(raised)
        const unknown = keys.filter((key) => !(FUNDING_SOURCES as readonly string[]).includes(key))
        const missing = FUNDING_SOURCES.filter((key) => !keys.includes(key))
        if (unknown.length > 0) problems.push(`raised has unknown categories: ${unknown.join(', ')}`)
        if (missing.length > 0) problems.push(`raised is missing categories: ${missing.join(', ')}`)
        for (const [key, value] of Object.entries(raised)) {
            if (!isEuro(value))
                problems.push(`raised.${key} must be a non-negative integer, got ${JSON.stringify(value)}`)
        }
    }
    if (problems.length === 0) {
        const total = sum(raised as Record<Source, number>)
        if ((spent as number) > total) problems.push(`spent ${spent} exceeds total raised ${total}`)
        if (total > budget) problems.push(`total raised ${total} exceeds budget ${budget}`)
    }
    if (problems.length > 0) throw new Error(problems.join('\n'))

    return { asOf: asOf as string, raised: raised as Record<Source, number>, spent: spent as number }
}

/** Start and end offsets of the `campaignFinance` object literal. */
function blockBounds(source: string): { end: number; start: number } {
    const start = source.indexOf(BLOCK_START)
    if (start === -1) throw new Error(`${MODULE_PATH}: "${BLOCK_START}" not found`)
    const end = source.indexOf('\n}\n', start)
    if (end === -1) throw new Error(`${MODULE_PATH}: end of the campaignFinance literal not found`)
    return { end, start }
}

/** Pattern for one `key: value,` line, the value captured. */
const line = (key: string, value: string): RegExp => new RegExp(`^(\\s+${key}: )(${value}),$`, 'm')

const NUMBER = '\\d+'
const DATE = "'\\d{4}-\\d{2}-\\d{2}'"

function matchOnce(block: string, key: string, value: string): RegExpExecArray {
    const global = new RegExp(line(key, value).source, 'gm')
    const count = [...block.matchAll(global)].length
    if (count !== 1) throw new Error(`${MODULE_PATH}: expected one "${key}:" line in campaignFinance, found ${count}`)
    return line(key, value).exec(block) as RegExpExecArray
}

/** The figures the module holds now. */
export function readFigures(source: string): Figures {
    const { end, start } = blockBounds(source)
    const block = source.slice(start, end)
    const number = (key: string): number => Number(matchOnce(block, key, NUMBER)[2])
    const raised = Object.fromEntries(FUNDING_SOURCES.map((key) => [key, number(key)])) as Record<Source, number>

    return {
        asOf: matchOnce(block, 'asOf', DATE)[2].slice(1, -1),
        budget: number('budget'),
        ownCommitment: number('ownCommitment'),
        raised,
        spent: number('spent'),
    }
}

/**
 * `ownCommitment` is the unpaid rest of the candidate's undertaking, so it moves
 * opposite to `raised.own`: their sum is the undertaking and stays fixed.
 */
export function nextOwnCommitment(current: Figures, nextOwn: number): number {
    return Math.max(0, current.ownCommitment + current.raised.own - nextOwn)
}

export const figuresChanged = (current: Figures, payload: FinancePayload): boolean =>
    current.spent !== payload.spent || FUNDING_SOURCES.some((key) => current.raised[key] !== payload.raised[key])

/** Module source with the payload's figures written into the campaignFinance literal. */
export function applyPayload(source: string, payload: FinancePayload): string {
    const current = readFigures(source)
    const { end, start } = blockBounds(source)
    const values: [string, string, string][] = [
        ['asOf', DATE, `'${payload.asOf}'`],
        ['ownCommitment', NUMBER, String(nextOwnCommitment(current, payload.raised.own))],
        ['spent', NUMBER, String(payload.spent)],
        ...FUNDING_SOURCES.map((key): [string, string, string] => [key, NUMBER, String(payload.raised[key])]),
    ]
    let block = source.slice(start, end)
    for (const [key, pattern, value] of values) {
        matchOnce(block, key, pattern)
        block = block.replace(line(key, pattern), `$1${value},`)
    }
    return source.slice(0, start) + block + source.slice(end)
}

/** MDX source with its frontmatter updatedDate set to `date`. */
export function setUpdatedDate(path: string, source: string, date: string): string {
    const pattern = /^updatedDate: '\d{4}-\d{2}-\d{2}'$/m
    if (!pattern.test(source)) throw new Error(`${path}: no updatedDate line in the frontmatter`)
    return source.replace(pattern, `updatedDate: '${date}'`)
}

/** Before/after table for the PR body, so the reviewer checks figures, not a diff. */
export function changeTable(before: Figures, after: Figures): string {
    const rows: [string, number, number][] = [
        ...FUNDING_SOURCES.map((key): [string, number, number] => [
            `raised.${key}`,
            before.raised[key],
            after.raised[key],
        ]),
        ['raised total', sum(before.raised), sum(after.raised)],
        ['spent', before.spent, after.spent],
        ['ownCommitment', before.ownCommitment, after.ownCommitment],
    ]

    return [
        `Figures as of ${after.asOf} (previously ${before.asOf}), whole euros.`,
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
    const source = readFileSync(MODULE_PATH, 'utf8')
    const current = readFigures(source)
    const payload = parsePayload(raw, current.budget, today)

    if (!figuresChanged(current, payload)) {
        console.log('unchanged')
        output(false)
        return
    }

    writeFileSync(MODULE_PATH, applyPayload(source, payload))
    for (const page of FINANCE_PAGES) {
        writeFileSync(page, setUpdatedDate(page, readFileSync(page, 'utf8'), today))
    }
    const table = changeTable(current, readFigures(readFileSync(MODULE_PATH, 'utf8')))
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
