import type { Lang } from './nav'

// The attribute is for the e2e page objects and scripts/checks/events-due.ts, which Node loads through its own ESM loader.
import data from './events.json' with { type: 'json' }

interface CampaignEventLocale {
    /** One or two factual sentences — the card body. */
    description: string
    /** Municipality in this language; also the schema.org addressLocality. */
    locality: string
    /** The card heading, and the schema.org `name` once the topic is confirmed. */
    title: string
    /** Venue as written for readers in this language; also the schema.org Place name. */
    venue: string
}

export interface CampaignEvent {
    /** Calendar date in Europe/Helsinki, YYYY-MM-DD — sorted and compared as a plain string. */
    date: string
    /** 'HH:MM', omitted together with startTime while the schedule is open. */
    endTime?: string
    /**
     * The event's Facebook page, where people RSVP and get reminders. Optional: the
     * card stays complete without it. Rendered as a link on the card and as the
     * Event JSON-LD `sameAs`.
     */
    fbUrl?: string
    /** Stable key for the rendered list, and the marker the nightly expiry check greps for. */
    id: string
    locales: Record<Lang, CampaignEventLocale>
    postalCode: string
    /** 'HH:MM' local time. Omitted until the time is agreed; the card then shows the date alone. */
    startTime?: string
    /**
     * Finnish street name in every locale: it is the form Posti routes on, and it
     * appears only in structured data, never on the page. Move into the locale object
     * if the Swedish street forms are ever wanted in the sv JSON-LD.
     */
    streetAddress: string
    /**
     * False while the subject of the event is still open: the card shows a
     * topic-pending line, and Head leaves the event out of the Event JSON-LD —
     * structured data should not announce a programme that does not exist yet.
     */
    topicConfirmed: boolean
}

/**
 * Campaign events, soonest first — the order they render in.
 *
 * The entries live in `events.json` (ADR: .agents/adrs/2026-11-27-content-data-json-or-ts.md),
 * which an external sync regenerates whole; edit by hand only when that sync is not in use.
 *
 * Events whose date has passed are dropped at build time (see filterUpcoming in
 * src/lib/events.ts), and the nightly scheduled-publish workflow redeploys the site
 * so the removal actually reaches production.
 */
export const campaignEvents: CampaignEvent[] = data
