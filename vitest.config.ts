/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config' // eslint-disable-line import-x/no-unresolved
import path from 'path'
import { configDefaults, coverageConfigDefaults } from 'vitest/config'

export default getViteConfig(
    {
        plugins: [
            {
                name: 'stub-virtual-image-service',
                enforce: 'pre' as const,
                resolveId(id) {
                    if (id === 'virtual:image-service') return id
                },
                load(id) {
                    if (id === 'virtual:image-service') {
                        return `export default { transform(options) { return options; }, getURL(options) { const s = options.src; return typeof s === 'string' ? s : (s && s.src) ? s.src : String(s); }, parseURL(url) { return { src: url }; }, validateOptions(options) { return options; }, getSrcSet() { return []; }, getHTMLAttributes(options) { const { src, width, height, format, quality, densities, widths, formats, layout, priority, fit, position, background, ...rest } = options; return { ...rest, width, height, loading: rest.loading ?? 'lazy', decoding: rest.decoding ?? 'async' }; } }`
                    }
                },
            },
        ],
        test: {
            coverage: {
                // Merge with the defaults (Vitest replaces, not merges) so *.spec.ts stay excluded.
                exclude: [...coverageConfigDefaults.exclude, 'src/lib/og/assets/**'],
                include: ['src/lib/**'],
                thresholds: {
                    functions: 80,
                    lines: 80,
                },
            },
            environment: 'node',
            // .claude/worktrees holds agent checkouts of the whole repo; collecting them
            // doubles the suite and runs another branch's tests.
            exclude: [...configDefaults.exclude, 'tests/e2e/**', '.claude/**'],
            resolveSnapshotPath: (testPath, snapshotExtension) => {
                const finalTestPath = testPath.replace('src', `tests${path.sep}__snapshots__`)

                return `${finalTestPath}${snapshotExtension}`
            },
            setupFiles: ['./tests/setup.ts'],
        },
    },
    {
        devToolbar: {
            enabled: false,
        },
    }
)
