import type { CampaignEvent } from '../content/events'

import { getAllByRole, getByRole, queryByText } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import EventCalendar from './EventCalendar.astro'

const events: CampaignEvent[] = [
    {
        date: '2026-09-19',
        endTime: '17:00',
        fbUrl: 'https://fb.me/e/example',
        id: 'confirmed',
        locales: {
            en: { description: 'English body.', locality: 'Espoo', title: 'Confirmed event', venue: 'Venue one' },
            fi: { description: 'Suomeksi.', locality: 'Espoo', title: 'Vahvistettu tapahtuma', venue: 'Paikka yksi' },
            sv: { description: 'På svenska.', locality: 'Esbo', title: 'Bekräftat evenemang', venue: 'Plats ett' },
        },
        postalCode: '02230',
        startTime: '15:00',
        streetAddress: 'Street 1',
        topicConfirmed: true,
    },
    {
        date: '2026-11-30',
        id: 'open',
        locales: {
            en: { description: 'English body.', locality: 'Kirkkonummi', title: 'Open event', venue: 'Venue two' },
            fi: { description: 'Suomeksi.', locality: 'Kirkkonummi', title: 'Avoin tapahtuma', venue: 'Paikka kaksi' },
            sv: { description: 'På svenska.', locality: 'Kyrkslätt', title: 'Öppet evenemang', venue: 'Plats två' },
        },
        postalCode: '02400',
        streetAddress: 'Street 2',
        topicConfirmed: false,
    },
]

const props = { events, eyebrow: 'Tapahtumat', heading: 'Kampanjan tapahtumat', lang: 'fi' } as const

describe('<EventCalendar />', () => {
    it('renders one list item per event', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })

        expect(getAllByRole(result, 'listitem')).toHaveLength(events.length)
    })

    it('renders the section heading as an h2 and each event title as an h3', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })

        expect(getByRole(result, 'heading', { level: 2 }).textContent).toContain('Kampanjan tapahtumat')
        expect(getAllByRole(result, 'heading', { level: 3 }).map((h) => h.textContent?.trim())).toEqual([
            'Vahvistettu tapahtuma',
            'Avoin tapahtuma',
        ])
    })

    it('exposes the machine-readable date on a time element', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })

        expect([...result.querySelectorAll('time')].map((t) => t.getAttribute('datetime'))).toEqual([
            '2026-09-19T15:00',
            '2026-11-30',
        ])
    })

    it('renders the localised date and clock time together', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })

        expect(result.querySelector('time')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'lauantaina 19. syyskuuta 2026 klo 15–17'
        )
    })

    it('renders the date alone when the event has no clock time', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })

        expect([...result.querySelectorAll('time')][1].textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'maanantaina 30. marraskuuta 2026'
        )
    })

    it('uses the Swedish locale strings when lang is sv', async () => {
        const result = await renderAstroComponent(EventCalendar, { props: { ...props, lang: 'sv' } })

        expect(getAllByRole(result, 'heading', { level: 3 })[0].textContent).toContain('Bekräftat evenemang')
        expect(result.querySelector('.event-place')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Plats ett, Esbo')
    })

    it('shows the pending-topic line only for events whose topic is open', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })
        const items = getAllByRole(result, 'listitem')

        expect(queryByText(items[0], 'Aihe vahvistetaan myöhemmin.')).toBeNull()
        expect(queryByText(items[1], 'Aihe vahvistetaan myöhemmin.')).not.toBeNull()
    })

    it('renders the pending-topic line in the page language', async () => {
        const result = await renderAstroComponent(EventCalendar, { props: { ...props, lang: 'en' } })

        expect(result.querySelector('.event-pending')?.textContent?.trim()).toBe('The topic will be confirmed later.')
    })

    it('marks every list item with its event id', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })

        expect(getAllByRole(result, 'listitem').map((li) => li.getAttribute('data-event-id'))).toEqual([
            'confirmed',
            'open',
        ])
    })

    it('links to the Facebook event only for events that have one', async () => {
        const result = await renderAstroComponent(EventCalendar, { props })
        const items = getAllByRole(result, 'listitem')
        const link = items[0].querySelector('.event-link a')

        expect(link?.getAttribute('href')).toBe('https://fb.me/e/example')
        expect(link?.textContent?.trim()).toBe('Tapahtuma Facebookissa')
        expect(link?.getAttribute('aria-label')).toBe('Tapahtuma Facebookissa: Vahvistettu tapahtuma')
        expect(items[1].querySelector('.event-link')).toBeNull()
    })

    it('renders the Facebook link label in the page language', async () => {
        const result = await renderAstroComponent(EventCalendar, { props: { ...props, lang: 'sv' } })

        expect(result.querySelector('.event-link a')?.textContent?.trim()).toBe('Evenemanget på Facebook')
    })

    it('renders nothing when there are no events left', async () => {
        const result = await renderAstroComponent(EventCalendar, { props: { ...props, events: [] } })

        expect(result.querySelector('section')).toBeNull()
    })
})
