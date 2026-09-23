import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

// A meta.json-only edit touches no .mdx file, so the '*/**/*.mdx' rule below
// wouldn't otherwise see it — resolve each changed meta.json to its sibling
// {lang}.mdx files and re-run the same validation against those instead.
const siblingMdxFiles = (metaFiles) =>
    metaFiles.flatMap((metaFile) => {
        const dir = dirname(metaFile)
        return ['fi.mdx', 'sv.mdx', 'en.mdx'].map((f) => join(dir, f)).filter((f) => existsSync(f))
    })

// src/content/related.json is generated from the posts and newsletters (Jev ranking);
// any staged add or edit there, or a staged related.json, must leave it in sync.
// Deleted directories are not passed by lint-staged — CI runs the same check.
const checkRelated = 'node --experimental-strip-types scripts/checks/related-stale.ts'

export default {
    '*/**/*.{js,jsx,ts,tsx,astro}': (files) => [
        `eslint ${files.map((f) => `"${f}"`).join(' ')}`,
        `vitest related --run ${files.map((f) => `"${f}"`).join(' ')}`,
    ],
    '*/**/*.mdx': (files) => [
        `scripts/mdx-validate.sh ${files.map((f) => `"${f}"`).join(' ')}`,
        `node scripts/check-overflow.mjs ${files.map((f) => `"${f}"`).join(' ')}`,
        'node --experimental-strip-types scripts/checks/redirects.mjs',
    ],
    // A changed post or newsletter must also carry a receipt that suggest:links ran on its final text.
    '**/content/{posts,newsletters}/**/*.mdx': (files) => [
        checkRelated,
        `node --experimental-strip-types scripts/checks/suggestions-stale.ts ${files.map((f) => `"${f}"`).join(' ')}`,
    ],
    '**/content/**/meta.json': (files) => {
        const mdxFiles = siblingMdxFiles(files)
        if (mdxFiles.length === 0) return checkRelated
        return [
            `scripts/mdx-validate.sh ${mdxFiles.map((f) => `"${f}"`).join(' ')}`,
            `node scripts/check-overflow.mjs ${mdxFiles.map((f) => `"${f}"`).join(' ')}`,
            'node --experimental-strip-types scripts/checks/redirects.mjs',
            checkRelated,
        ]
    },
    'src/content/related.json': () => checkRelated,
    // A new or edited tag file must also carry a receipt that suggest:tags --tag ran on its current content.
    '**/content/tags/*.ts': (files) => [
        `node scripts/check-overflow.mjs ${files.map((f) => `"${f}"`).join(' ')}`,
        'node --experimental-strip-types scripts/checks/redirects.mjs',
        `node --experimental-strip-types scripts/checks/suggestions-stale.ts ${files.map((f) => `"${f}"`).join(' ')}`,
    ],
    'src/lib/redirects.ts': () => 'node --experimental-strip-types scripts/checks/redirects.mjs',
}
