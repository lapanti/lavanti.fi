/**
 * Browser glue for SignAdoptionForm.astro: live sign preview, chips, the two steps on one page,
 * the fetch submit that keeps the edit token out of the URL, and the live line from `seina`.
 * Pure helpers live in src/lib/adoptionClient.ts (unit-tested); this file only wires the DOM.
 *
 * Without a script the form still works: both steps show, the package chip posts its sign
 * count, and the function answers with a 303 to the payment step.
 */

import type { Lang } from '../../content/nav'

import { joinNames, loadWall, setSignName, thanksHref, writeStoredAdoption } from '../../lib/adoptionClient'

export interface AdoptionFormData {
    consentPerson: string
    consentPersonCompany: string
    consentPrint: Record<number, string>
    counter: string
    cta: Record<number, string>
    errors: Record<string, string>
    lang: Lang
    liveCount: string
    liveNames: string
    nextStep: Record<number, string>
    nextStepCompany: Record<number, string>
    /** The payment step the form lands on (company or not). */
    payPath: string
    pinned: Record<number, string>
    pinnedUnnamed: Record<number, string>
    sending: string
    total: Record<number, string>
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
    const company = q<HTMLDetailsElement>('[data-company]')
    const submitButton = q<HTMLButtonElement>('button[type="submit"]')
    const submitHint = document.getElementById('adoption-submit-hint')!
    const counter = document.getElementById('adoption-name-counter')!

    const chosenChip = () => form.querySelector<HTMLInputElement>('input[name="quantity"]:checked')?.value ?? '1'
    const quantity = () => {
        const value = Number(chosenChip())

        // Only a package count has copy; anything else falls back to one sign.
        return Object.prototype.hasOwnProperty.call(data.cta, value) ? value : 1
    }
    const name = () => nameInput.value.normalize('NFC').replace(/\s+/g, ' ').trim()
    const isCompany = () => field('company_name').value.trim() !== ''
    const unnamedInput = field('unnamed')
    const unnamed = () => unnamedInput.checked
    /** The name and everything that only makes sense with it; CSS hides them when opted out. */
    const NAMED_ONLY = ['sign_name', 'consent_print', 'consent_person', 'public', 'page']
    const NAMED_REQUIRED = new Set(['sign_name', 'consent_print', 'consent_person'])

    const updateReady = () => {
        const ready = form.checkValidity()
        submitButton.setAttribute('aria-disabled', ready ? 'false' : 'true')
        submitHint.hidden = ready
    }

    const render = () => {
        const n = quantity()
        setSignName(document, nameInput.value)
        counter.textContent = data.counter.replace('%n', String([...nameInput.value].length))
        form.querySelectorAll('[data-cta]').forEach((b) => (b.textContent = data.cta[n]))
        q('[data-total]').textContent = data.total[n]
        q('[data-consent-print]').textContent = data.consentPrint[n]
        // Disabled fields are neither validated nor posted, so a box ticked before opting out stays out.
        for (const f of NAMED_ONLY) {
            field(f).disabled = unnamed()
            field(f).required = !unnamed() && NAMED_REQUIRED.has(f)
        }
        // A replacer function, so "$&" and friends in a typed name stay literal.
        q('[data-pinned]').textContent = unnamed() ? data.pinnedUnnamed[n] : data.pinned[n].replace('%s', () => name())
        q('[data-consent-person]').textContent = company.open ? data.consentPersonCompany : data.consentPerson
        q('[data-next-step]').textContent = (isCompany() ? data.nextStepCompany : data.nextStep)[n]
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
        const target = form.elements.namedItem(code)
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
        render()
        showStep(2)
        q<HTMLElement>('[data-step="2"] h2').focus()
    })
    q('[data-back]').addEventListener('click', () => {
        showStep(1)
        ;(unnamed() ? unnamedInput : nameInput).focus()
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
        try {
            const res = await fetch(form.action, { body, headers: { Accept: 'application/json' }, method: 'POST' })
            const result = (await res.json()) as { error?: string; ref?: string; token?: string }
            if (!res.ok || !result.ref) throw new Error(result.error ?? 'lomake')
            writeStoredAdoption(() => window.sessionStorage, {
                name: unnamed() ? '' : name(),
                quantity: n,
                ref: result.ref,
                token: result.token ?? '',
            })
            window.location.assign(
                thanksHref(data.payPath, { company: isCompany(), quantity: n, ref: result.ref, unnamed: unnamed() })
            )
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
