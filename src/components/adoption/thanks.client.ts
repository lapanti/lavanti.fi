/**
 * Browser glue for AdoptionThanks.astro. Reads only the validated query (ref, n, y) and the
 * adopter's own sessionStorage entry; writes only textContent. Draws the share PNGs on a canvas
 * once the fonts are loaded. Pure helpers: src/lib/adoptionClient.ts, src/lib/adoptionShareImage.ts.
 */

import {
    isInAppBrowser,
    parseThanksParams,
    readStoredAdoption,
    setSignName,
    shareUrl,
    type StoredAdoption,
} from '../../lib/adoptionClient'
import { BODY_FONT, DISPLAY_FONT, drawShareImage, SHARE_SIZES, type ShareFormat } from '../../lib/adoptionShareImage'

export interface AdoptionThanksData {
    almost: string[]
    cta: string
    donate: string[]
    formPath: string
    ghost: string
    headline: string
    imageAlt: string
    logo: string
    message: { saved: string; tooSoon: string; unavailable: string }
    payerSaved: string
    refNote: string
    shareText: string
    sign: { firstName: string; lastName: string; payer: string; tagline: string }
}

type LoadedImage = HTMLImageElement & { height: number; width: number }

/** An image, or null when it fails (a cross-origin photo without CORS must not break the PNG). */
const loadImage = (src: string, crossOrigin: boolean): Promise<LoadedImage | null> =>
    new Promise((resolve) => {
        const img = new Image()
        if (crossOrigin) img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = src
    })

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
    new Promise((resolve) => {
        try {
            canvas.toBlob(resolve, 'image/png')
        } catch {
            // A tainted canvas (photo served without CORS) throws; the caller redraws without it.
            resolve(null)
        }
    })

const initAdoptionThanks = (): void => {
    const root = document.querySelector<HTMLElement>('[data-thanks]')
    const dataEl = document.getElementById('adoption-thanks-data')
    if (!root || !dataEl) return
    const data = JSON.parse(dataEl.textContent ?? '{}') as AdoptionThanksData
    const q = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!

    const params = parseThanksParams(window.location.search)
    if (!params) {
        q('[data-invalid]').hidden = false
        return
    }
    q('[data-valid]').hidden = false

    const stored = readStoredAdoption(() => window.sessionStorage)
    // Only this visit's own entry counts: a stale one from an earlier adoption is ignored.
    const own: null | StoredAdoption = stored && stored.ref === params.ref ? stored : null
    let name = own?.name ?? ''
    setSignName(document, name)

    q('[data-almost]').textContent = data.almost[params.quantity - 1]
    q('[data-donate]').textContent = data.donate[params.quantity - 1]
    q('[data-ref-note]').textContent = data.refNote.replace('%s', () => params.ref)
    q<HTMLButtonElement>('[data-ref-copy]').dataset.copy = params.ref

    const post = async (body: Record<string, string>): Promise<number> => {
        try {
            const res = await fetch('/api/adoptoi/viesti', {
                body: JSON.stringify({ ...body, ref: params.ref, token: own?.token ?? '' }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            })

            return res.status
        } catch {
            return 0
        }
    }
    const statusText = (status: number, saved: string) =>
        status === 200 ? saved : status === 429 ? data.message.tooSoon : data.message.unavailable

    // Saving needs the edit token, which only the browser that sent the form holds.
    if (own?.token) {
        const payerForm = q<HTMLFormElement>('[data-payer-form]')
        if (!params.company) payerForm.hidden = false
        payerForm.addEventListener('submit', async (event) => {
            event.preventDefault()
            const value = (payerForm.elements.namedItem('payer_name') as HTMLInputElement).value
            q('[data-payer-form] [data-status]').textContent = statusText(
                await post({ payer_name: value }),
                data.payerSaved
            )
        })
        const messageForm = q<HTMLFormElement>('[data-message-form]')
        messageForm.hidden = false
        messageForm.addEventListener('submit', async (event) => {
            event.preventDefault()
            const value = (messageForm.elements.namedItem('message') as HTMLTextAreaElement).value
            q('[data-message-form] [data-status]').textContent = statusText(
                await post({ message: value }),
                data.message.saved
            )
        })
    }

    if (isInAppBrowser(navigator.userAgent)) q('[data-in-app]').hidden = false

    let files: File[] = []
    const objectUrls: string[] = []
    const draw = async (format: ShareFormat, photo: LoadedImage | null, logo: LoadedImage | null) => {
        const canvas = document.createElement('canvas')
        canvas.width = SHARE_SIZES[format].width
        canvas.height = SHARE_SIZES[format].height
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        drawShareImage(ctx, format, {
            cta: data.cta,
            ghost: data.ghost,
            headline: data.headline,
            logo,
            name,
            payer: data.sign.payer,
            photo,
            text: data.sign,
        })

        return toBlob(canvas)
    }

    let rendering: Promise<void> | undefined
    const renderShareImages = async (): Promise<void> => {
        await rendering
        rendering = (async () => {
            const sample = `${data.headline} ${data.cta} ${name} ${data.ghost} ${data.sign.lastName}`
            await Promise.all([
                document.fonts.load(`800 100px "${DISPLAY_FONT}"`, sample),
                document.fonts.load(`700 46px "${DISPLAY_FONT}"`, sample),
                document.fonts.load(`600 26px "${BODY_FONT}"`, data.sign.tagline),
                document.fonts.load(`400 17px "${BODY_FONT}"`, data.sign.payer),
            ]).catch(() => undefined)
            const photoSrc = document.querySelector<HTMLElement>('[data-sign]')?.dataset.photo ?? ''
            const [photo, logo] = await Promise.all([loadImage(photoSrc, true), loadImage(data.logo, false)])
            objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url))
            files = []
            for (const format of ['story', 'feed'] as const) {
                const blob = (await draw(format, photo, logo)) ?? (await draw(format, null, logo))
                if (!blob) continue
                const url = URL.createObjectURL(blob)
                objectUrls.push(url)
                const img = q<HTMLImageElement>(`[data-share-image="${format}"]`)
                img.src = url
                img.alt = data.imageAlt.replace('%s', () => name || data.ghost)
                files.push(new File([blob], `adoptoi-kyltti-${format}.png`, { type: 'image/png' }))
                if (format === 'story') {
                    const link = q<HTMLAnchorElement>('[data-download]')
                    link.href = url
                    link.hidden = false
                }
            }
            const shareButton = q<HTMLButtonElement>('[data-share]')
            shareButton.hidden = !(files.length > 0 && navigator.canShare?.({ files: [files[0]] }))
        })()
        await rendering
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl(window.location.origin, data.formPath, 'story'))
            q('[data-clipboard]').hidden = false
        } catch {
            // Clipboard access can be refused; sharing still works without the link sticker hint.
        }
    }
    q('[data-share]').addEventListener('click', async () => {
        await copyLink()
        try {
            await navigator.share({ files: files.slice(0, 1), text: data.shareText })
        } catch {
            // The visitor closed the share sheet.
        }
    })
    q('[data-download]').addEventListener('click', () => void copyLink())

    if (!own) {
        // No stored name (another browser, or the in-app browser was torn down): ask for it again.
        q('[data-missing-name]').hidden = false
        const input = q<HTMLInputElement>('#adoption-thanks-name')
        input.addEventListener('input', () => {
            name = input.value.normalize('NFC').replace(/\s+/g, ' ').trim()
            setSignName(document, input.value)
            if (!q('[data-after]').hidden) void renderShareImages()
        })
    }

    const showAfter = () => {
        q('[data-after]').hidden = false
        q('.thank-you').focus()
        void renderShareImages()
    }
    if (params.company) {
        // A company pays later by invoice: no MobilePay, no "I donated", straight to the thanks.
        q('[data-private]').hidden = true
        q('[data-company]').hidden = false
        showAfter()
    } else {
        q('[data-donated]').addEventListener('click', showAfter)
    }
}

// Loaded with <script src> from AdoptionThanks.astro.
initAdoptionThanks()
