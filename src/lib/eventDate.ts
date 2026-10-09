/**
 * Date and time formatting for the campaign event calendar.
 *
 * Deliberately separate from byline.ts's formatPublicationDate: an event date needs
 * the weekday, and it needs a fixed time zone. Kept free of astro:content so plain
 * Node can import it, like publishing.ts.
 */

import type { CampaignEvent } from '../content/events'
import type { Lang } from '../content/nav'

import { intlLocale } from '../content/nav'

/** Reads as part of the sentence in fi/sv; English states the clock times bare. */
const atLabel: Record<Lang, string> = { en: '', fi: 'klo ', sv: 'kl. ' }

/**
 * An event date as a reader-facing string, e.g. "lauantaina 19. syyskuuta 2026".
 *
 * The weekday is part of the format on purpose: a calendar entry answers "which day
 * do I keep free", not just "where on the timeline is this".
 *
 * `timeZone: 'UTC'` is load-bearing. `new Date('2026-09-19')` parses as UTC midnight,
 * so formatting it in the runtime's own zone renders the previous day anywhere west
 * of Greenwich. An event date is a calendar date, not an instant, so it is formatted
 * in the zone it was parsed in.
 */
export const formatEventDate = (date: string, lang: Lang): string =>
    new Intl.DateTimeFormat(intlLocale[lang], {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
        weekday: 'long',
        year: 'numeric',
    }).format(new Date(date))

/**
 * The clock times as "klo 15–17", or undefined while the schedule is still open —
 * the card then shows the date alone rather than a half-empty time range.
 *
 * Finnish and Swedish separate hours and minutes with a period and drop a whole
 * hour's ":00" ("klo 17.30–19"); English keeps the colon and the full HH:MM.
 */
export const formatEventTime = (event: CampaignEvent, lang: Lang): string | undefined => {
    if (!event.startTime) return undefined

    const trim = (time: string): string => (lang === 'en' ? time : time.replace(/:00$/, '').replace(':', '.'))
    const range = event.endTime ? `${trim(event.startTime)}–${trim(event.endTime)}` : trim(event.startTime)

    return `${atLabel[lang]}${range}`
}

/**
 * The value for a <time datetime> attribute: the calendar date, plus the local
 * start time when there is one, so the machine-readable value says everything the
 * visible text does. Offset-free on purpose — datetime carries local time, and the
 * zone belongs in the JSON-LD.
 */
export const eventDateTimeAttribute = (event: CampaignEvent): string =>
    event.startTime ? `${event.date}T${event.startTime}` : event.date

/**
 * An ISO 8601 instant for schema.org, e.g. "2026-09-19T15:00:00+03:00".
 *
 * The offset is derived from the zone rather than hardcoded, so it is +03:00 in
 * summer and +02:00 in winter without a table to maintain. A date with no time
 * returns the plain calendar date — schema.org accepts that for startDate, and
 * inventing a midnight would announce a time nobody agreed on.
 */
export const toHelsinkiIso = (date: string, time?: string): string => {
    if (!time) return date

    const offset = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', timeZoneName: 'longOffset' })
        /*
         * Noon UTC, not the event's own wall time: Helsinki switches at 01:00 UTC, so
         * midday is safely inside the offset that applies to the rest of the day.
         */
        .formatToParts(new Date(`${date}T12:00:00Z`))
        .find((part) => part.type === 'timeZoneName')
        ?.value.replace('GMT', '')

    return `${date}T${time}:00${offset || 'Z'}`
}
