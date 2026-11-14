/**
 * `<button data-copy="text" data-copied="Kopioitu">` copies its text to the clipboard and shows
 * the confirmation for a moment. Buttons that get data-copy later (the thanks page sets the ref
 * at runtime) are covered because the handler is delegated. Loaded with <script src> from
 * MobilePayBox.astro; Astro bundles it once per page.
 */

document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-copy]') : null
    if (!button || !navigator.clipboard) return
    const label = button.textContent
    void navigator.clipboard.writeText(button.dataset.copy ?? '').then(() => {
        button.textContent = button.dataset.copied ?? label
        window.setTimeout(() => (button.textContent = label), 2000)
    })
})

export {}
