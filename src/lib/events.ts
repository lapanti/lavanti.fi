/**
 * Visibility rules for the campaign event calendar.
 *
 * The build decides what is visible and the nightly scheduled-publish workflow
 * makes a build happen — the same split as publishing.ts + publish-due.ts, only
 * inverted: posts appear when their date arrives, events disappear once theirs
 * has passed.
 *
 * Kept free of astro:content and import.meta.env so both Vite-processed code and
 * plain-Node check scripts can import it; the dev-mode exception lives at the
 * Astro call site, like loadAllPosts in posts.ts.
 */

import type { CampaignEvent } from '../content/events'

/**
 * Plain string comparison is correct: both dates are YYYY-MM-DD.
 *
 * `>=`, not a negation of isPublishedBy — an event stays listed all through its
 * own day. Negating would drop it from the page on the morning it happens, which
 * is exactly when someone is looking up where to go.
 */
export const isUpcoming = (eventDate: string, today: string): boolean => eventDate >= today

export const filterUpcoming = (events: CampaignEvent[], today: string): CampaignEvent[] =>
    events.filter((event) => isUpcoming(event.date, today))

/**
 * Matches the Finnish locality, the one form every event carries regardless of the reader's language.
 * Exact match on the municipality: an event entered under a village name (Masala, Veikkola) is not matched.
 */
export const filterByLocality = (events: CampaignEvent[], localities: string[]): CampaignEvent[] =>
    events.filter((event) => localities.includes(event.locales.fi.locality))
