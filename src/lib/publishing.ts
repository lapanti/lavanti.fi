/**
 * Publish-date helpers for scheduled publishing.
 *
 * Posts merged with a future publishDate are excluded from non-dev builds
 * until their date arrives in Europe/Helsinki (see loadAllPosts in posts.ts);
 * the nightly scheduled-publish workflow then triggers the deploy.
 *
 * Kept free of astro:content so both Vite-processed code (posts.ts) and
 * plain-Node check scripts (scripts/checks/publish-due.ts) can import it.
 */

export const helsinkiDateOf = (date: Date): string =>
    // en-CA formats as YYYY-MM-DD, matching the publishDate schema.
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki' }).format(date)

// Plain string comparison is correct: publishDate is regex-enforced YYYY-MM-DD.
export const isPublishedBy = (publishDate: string, today: string): boolean => publishDate <= today

/**
 * Newsletter archive embargo: an issue goes public this many days after it was
 * emailed (campaign ADR 2026-09-22). A multiple of 7 so the page lands on the
 * same weekday as the send.
 */
export const EMBARGO_DAYS = 42

/** The publishDate a newsletter issue must carry: `sent` plus the embargo, as YYYY-MM-DD. */
export const embargoLiftDate = (sent: string): string => {
    const [year, month, day] = sent.split('-').map(Number)
    // UTC arithmetic: the dates are calendar days, so no time zone can shift them.
    const lifted = new Date(Date.UTC(year, month - 1, day + EMBARGO_DAYS))

    return lifted.toISOString().slice(0, 10)
}
