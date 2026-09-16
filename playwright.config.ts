import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
/*
 * import dotenv from 'dotenv';
 * import path from 'path';
 * dotenv.config({ path: path.resolve(__dirname, '.env') });
 */

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    /* Maximum time one test can run for. */
    // timeout: 60_000,
    expect: {
        /**
         * Maximum time expect() should wait for the condition to be met.
         * For example in `await expect(locator).toHaveText();`
         */
        timeout: 10_000,
        /**
         * Goldens are CI-canonical (issue #1393): regenerate via the
         * "Update screenshots" workflow_dispatch, which runs update mode in the
         * exact gate environment. Local --update-snapshots is for iteration only
         * and may sit a pixel off CI rendering. Same-env noise is near zero, so
         * the gate is tight: 1% differing pixels, 0.2 per-pixel color threshold
         * for antialiasing. The previous 25% ratio silently absorbed a missing
         * page section (about-page Signal Band) and whole-component restyles.
         */
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,
            threshold: 0.2,
        },
        /**
         * Default aria-snapshot path has no {projectName} segment, so Mobile Chrome
         * and Google Chrome share one baseline file. Some elements genuinely reflow
         * differently at mobile viewport widths, so a shared file can't satisfy both
         * projects. Give aria snapshots their own file per project, same as screenshots.
         */
        toMatchAriaSnapshot: {
            pathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',
        },
    },
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Configure projects for major browsers */
    projects: [
        /*
         *{
         *  name: 'chromium',
         *  use: { ...devices['Desktop Chrome'] },
         *},
         *
         *{
         *  name: 'firefox',
         *  use: { ...devices['Desktop Firefox'] },
         *},
         *
         *{
         *  name: 'webkit',
         *  use: { ...devices['Desktop Safari'] },
         *},
         */

        /* Test against mobile viewports. */
        {
            name: 'Mobile Chrome',
            use: { ...devices['Galaxy S24'] },
        },
        /*
         *{
         *  name: 'Mobile Safari',
         *  use: { ...devices['iPhone 12'] },
         *},
         */

        /* Test against branded browsers. */
        /*
         *{
         *    name: 'Microsoft Edge',
         *    use: { ...devices['Desktop Edge'], channel: 'msedge' },
         *},
         */
        {
            name: 'Google Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        },
    ],
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    testDir: './tests/e2e',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('')`. */
        baseURL: process.env.E2E_URL || 'http://localhost:4321',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 4 : undefined,

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run build && npm run preview',
        reuseExistingServer: !process.env.CI,
        /*
         * `npm run build` takes ~70s, over Playwright's 60s default. On a cold
         * run the wait expired mid-build, which left `dist` half-written — so
         * the next run could not reuse the preview server either (the partial
         * `dist` served 404s) and rebuilt into the same timeout. 3 minutes
         * clears the build with margin on slower CI runners.
         */
        timeout: 180_000,
        url: 'http://localhost:4321',
    },
})
