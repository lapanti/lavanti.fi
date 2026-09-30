import type { AstroIntegration } from 'astro'

import { rename, rmdir } from 'node:fs/promises'

/** Locales whose 404 page lives under their own prefix; Finnish is the root 404.html. */
const LOCALISED_NOT_FOUND_LANGS = ['en', 'sv'] as const

/**
 * Astro gives only the root `/404` route its `404.html` file name. `src/pages/sv/404.astro`
 * builds to `sv/404/index.html`, which Cloudflare Pages never serves as a not-found page.
 * Pages serves the nearest `404.html` up the requested path, so moving each localised
 * page to `sv/404.html` / `en/404.html` makes a miss under /sv/ or /en/ answer in its
 * own language with a 404 status.
 */
export const notFoundPages = (): AstroIntegration => ({
    hooks: {
        'astro:build:done': async ({ dir, logger }) => {
            for (const lang of LOCALISED_NOT_FOUND_LANGS) {
                const from = new URL(`${lang}/404/index.html`, dir)
                await rename(from, new URL(`${lang}/404.html`, dir))
                await rmdir(new URL(`${lang}/404/`, dir))
            }
            logger.info(`moved ${LOCALISED_NOT_FOUND_LANGS.map((lang) => `${lang}/404.html`).join(', ')}`)
        },
    },
    name: 'not-found-pages',
})
