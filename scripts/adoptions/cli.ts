/**
 * Owner inbox for Adoptoi kyltti (spec: .agents/specs/sign-adoption/spec.md § Owner flow).
 *
 *   npm run adoptions -- list
 *   npm run adoptions -- approve <id|ref…> [--via mobilepay|tilisiirto|lasku] [--payer "<name>"]
 *   npm run adoptions -- reject <id|ref>
 *   npm run adoptions -- approve-message <id|ref> | reject-message <id|ref>
 *   npm run adoptions -- revoke <id|ref>
 *   npm run adoptions -- print
 *   npm run adoptions -- page add <id|ref> | page remove <slug>
 *   npm run adoptions -- mobilepay-webhook <url>
 *
 * approve: after matching the MobilePay report by ref (or name, amount and date). Refuses a
 * company-form name without company details, warns when the payer differs from the sign name,
 * warns at 2 000 euros per giver and stops above 6 000. Prints the confirmation as a mailto: link.
 * A donation without a name on the sign and no payer name needs `--payer` (one ref) with the name
 * from the MobilePay report or bank statement, so the giver stays identifiable for the limits.
 * print: writes the approved, unprinted named rows to adoptions-print/<date>.csv (gitignored),
 * counts the signs without a name apart, and marks all of them printed. revoke: deletes the row; a
 * printed name goes to adoptions-print/cover.csv. page add refuses a row without a name.
 * page add|remove: changes one entry of src/content/adoptionPages.json in a commit of its own
 * (GPG-signed) on its own branch from origin/main, pushes it and opens the PR.
 *
 * mobilepay-webhook: registers the MobilePay online webhook once per environment and prints its
 * secret for the Pages secret MOBILEPAY_WEBHOOK_SECRET. `list` marks rows MobilePay online already
 * confirmed; `reject` on one reminds to refund it in the MobilePay portal.
 *
 * Env (.env): ADOPTIONS_TOKEN. ADOPTIONS_URL overrides the site origin (default https://lavanti.fi).
 * mobilepay-webhook also needs MOBILEPAY_CLIENT_ID, MOBILEPAY_CLIENT_SECRET, MOBILEPAY_MSN,
 * MOBILEPAY_SUBSCRIPTION_KEY and, for the test environment, MOBILEPAY_API=https://apitest.vipps.no.
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { AdoptionPage } from '../../src/content/adoptionPages.ts'

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { INVOICE_TITLE } from '../../src/content/signAdoption.ts'
import { mobilePayConfig, registerWebhook } from '../../src/lib/mobilePay.ts'
import { helsinkiDateOf } from '../../src/lib/publishing.ts'
import {
    type Adoption,
    capCheck,
    donation,
    formatPages,
    looksLikeCompany,
    mailtoUrl,
    needsPayer,
    pageEntry,
    payerKey,
    payerTotals,
    printCsv,
    printRound,
    resolveIds,
    sameName,
    signLabel,
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

// Read on first use: mobilepay-webhook talks to MobilePay only and needs no admin token.
const token = (): string => process.env.ADOPTIONS_TOKEN ?? exit('Missing ADOPTIONS_TOKEN (set it in .env).')

const api = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const res = await fetch(`${ORIGIN}/api/adoptoi${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...init.headers },
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
    `${r.id}  ${r.ref_code}  ${r.created_at.slice(0, 10)}  ${signLabel(r)} × ${r.quantity} (${donation(r)} €)  ${r.municipality}  ${r.lang}` +
    (r.company_name ? `\n    yritys: ${r.company_name} ${r.business_id} → ${r.billing_address}` : '') +
    (r.paid_at ? `\n    MAKSETTU MobilePayllä ${r.paid_at.slice(0, 10)}` : '') +
    (r.payer_name ? `\n    maksaja: ${r.payer_name}` : '') +
    `\n    ${r.email}${r.public ? '  · listalla' : ''}${r.consent_page_at ? '  · oma sivu' : ''}`

const list = async () => {
    const { adoptions, messages } = await inbox()
    console.log(adoptions.length === 0 ? 'No pending adoptions.' : 'Pending adoptions:\n')
    for (const r of adoptions) console.log(`${describe(r)}\n`)
    if (messages.length > 0) console.log('Messages awaiting moderation:\n')
    for (const r of messages) console.log(`${r.id}  ${r.ref_code}  ${signLabel(r)}: ${r.message}\n`)
}

/** Ids from the arguments, resolved against `rows`; unknown ones stop the command. */
const idsFrom = (args: string[], rows: Adoption[]): number[] => {
    const { ids, unknown } = resolveIds(args, rows)
    if (args.length === 0) fail('Give at least one id or K-NNNNN ref; `list` shows them.')
    if (unknown.length > 0) fail(`Not found: ${unknown.join(' ')}`)

    return ids
}

/** `--flag value` out of the arguments: the value (or undefined) and the arguments without both. */
const takeFlag = (args: string[], flag: string): [string | undefined, string[]] => {
    const i = args.indexOf(flag)
    if (i < 0) return [undefined, args]
    if (args[i + 1] === undefined) fail(`${flag} needs a value.`)

    return [args[i + 1], args.filter((_, j) => j !== i && j !== i + 1)]
}

const approve = async (args: string[]) => {
    const [via, rest] = takeFlag(args, '--via')
    if (via !== undefined && !['lasku', 'mobilepay', 'tilisiirto'].includes(via))
        fail('--via is mobilepay, tilisiirto or lasku.')
    const [payer, refs] = takeFlag(rest, '--payer')
    if (payer !== undefined && refs.length !== 1) fail('--payer goes with exactly one id or ref.')
    const { adoptions } = await inbox()
    const totals = payerTotals(await approvedRows())

    for (const id of idsFrom(refs, adoptions)) {
        const found = adoptions.find((x) => x.id === id)!
        if (needsPayer(found) && payer === undefined) {
            console.error(`${found.ref_code}: no name on the sign and no payer name. Find the payer in the`)
            console.error(`  MobilePay report or bank statement and run: approve ${found.ref_code} --payer "<name>"`)
            continue
        }
        const r = payer === undefined ? found : { ...found, payer_name: payer }
        if (r.sign_name !== null && looksLikeCompany(r.sign_name) && !r.company_name) {
            console.error(`${r.ref_code}: "${r.sign_name}" looks like a company but has no company details;`)
            console.error('  a company name goes on a sign only when the company pays by invoice. Skipped.')
            continue
        }
        if (r.payer_name && r.sign_name !== null && !sameName(r.payer_name, r.sign_name)) {
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

        await act(r.id, 'approve', {
            // A row MobilePay online already confirmed keeps paid_via 'mobilepay' on the server.
            paid_via: via ?? (r.company_name ? 'lasku' : 'mobilepay'),
            ...(payer === undefined ? {} : { payer_name: payer }),
        })
        totals.set(key, total)
        console.log(`Approved ${r.ref_code} ${signLabel(r)} × ${r.quantity}.`)
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
        const r = rows.find((x) => x.id === id)
        await act(id, action)
        console.log(`${done} ${r?.ref_code ?? id}.`)
        if (action === 'reject' && r?.paid_at) {
            console.warn('  MobilePay online already took this donation: refund it in portal.vippsmobilepay.com.')
        }
    }
}

/** Registers the MobilePay webhook once per environment and prints the secret for the Pages settings. */
const mobilePayWebhook = async ([url]: string[]) => {
    const config = mobilePayConfig(process.env) ?? fail('Set the MOBILEPAY_* keys in .env first.')
    if (!url?.startsWith('https://'))
        fail('Usage: npm run adoptions -- mobilepay-webhook https://lavanti.fi/api/adoptoi/mobilepay')
    const { id, secret } = await registerWebhook(config, fetch, url)
    console.log(`Registered webhook ${id} for ${url} at ${config.api}.`)
    console.log(`Set this as the Pages secret MOBILEPAY_WEBHOOK_SECRET (shown once): ${secret}`)
}

const readPages = (): AdoptionPage[] => JSON.parse(readFileSync(join(ROOT, PAGES_FILE), 'utf8')) as AdoptionPage[]

const revoke = async (args: string[]) => {
    const { adoptions } = await inbox()
    const rows = [...adoptions, ...(await approvedRows())]
    for (const id of idsFrom(args, rows)) {
        const r = rows.find((x) => x.id === id)!
        await api(`/${id}`, { method: 'DELETE' })
        console.log(`Revoked and deleted ${r.ref_code} ${signLabel(r)}.`)
        // A sign without a name has nothing to cover and no personal page.
        if (r.sign_name === null) continue
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
    const round = printRound(rows)
    if (round.named.length > 0) {
        mkdirSync(PRINT_DIR, { recursive: true })
        const file = join(PRINT_DIR, `${helsinkiDateOf(new Date())}.csv`)
        if (existsSync(file)) fail(`${file} exists; move it away first so no round is overwritten.`)
        writeFileSync(file, printCsv(round.named))
        const signs = round.named.reduce((n, r) => n + r.quantity, 0)
        console.log(`Wrote ${round.named.length} adoptions (${signs} signs) to ${file}.`)
    }
    if (round.unnamed.length > 0) {
        console.log(
            `${round.unnamed.length} donations without a name: ${round.unnamedSigns} more signs, no sticker (not in the CSV).`
        )
    }
    for (const r of rows) await act(r.id, 'printed')
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
        const signName = r.sign_name ?? fail(`${r.ref_code} has no name on the sign, so it gets no personal page.`)
        if (!r.consent_page_at) fail(`${r.ref_code} did not ask for a personal page.`)
        const entry = pageEntry(
            { ...r, sign_name: signName },
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
    'mobilepay-webhook': mobilePayWebhook,
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
                'Usage: npm run adoptions -- list | approve <id…> [--via mobilepay|tilisiirto|lasku] [--payer "<name>"] | reject <id> | approve-message <id> | reject-message <id> | revoke <id> | print | page add <id> | page remove <slug> | mobilepay-webhook <url>'
            ))
    )(args)
} catch (err) {
    exit(errorText(err))
}
