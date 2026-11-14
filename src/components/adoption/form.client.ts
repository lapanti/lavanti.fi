/**
 * Browser glue for SignAdoptionForm.astro: live sign preview, chips, the two steps on one page,
 * the fetch submit that keeps the edit token out of the URL, and the live line from `seina`.
 * Pure helpers live in src/lib/adoptionClient.ts (unit-tested); this file only wires the DOM.
 *
 * Without a script the form still works: both steps show, the other-number chip posts
 * quantity_other, and the function answers with a 303 to the thanks page.
 */

import type { Lang } from '../../content/nav'

import { joinNames, loadWall, setSignName, thanksHref, writeStoredAdoption } from '../../lib/adoptionClient'

export interface AdoptionFormData {
    consentPerson: string
    consentPersonCompany: string
    consentPrint: string[]
    counter: string
    cta: string[]
    errors: Record<string, string>
    lang: Lang
    liveCount: string
    liveNames: string
    pinned: string[]
    sending: string
    thanksPath: string
    total: string[]
}

declare global {
    interface Window {
        turnstile?: { reset: () => void }
    }
}

const STEP1_FIELDS = ['sign_name', 'quantity']

const initAdoptionForm = (): void => {
    const form = document.getElementById('lomake') as HTMLFormElement | null
    const dataEl = document.getElementById('adoption-form-data')
    if (!form || !dataEl) return
    const data = JSON.parse(dataEl.textContent ?? '{}') as AdoptionFormData
    const q = <T extends Element>(selector: string) => form.querySelector<T>(selector)!
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement
    const errorBox = q<HTMLElement>('#adoption-error')
    const step1 = q<HTMLElement>('[data-step="1"]')
    const step2 = q<HTMLElement>('[data-step="2"]')
    const nameInput = field('sign_name')
    const otherInput = field('quantity_other')
    const company = q<HTMLDetailsElement>('[data-company]')
    const submitButton = q<HTMLButtonElement>('button[type="submit"]')
    const submitHint = document.getElementById('adoption-submit-hint')!
    const counter = document.getElementById('adoption-name-counter')!

    const chosenChip = () => form.querySelector<HTMLInputElement>('input[name="quantity"]:checked')?.value ?? '1'
    const quantity = () => {
        const value = Number(chosenChip() === 'muu' ? otherInput.value : chosenChip())

        return Number.isInteger(value) && value >= 1 && value <= data.cta.length ? value : 1
    }
    const name = () => nameInput.value.normalize('NFC').replace(/\s+/g, ' ').trim()
    const isCompany = () => field('company_name').value.trim() !== ''

    const updateReady = () => {
        const ready = form.checkValidity()
        submitButton.setAttribute('aria-disabled', ready ? 'false' : 'true')
        submitHint.hidden = ready
    }

    const render = () => {
        const n = quantity()
        setSignName(document, nameInput.value)
        counter.textContent = data.counter.replace('%n', String([...nameInput.value].length))
        q<HTMLElement>('[data-other]').hidden = chosenChip() !== 'muu'
        form.querySelectorAll('[data-cta]').forEach((b) => (b.textContent = data.cta[n - 1]))
        q('[data-total]').textContent = data.total[n - 1]
        q('[data-consent-print]').textContent = data.consentPrint[n - 1]
        // A replacer function, so "$&" and friends in a typed name stay literal.
        q('[data-pinned]').textContent = data.pinned[n - 1].replace('%s', () => name())
        q('[data-consent-person]').textContent = company.open ? data.consentPersonCompany : data.consentPerson
        // The company fields are required only once a company name is given.
        for (const f of ['business_id', 'billing_address', 'consent_company']) field(f).required = isCompany()
        updateReady()
    }

    const showStep = (step: 1 | 2) => {
        step1.hidden = step !== 1
        step2.hidden = step !== 2
    }

    const showError = (code: string) => {
        errorBox.textContent = data.errors[code] ?? data.errors.lomake
        errorBox.hidden = false
        if (STEP1_FIELDS.includes(code)) showStep(1)
        const target = form.elements.namedItem(code === 'quantity' ? 'quantity_other' : code)
        if (target instanceof HTMLElement) {
            target.setAttribute('aria-invalid', 'true')
            target.setAttribute('aria-describedby', 'adoption-error')
        }
        errorBox.scrollIntoView({ block: 'center' })
        ;(target instanceof HTMLElement ? target : errorBox).focus({ preventScroll: true })
    }

    form.addEventListener('input', render)
    form.addEventListener('change', (event) => {
        const target = event.target
        if (target instanceof HTMLElement && target.getAttribute('aria-invalid') === 'true') {
            target.removeAttribute('aria-invalid')
        }
        render()
    })
    company.addEventListener('toggle', render)

    q('[data-next]').addEventListener('click', () => {
        if (!nameInput.reportValidity()) return
        if (chosenChip() === 'muu' && !otherInput.reportValidity()) return
        render()
        showStep(2)
        q<HTMLElement>('[data-step="2"] h2').focus()
    })
    q('[data-back]').addEventListener('click', () => {
        showStep(1)
        nameInput.focus()
    })

    let sending = false
    form.addEventListener('submit', async (event) => {
        event.preventDefault()
        if (sending || !form.reportValidity()) return
        sending = true
        submitButton.setAttribute('aria-disabled', 'true')
        submitButton.textContent = data.sending
        const n = quantity()
        const body = new FormData(form)
        body.set('quantity', String(n))
        body.delete('quantity_other')
        try {
            const res = await fetch(form.action, { body, headers: { Accept: 'application/json' }, method: 'POST' })
            const result = (await res.json()) as { error?: string; ref?: string; token?: string }
            if (!res.ok || !result.ref) throw new Error(result.error ?? 'lomake')
            writeStoredAdoption(() => window.sessionStorage, {
                name: name(),
                quantity: n,
                ref: result.ref,
                token: result.token ?? '',
            })
            window.location.assign(thanksHref(data.thanksPath, { company: isCompany(), quantity: n, ref: result.ref }))
        } catch (err) {
            sending = false
            render()
            // A Turnstile token verifies once; get a fresh one for the next try.
            window.turnstile?.reset()
            const code = err instanceof Error ? err.message : ''
            showError(Object.prototype.hasOwnProperty.call(data.errors, code) ? code : 'lomake')
        }
    })

    showStep(1)
    render()
    window.addEventListener('pageshow', render)
    // A plain post that failed comes back with ?virhe=<code>; show it like a script error.
    const code = new URLSearchParams(window.location.search).get('virhe')
    if (code && Object.prototype.hasOwnProperty.call(data.errors, code)) showError(code)

    void loadWall().then((wall) => {
        const live = q<HTMLElement>('[data-live]')
        const lines: string[] = []
        if (wall.signs !== null && wall.signs >= 3) lines.push(data.liveCount.replace('%n', String(wall.signs)))
        if (wall.names.length >= 3) {
            lines.push(data.liveNames.replace('%s', () => joinNames(wall.names.slice(0, 3), data.lang)))
        }
        live.textContent = lines.join(' ')
        live.hidden = lines.length === 0
    })
}

// Loaded with <script src> from SignAdoptionForm.astro, so Astro bundles it once per page.
initAdoptionForm()
