/**
 * Browser glue for AdoptionThanks.astro. Reads only the validated query (ref, n, y, u) and the
 * adopter's own sessionStorage entry; writes only textContent. Draws the 3:4 share PNG on a canvas
 * once the fonts are loaded. Pure helpers: src/lib/adoptionClient.ts, src/lib/adoptionShareImage.ts.
 */

import { isInAppBrowser, parseThanksParams, readStoredAdoption } from '../../lib/adoptionClient'
import { BODY_FONT, DISPLAY_FONT, drawShareImage, SHARE_SIZE } from '../../lib/adoptionShareImage'

export interface AdoptionThanksData {
    copied: string
    cta: string
    ghost: string
    headline: Record<number, string>
    imageAlt: Record<number, string>
    logo: string
    photo: string
    shareText: Record<number, string>
    sign: { firstName: string; lastName: string; payer: string; sticker: readonly string[]; tagline: string }
    /** Share copy for a donation without a name on the sign (`u=1`). */
    unnamed: { headline: string; imageAlt: string; text: string }
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

/** Copying a PNG needs the async clipboard with ClipboardItem (absent in older Firefox). */
const canCopyImage = (): boolean =>
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    (typeof ClipboardItem.supports !== 'function' || ClipboardItem.supports('image/png'))

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
    let name = stored && stored.ref === params.ref ? stored.name : ''
    const unnamed = params.unnamed === true
    const n = params.quantity
    const headline = unnamed ? data.unnamed.headline : data.headline[n]
    const shareText = unnamed ? data.unnamed.text : data.shareText[n]
    q('[data-share-text]').textContent = shareText

    /** Shows the copied label on `button` for a moment. */
    const confirm = (button: HTMLElement) => {
        const label = button.textContent
        button.textContent = data.copied
        window.setTimeout(() => (button.textContent = label), 2000)
    }

    const copyText = q<HTMLButtonElement>('[data-copy-text]')
    copyText.hidden = !navigator.clipboard
    copyText.addEventListener('click', () => {
        void navigator.clipboard.writeText(shareText).then(
            () => confirm(copyText),
            () => undefined
        )
    })

    if (isInAppBrowser(navigator.userAgent)) q('[data-in-app]').hidden = false

    let blob: Blob | null = null
    const objectUrls: string[] = []
    const draw = async (photo: LoadedImage | null, logo: LoadedImage | null) => {
        const canvas = document.createElement('canvas')
        canvas.width = SHARE_SIZE.width
        canvas.height = SHARE_SIZE.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        drawShareImage(ctx, {
            cta: data.cta,
            ghost: data.ghost,
            headline,
            logo,
            name: unnamed ? null : name,
            payer: data.sign.payer,
            photo,
            text: data.sign,
        })

        return toBlob(canvas)
    }

    let rendering: Promise<void> | undefined
    const renderShareImage = async (): Promise<void> => {
        await rendering
        rendering = (async () => {
            const sample = `${headline} ${data.cta} ${name} ${data.ghost} ${data.sign.lastName}`
            await Promise.all([
                document.fonts.load(`800 100px "${DISPLAY_FONT}"`, sample),
                document.fonts.load(`700 40px "${DISPLAY_FONT}"`, sample),
                document.fonts.load(`600 26px "${BODY_FONT}"`, `${data.sign.tagline} ${data.sign.sticker.join(' ')}`),
                document.fonts.load(`400 20px "${BODY_FONT}"`, data.sign.payer),
            ]).catch(() => undefined)
            const [photo, logo] = await Promise.all([loadImage(data.photo, true), loadImage(data.logo, false)])
            const drawn = (await draw(photo, logo)) ?? (await draw(null, logo))
            if (!drawn) return
            blob = drawn
            objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url))
            const url = URL.createObjectURL(drawn)
            objectUrls.push(url)
            const img = q<HTMLImageElement>('[data-share-image]')
            img.src = url
            img.alt = unnamed ? data.unnamed.imageAlt : data.imageAlt[n].replace('%s', () => name || data.ghost)
            const link = q<HTMLAnchorElement>('[data-download]')
            link.href = url
            link.hidden = false
            q('[data-copy-image]').hidden = !canCopyImage()
        })()
        await rendering
    }

    const copyImage = q<HTMLButtonElement>('[data-copy-image]')
    copyImage.addEventListener('click', () => {
        if (!blob) return
        // No await before write(): Safari drops the click's user activation across one.
        void navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(
            () => confirm(copyImage),
            () => undefined
        )
    })

    if (!(stored && stored.ref === params.ref) && !unnamed) {
        // No stored name (another browser, or the in-app browser was torn down): ask for it again.
        q('[data-missing-name]').hidden = false
        const input = q<HTMLInputElement>('#adoption-thanks-name')
        input.addEventListener('input', () => {
            name = input.value.normalize('NFC').replace(/\s+/g, ' ').trim()
            void renderShareImage()
        })
    }

    void renderShareImage()
}

// Loaded with <script src> from AdoptionThanks.astro.
initAdoptionThanks()
