/**
 * Browser glue for AdoptionPayment.astro. Reads only the validated query (ref, n, y, u, mp) and the
 * adopter's own sessionStorage entry; writes only textContent and the thanks link.
 */

import {
    parseThanksParams,
    pollPayment,
    readStoredAdoption,
    thanksHref,
    type ThanksParams,
} from '../../lib/adoptionClient'

export interface AdoptionPaymentData {
    almost: Record<number, string>
    continue: string
    donate: Record<number, string>
    message: { saved: string; unavailable: string }
    online: { checking: string; donate: Record<number, string>; failed: string; slow: string; unavailable: string }
    payerSaved: string
    refNote: string
    thanksPath: string
    tooSoon: string
    unavailable: string
}

type Query = <T extends Element = HTMLElement>(selector: string) => T

/**
 * MobilePay online, when the server has it switched on: a button that opens MobilePay with the
 * amount filled in, and the check when MobilePay sends the donor back with `mp=1`. Returns true
 * when the page is in online mode, so the payer-name field is left out.
 */
const initOnline = async (q: Query, data: AdoptionPaymentData, params: ThanksParams, token: string) => {
    const status = q('[data-online-status]')
    const say = (text: string) => {
        status.textContent = text
        status.hidden = false
    }

    if (params.returned) {
        say(data.online.checking)
        const state = await pollPayment(params.ref)
        if (state === 'paid') {
            window.location.replace(thanksHref(data.thanksPath, params))
            return true
        }
        if (state === 'pending') {
            // Probably approved and still on its way: the number would invite a second donation.
            say(data.online.slow)
            q('[data-manual]').hidden = true
            return true
        }
        say(data.online.failed)
    }

    // Starting a payment needs the edit token, which only the tab that sent the form holds.
    if (!token) return false
    let enabled = false
    try {
        const res = await fetch('/api/adoptoi/maksu')
        enabled = res.ok && ((await res.json()) as { enabled?: unknown }).enabled === true
    } catch {
        // Offline or blocked: the number stays.
    }
    if (!enabled) return false

    const online = q('[data-online]')
    const button = q<HTMLButtonElement>('[data-online-donate]')
    q('[data-manual]').hidden = true
    online.hidden = false
    button.textContent = data.online.donate[params.quantity]
    button.addEventListener('click', async () => {
        button.disabled = true
        let url: unknown
        try {
            const res = await fetch('/api/adoptoi/maksu', {
                body: JSON.stringify({ ref: params.ref, token }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            })
            if (res.ok) url = ((await res.json()) as { redirectUrl?: unknown }).redirectUrl
        } catch {
            // Reported below as unavailable.
        }
        if (typeof url === 'string' && url.startsWith('https://')) {
            window.location.assign(url)
            return
        }
        // MobilePay doesn't answer: back to the number.
        say(data.online.unavailable)
        online.hidden = true
        q('[data-manual]').hidden = false
    })

    return true
}

const initAdoptionPayment = async (): Promise<void> => {
    const root = document.querySelector<HTMLElement>('[data-payment]')
    const dataEl = document.getElementById('adoption-payment-data')
    if (!root || !dataEl) return
    const data = JSON.parse(dataEl.textContent ?? '{}') as AdoptionPaymentData
    const q: Query = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!

    const params = parseThanksParams(window.location.search)
    if (!params) {
        q('[data-invalid]').hidden = false
        return
    }
    q('[data-valid]').hidden = false

    const donated = q<HTMLAnchorElement>('[data-donated]')
    donated.href = thanksHref(data.thanksPath, params)
    if (params.company) {
        // A company pays later by invoice: no MobilePay block, just the note and a way on.
        q('[data-private]').hidden = true
        q('[data-company]').hidden = false
        donated.textContent = data.continue
    } else {
        q('[data-almost]').textContent = data.almost[params.quantity]
        q('[data-donate]').textContent = data.donate[params.quantity]
        q('[data-ref-note]').textContent = data.refNote.replace('%s', () => params.ref)
        q<HTMLButtonElement>('[data-ref-copy]').dataset.copy = params.ref
    }

    const stored = readStoredAdoption(() => window.sessionStorage)
    // Saving needs the edit token, which only the browser that sent the form holds.
    const token = stored && stored.ref === params.ref ? stored.token : ''
    const online = params.company ? false : await initOnline(q, data, params, token)
    if (!token) return

    /** Wires a form that posts one field to `viesti` and reports the result in its status line. */
    const wire = (selector: string, field: 'message' | 'payer_name', saved: string, unavailable: string) => {
        const form = q<HTMLFormElement>(selector)
        form.hidden = false
        form.addEventListener('submit', async (event) => {
            event.preventDefault()
            const value = (form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement).value
            let status = 0
            try {
                const res = await fetch('/api/adoptoi/viesti', {
                    body: JSON.stringify({ [field]: value, ref: params.ref, token }),
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                })
                status = res.status
            } catch {
                // Offline or blocked: reported below as unavailable.
            }
            q(`${selector} [data-status]`).textContent =
                status === 200 ? saved : status === 429 ? data.tooSoon : unavailable
        })
    }
    // MobilePay shares the payer's name with an online payment, so the field is only for the number.
    if (!params.company && !online) wire('[data-payer-form]', 'payer_name', data.payerSaved, data.unavailable)
    // The message shows on the wall next to the name, so a donation without one has none.
    if (!params.unnamed) wire('[data-message-form]', 'message', data.message.saved, data.message.unavailable)
}

// Loaded with <script src> from AdoptionPayment.astro.
void initAdoptionPayment()
