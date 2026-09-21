import type { KnipConfig } from 'knip'

const config: KnipConfig = {
    entry: [
        'scripts/generate-hero-treatments.mts',
        'scripts/upload-to-cf-images.mts',
        'scripts/lib/read-json-field.mjs',
        'scripts/gh-pr.mjs',
    ],
    ignoreBinaries: ['magick', 'scripts/mdx-validate.sh'],
    ignoreDependencies: ['@iconify-json/fa7-brands', '@iconify-json/fa7-solid'],
}

export default config
