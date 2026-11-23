/**
 * Browser glue for AdoptionPayment.astro. Reads only the validated query (ref, n, y, u) and the
 * adopter's own sessionStorage entry; writes only textContent and the thanks link.
 */

import { parseThanksParams, readStoredAdoption, thanksHref } from '../../lib/adoptionClient'

export interface AdoptionPaymentData {
    almost: Record<number, string>
    continue: string
    donate: Record<number, string>
    payerSaved: string
    refNote: string
    thanksPath: string
    tooSoon: string
    unavailable: string
}

const initAdoptionPayment = (): void => {
    const root = document.querySelector<HTMLElement>('[data-payment]')
    const dataEl = document.getElementById('adoption-payment-data')
    if (!root || !dataEl) return
    const data = JSON.parse(dataEl.textContent ?? '{}') as AdoptionPaymentData
    const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!

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
        return
    }

    q('[data-almost]').textContent = data.almost[params.quantity]
    q('[data-donate]').textContent = data.donate[params.quantity]
    q('[data-ref-note]').textContent = data.refNote.replace('%s', () => params.ref)
    q<HTMLButtonElement>('[data-ref-copy]').dataset.copy = params.ref

    const stored = readStoredAdoption(() => window.sessionStorage)
    // Saving needs the edit token, which only the browser that sent the form holds.
    const token = stored && stored.ref === params.ref ? stored.token : ''
    if (!token) return
    const payerForm = q<HTMLFormElement>('[data-payer-form]')
    payerForm.hidden = false
    payerForm.addEventListener('submit', async (event) => {
        event.preventDefault()
        const value = (payerForm.elements.namedItem('payer_name') as HTMLInputElement).value
        let status = 0
        try {
            const res = await fetch('/api/adoptoi/viesti', {
                body: JSON.stringify({ payer_name: value, ref: params.ref, token }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            })
            status = res.status
        } catch {
            // Offline or blocked: reported below as unavailable.
        }
        q('[data-payer-form] [data-status]').textContent =
            status === 200 ? data.payerSaved : status === 429 ? data.tooSoon : data.unavailable
    })
}

// Loaded with <script src> from AdoptionPayment.astro.
initAdoptionPayment()
