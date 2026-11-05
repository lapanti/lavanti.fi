import { getByRole, queryAllByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import Byline from './Byline.astro'

describe('<Byline />', () => {
    describe('co-author list', () => {
        it('renders nothing for a single author', async () => {
            const result = await renderAstroComponent(Byline, {
                props: { authors: ['lauri'], lang: 'fi' },
            })

            expect(result.querySelector('p')).toBeNull()
        })

        it('lists every co-author but Lauri, one per item, in meta.json order', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: [{ name: 'Johanna Fleming' }, 'lauri', { name: 'Paula Oittinen' }],
                    lang: 'fi',
                },
            })

            const names = queryAllByRole(result, 'listitem').map((li) => li.querySelector('.name')?.textContent)
            expect(names).toEqual(['Johanna Fleming', 'Paula Oittinen'])
            expect(result.textContent).not.toContain('Lauri Lavanti')
        })

        it('prints the role below the name, and nothing for a role-less co-author', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri', { name: 'Atte Harjanne', role: 'kansanedustaja' }, { name: 'Ronja Karkinen' }],
                    lang: 'fi',
                },
            })

            const [atte, ronja] = queryAllByRole(result, 'listitem')
            expect(atte.querySelector('.role')?.textContent).toBe('kansanedustaja')
            expect(ronja.querySelector('.role')).toBeNull()
        })

        it.each([
            ['fi', 'Kanssakirjoittajat'],
            ['sv', 'Medförfattare'],
            ['en', 'Co-authors'],
        ] as const)('names the list in %s', async (lang, heading) => {
            const result = await renderAstroComponent(Byline, {
                props: { authors: ['lauri', { name: 'A' }, { name: 'B' }], lang },
            })

            expect(getByRole(result, 'complementary', { name: heading })).toBeTruthy()
        })

        it('uses the singular heading for one co-author', async () => {
            const result = await renderAstroComponent(Byline, {
                props: { authors: ['lauri', { name: 'Pinja Pekkarniemi' }], lang: 'fi' },
            })

            expect(getByRole(result, 'complementary', { name: 'Kanssakirjoittaja' })).toBeTruthy()
        })
    })

    describe('externalPublications byline', () => {
        it('renders publication name and date', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('em')?.textContent).toContain('Kauppalehti')
            expect(result.querySelector('em')?.textContent).toContain('15. maaliskuuta 2025')
        })

        it('wraps external publications in an elsewhere note', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('.elsewhere-note > p')?.textContent).toContain('Kauppalehti')
        })

        it('renders Finnish prefix', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('em')?.textContent).toContain('Julkaistu myös')
        })

        it('renders English prefix', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'en',
                },
            })

            expect(result.querySelector('em')?.textContent).toContain('Also published in')
        })

        it('renders Swedish prefix', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'sv',
                },
            })

            expect(result.querySelector('em')?.textContent).toContain('Publicerat även i')
        })

        it('renders a link when url is present', async () => {
            const url = 'https://www.kauppalehti.fi/article'
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti', url }],
                    lang: 'fi',
                },
            })

            expect(getByRole(result, 'link', { name: 'Kauppalehti' })).toHaveAttribute('href', url)
        })

        it('renders no space before the comma after the publication name', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Verde', url: 'https://verdelehti.fi/' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('em')?.textContent).toMatch(/Verde,/)
            expect(result.querySelector('em')?.textContent).not.toMatch(/Verde ,/)
        })

        it('renders no link when url is absent', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'fi',
                },
            })

            expect(queryAllByRole(result, 'link')).toHaveLength(0)
        })

        it('renders one paragraph per publication', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [
                        { date: '2025-03-15', name: 'Kauppalehti', url: 'https://kauppalehti.fi/a' },
                        { date: '2025-04-01', name: 'Verde', url: 'https://verdelehti.fi/a' },
                    ],
                    lang: 'fi',
                },
            })

            expect(result.querySelectorAll('p')).toHaveLength(2)
        })

        it('renders nothing when externalPublications is absent', async () => {
            const result = await renderAstroComponent(Byline, {
                props: { authors: ['lauri'], lang: 'fi' },
            })

            expect(result.querySelector('p')).toBeNull()
        })

        it('renders a language suffix when the publication lang differs from the page lang', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', lang: 'sv', name: 'HBL' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('em')?.textContent).toContain('(ruotsiksi)')
        })

        it('renders no suffix when the publication lang matches the page lang', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', lang: 'fi', name: 'Kauppalehti' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('em')?.textContent).not.toContain('(')
        })

        it('defaults an unset lang to fi, so no suffix appears on the fi page', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'fi',
                },
            })

            expect(result.querySelector('em')?.textContent).not.toContain('(')
        })

        it('defaults an unset lang to fi, so the suffix appears on non-fi pages', async () => {
            const result = await renderAstroComponent(Byline, {
                props: {
                    authors: ['lauri'],
                    externalPublications: [{ date: '2025-03-15', name: 'Kauppalehti' }],
                    lang: 'en',
                },
            })

            expect(result.querySelector('em')?.textContent).toContain('(in Finnish)')
        })
    })
})
