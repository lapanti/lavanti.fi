import type { Pledge } from '../../content/pledges'

import { getAllByRole, getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../../tests/helpers'
import PledgeList from './PledgeList.astro'

const locale = (title: string, note?: string) => ({ note, summary: `${title} summary`, title })

const pledge = (id: string, overrides: Partial<Pledge> = {}): Pledge => ({
    id,
    kind: 'petition',
    locales: { en: locale(`${id} en`), fi: locale(`${id} fi`), sv: locale(`${id} sv`) },
    organizers: [
        { name: { en: 'Org A', fi: 'Järjestö A', sv: 'Org A sv' }, url: 'https://a.example/' },
        { name: { en: 'Org B', fi: 'Järjestö B', sv: 'Org B sv' }, url: 'https://b.example/' },
    ],
    signedDate: '2026-10-19',
    url: `https://${id}.example/`,
    ...overrides,
})

describe('<PledgeList />', () => {
    it('should render one item per pledge in the given order', async () => {
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'fi', pledges: [pledge('one'), pledge('two')] },
        })

        expect(getAllByRole(result, 'heading', { level: 3 }).map((h) => h.textContent)).toEqual(['one fi', 'two fi'])
    })

    it('should show kind and signing date in the reader’s format', async () => {
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'fi', pledges: [pledge('one', { kind: 'pledge' })] },
        })
        const time = result.querySelector('time')

        expect(result.querySelector('.pledge-meta')).toHaveTextContent('Sitoumus · allekirjoitettu 19.10.2026')
        expect(time?.getAttribute('datetime')).toBe('2026-10-19')
    })

    it('should link every organizer by its localized name', async () => {
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'sv', pledges: [pledge('one')] },
        })

        expect(getByRole(result, 'link', { name: 'Org A sv' }).getAttribute('href')).toBe('https://a.example/')
        expect(result.querySelector('.pledge-organizers span')).toHaveTextContent('Arrangörer:')
        expect([...result.querySelectorAll('.pledge-organizers li')].map((li) => li.textContent?.trim())).toEqual([
            'Org A sv',
            'Org B sv',
        ])
    })

    it('should keep whitespace out of the organizer links, so the CSS comma follows the name directly', async () => {
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'fi', pledges: [pledge('one')] },
        })

        expect([...result.querySelectorAll('.pledge-organizers a')].map((a) => a.textContent)).toEqual([
            'Järjestö A',
            'Järjestö B',
        ])
    })

    it('should give the source link an accessible name with the title', async () => {
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'en', pledges: [pledge('one')] },
        })
        const link = getByRole(result, 'link', { name: 'Read the petition: one en' })

        expect(link.getAttribute('href')).toBe('https://one.example/')
        expect(link).toHaveTextContent('Read the petition')
    })

    it('should render the note only when there is one', async () => {
        const withNote = pledge('one', {
            locales: { en: locale('a', 'Why'), fi: locale('a', 'Miksi'), sv: locale('a', 'Varför') },
        })
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'fi', pledges: [withNote, pledge('two')] },
        })
        const notes = result.querySelectorAll('.pledge-note')

        expect(notes).toHaveLength(1)
        expect(notes[0]).toHaveTextContent('Miksi')
    })

    it('should use the id as the item anchor', async () => {
        const result = await renderAstroComponent(PledgeList, {
            props: { lang: 'fi', pledges: [pledge('one')] },
        })

        expect(result.querySelector('li')?.getAttribute('id')).toBe('one')
    })
})
