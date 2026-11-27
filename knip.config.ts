import type { KnipConfig } from 'knip'

const config: KnipConfig = {
    entry: [
        // Cloudflare Pages Functions: wrangler bundles functions/ at deploy, nothing imports them.
        'functions/**/*.ts',
        // Browser modules loaded with <script src="./x.client.ts">, which knip does not follow.
        'src/components/**/*.client.ts',
        'scripts/generate-hero-treatments.mts',
        'scripts/upload-to-cf-images.mts',
        'scripts/lib/read-json-field.mjs',
        'scripts/gh-pr.mjs',
    ],
    ignoreBinaries: ['magick', 'scripts/mdx-validate.sh'],
    ignoreDependencies: ['@iconify-json/fa7-brands', '@iconify-json/fa7-solid'],
}

export default config
