/**
 * Owner inbox for Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md § Owner flow).
 *
 *   npm run adoptions -- list
 *   npm run adoptions -- approve <id|ref…> [--via mobilepay|lasku]
 *   npm run adoptions -- reject <id|ref>
 *   npm run adoptions -- approve-message <id|ref> | reject-message <id|ref>
 *   npm run adoptions -- revoke <id|ref>
 *   npm run adoptions -- print
 *   npm run adoptions -- page add <id|ref> | page remove <slug>
 *
 * approve: after matching the MobilePay report by ref (or name, amount and date). Refuses a
 * company-form name without company details, warns when the payer differs from the sign name,
 * warns at 2 000 euros per giver and stops above 6 000. Prints the confirmation as a mailto: link.
 * print: writes the approved, unprinted rows to adoptions-print/<date>.csv (gitignored) and marks
 * them printed. revoke: deletes the row; a printed name goes to adoptions-print/cover.csv.
 * page add|remove: changes one entry of src/content/adoptionPages.json in a commit of its own
 * (GPG-signed) on its own branch from origin/main, pushes it and opens the PR.
 *
 * Env (.env): ADOPTIONS_TOKEN. ADOPTIONS_URL overrides the site origin (default https://lavanti.fi).
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { AdoptionPage } from '../../src/content/adoptionPages.ts'

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { INVOICE_TITLE } from '../../src/content/signAdoption.ts'
import { helsinkiDateOf } from '../../src/lib/publishing.ts'
import {
    type Adoption,
    capCheck,
    donation,
    formatPages,
    looksLikeCompany,
    mailtoUrl,
    pageEntry,
    payerKey,
    payerTotals,
    printCsv,
    resolveIds,
    sameName,
} from './entry.ts'
/* eslint-enable import-x/extensions */

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const PAGES_FILE = 'src/content/adoptionPages.json'
const PRINT_DIR = join(ROOT, 'adoptions-print')
const ORIGIN = process.env.ADOPTIONS_URL ?? 'https://lavanti.fi'

const exit = (message: string): never => {
    console.error(message)
    process.exit(1)
}

const fail = (message: string): never => {
    throw new Error(message)
}

const token = process.env.ADOPTIONS_TOKEN ?? exit('Missing ADOPTIONS_TOKEN (set it in .env).')

const api = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const res = await fetch(`${ORIGIN}/api/adoptoi${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    })
    if (!res.ok) fail(`${init.method ?? 'GET'} ${path} failed: ${res.status} ${(await res.text()).slice(0, 200)}`)

    return res
}

const inbox = async () => (await (await api('/pending')).json()) as { adoptions: Adoption[]; messages: Adoption[] }

const approvedRows = async () =>
    ((await (await api('/pending?status=approved')).json()) as { adoptions: Adoption[] }).adoptions

const act = (id: number, action: string, extra: Record<string, string> = {}) =>
    api(`/${id}`, { body: JSON.stringify({ action, ...extra }), method: 'POST' })

const git = (...args: string[]): string => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err))

const describe = (r: Adoption) =>
    `${r.id}  ${r.ref_code}  ${r.created_at.slice(0, 10)}  ${r.sign_name} × ${r.quantity} (${donation(r)} €)  ${r.municipality}  ${r.lang}` +
    (r.company_name ? `\n    yritys: ${r.company_name} ${r.business_id} → ${r.billing_address}` : '') +
    (r.payer_name ? `\n    maksaja: ${r.payer_name}` : '') +
    `\n    ${r.email}${r.public ? '  · listalla' : ''}${r.consent_page_at ? '  · oma sivu' : ''}`

const list = async () => {
    const { adoptions, messages } = await inbox()
    console.log(adoptions.length === 0 ? 'No pending adoptions.' : 'Pending adoptions:\n')
    for (const r of adoptions) console.log(`${describe(r)}\n`)
    if (messages.length > 0) console.log('Messages awaiting moderation:\n')
    for (const r of messages) console.log(`${r.id}  ${r.ref_code}  ${r.sign_name}: ${r.message}\n`)
}

/** Ids from the arguments, resolved against `rows`; unknown ones stop the command. */
const idsFrom = (args: string[], rows: Adoption[]): number[] => {
    const { ids, unknown } = resolveIds(args, rows)
    if (args.length === 0) fail('Give at least one id or K-NNNNN ref; `list` shows them.')
    if (unknown.length > 0) fail(`Not found: ${unknown.join(' ')}`)

    return ids
}

const approve = async (args: string[]) => {
    const viaIndex = args.indexOf('--via')
    const via = viaIndex >= 0 ? args[viaIndex + 1] : undefined
    if (via !== undefined && via !== 'mobilepay' && via !== 'lasku') fail('--via is mobilepay or lasku.')
    const refs = viaIndex >= 0 ? args.filter((_, i) => i !== viaIndex && i !== viaIndex + 1) : args
    const { adoptions } = await inbox()
    const totals = payerTotals(await approvedRows())

    for (const id of idsFrom(refs, adoptions)) {
        const r = adoptions.find((x) => x.id === id)!
        if (looksLikeCompany(r.sign_name) && !r.company_name) {
            console.error(`${r.ref_code}: "${r.sign_name}" looks like a company but has no company details;`)
            console.error('  a company name goes on a sign only when the company pays by invoice. Skipped.')
            continue
        }
        if (r.payer_name && !sameName(r.payer_name, r.sign_name)) {
            console.warn(`${r.ref_code}: payer "${r.payer_name}" differs from the sign name "${r.sign_name}".`)
        }
        const key = payerKey(r)
        const total = (totals.get(key) ?? 0) + donation(r)
        const check = capCheck(total)
        if (check === 'stop') {
            console.error(`${r.ref_code}: ${key} would reach ${total} €, above the 6 000 € cap. Skipped.`)
            continue
        }
        if (check === 'warn')
            console.warn(`${r.ref_code}: ${key} reaches ${total} € (≥ 2 000 €): tarkista myös muut kanavat.`)

        await act(r.id, 'approve', { paid_via: via ?? (r.company_name ? 'lasku' : 'mobilepay') })
        totals.set(key, total)
        console.log(`Approved ${r.ref_code} ${r.sign_name} × ${r.quantity}.`)
        if (r.company_name) {
            console.log(`  Invoice: ${INVOICE_TITLE}, ${donation(r)} €, no VAT → ${r.billing_address}`)
        }
        console.log(`  Confirmation: ${mailtoUrl(r)}\n`)
    }
}

const simple = (action: string, done: string) => async (args: string[]) => {
    const { adoptions, messages } = await inbox()
    const rows = [...adoptions, ...messages, ...(action === 'reject' ? [] : await approvedRows())]
    for (const id of idsFrom(args, rows)) {
        await act(id, action)
        console.log(`${done} ${rows.find((r) => r.id === id)?.ref_code ?? id}.`)
    }
}

const readPages = (): AdoptionPage[] => JSON.parse(readFileSync(join(ROOT, PAGES_FILE), 'utf8')) as AdoptionPage[]

const revoke = async (args: string[]) => {
    const { adoptions } = await inbox()
    const rows = [...adoptions, ...(await approvedRows())]
    for (const id of idsFrom(args, rows)) {
        const r = rows.find((x) => x.id === id)!
        await api(`/${id}`, { method: 'DELETE' })
        console.log(`Revoked and deleted ${r.ref_code} ${r.sign_name}.`)
        if (r.printed_at) {
            mkdirSync(PRINT_DIR, { recursive: true })
            appendFileSync(
                join(PRINT_DIR, 'cover.csv'),
                `${r.ref_code},"${r.sign_name.replaceAll('"', '""')}",${r.quantity}\n`
            )
            console.log('  The name was already printed: added to adoptions-print/cover.csv for the next sign round.')
        }
        for (const page of readPages().filter((p) => p.name === r.sign_name && p.lang === r.lang)) {
            console.log(`  It has a personal page: npm run adoptions -- page remove ${page.slug}`)
        }
    }
}

const print = async () => {
    const rows = (await approvedRows()).filter((r) => !r.printed_at)
    if (rows.length === 0) return console.log('Nothing new to print.')
    mkdirSync(PRINT_DIR, { recursive: true })
    const file = join(PRINT_DIR, `${helsinkiDateOf(new Date())}.csv`)
    if (existsSync(file)) fail(`${file} exists; move it away first so no round is overwritten.`)
    writeFileSync(file, printCsv(rows))
    for (const r of rows) await act(r.id, 'printed')
    console.log(`Wrote ${rows.length} adoptions (${rows.reduce((n, r) => n + r.quantity, 0)} signs) to ${file}.`)
}

/**
 * One commit that touches only adoptionPages.json, on its own branch from origin/main, pushed with
 * a PR: the repo rule that keeps every personal page revertable on its own.
 */
const commitPages = (branch: string, title: string, change: (pages: AdoptionPage[]) => AdoptionPage[]) => {
    if (git('status', '--porcelain') !== '') fail('Working tree is not clean; commit or stash first.')
    const start = git('rev-parse', '--abbrev-ref', 'HEAD')
    if (start === 'HEAD') fail('HEAD is detached; check out a branch first.')
    git('fetch', 'origin', 'main')
    if (git('branch', '--list', branch) !== '' || git('ls-remote', '--heads', 'origin', branch) !== '') {
        fail(`${branch} already exists; finish or delete it first.`)
    }
    git('switch', '-c', branch, 'origin/main')
    let committed = false
    try {
        writeFileSync(join(ROOT, PAGES_FILE), formatPages(change(readPages())))
        execFileSync('git', ['commit', '-S', '-m', title, '--', PAGES_FILE], { cwd: ROOT, stdio: 'inherit' })
        committed = true
        git('push', '-u', 'origin', branch)
        execFileSync('gh', ['pr', 'create', '--base', 'main', '--title', title, '--body', `${title}.`], {
            cwd: ROOT,
            stdio: 'inherit',
        })
    } catch (err) {
        if (!committed) {
            git('checkout', '--', PAGES_FILE)
            git('switch', start)
            git('branch', '-D', branch)
            fail(`${errorText(err)}\nNothing was committed and ${branch} is removed.`)
        }
        git('switch', start)
        fail(`${errorText(err)}\n${branch} keeps the commit; push it and open the PR by hand.`)
    }
    git('switch', start)
}

const page = async ([sub, arg]: string[]) => {
    if (sub === 'add') {
        const rows = await approvedRows()
        const [id] = idsFrom(arg ? [arg] : [], rows)
        const r = rows.find((x) => x.id === id)!
        if (!r.consent_page_at) fail(`${r.ref_code} did not ask for a personal page.`)
        const entry = pageEntry(
            r,
            readPages().map((p) => p.slug)
        )
        commitPages(`feat/adoptoi-page-${entry.slug}`, `feat(adoptoi): add page for ${entry.slug}`, (pages) => [
            ...pages,
            entry,
        ])
        console.log(`Opened the PR for ${entry.slug}; it goes live when the PR is merged.`)
    } else if (sub === 'remove') {
        if (!arg || !readPages().some((p) => p.slug === arg)) fail('Give the slug of an existing page.')
        commitPages(`chore/adoptoi-remove-${arg}`, `chore(adoptoi): remove page for ${arg}`, (pages) =>
            pages.filter((p) => p.slug !== arg)
        )
        console.log(`Opened the PR removing ${arg}; the page leaves the site when it is merged.`)
    } else {
        fail('Usage: npm run adoptions -- page add <id|ref> | page remove <slug>')
    }
}

const [command, ...args] = process.argv.slice(2)
const commands: Record<string, (args: string[]) => Promise<void>> = {
    approve,
    'approve-message': simple('approve-message', 'Approved the message of'),
    list,
    page,
    print,
    reject: simple('reject', 'Rejected'),
    'reject-message': simple('reject-message', 'Rejected the message of'),
    revoke,
}
try {
    await (
        commands[command ?? ''] ??
        (() =>
            fail(
                'Usage: npm run adoptions -- list | approve <id…> [--via mobilepay|lasku] | reject <id> | approve-message <id> | reject-message <id> | revoke <id> | print | page add <id> | page remove <slug>'
            ))
    )(args)
} catch (err) {
    exit(errorText(err))
}
