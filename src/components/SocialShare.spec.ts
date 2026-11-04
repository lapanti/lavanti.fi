import { getByRole } from '@testing-library/dom'
import { describe, expect, it } from 'vitest'

import { renderAstroComponent } from '../../tests/helpers'
import {
    personBlueskyHandle,
    personMastodonHandle,
    personMastodonInstance,
    personThreadsHandle,
} from '../content/person'
import SocialShare from './SocialShare.astro'

describe('<SocialShare />', () => {
    const shareUrl = 'https://lavanti.fi/blogi/vuosi-2026-on-tekoalyn'
    const title = 'Vuosi 2026 on tekoälyn'
    const ariaLabel = 'Kirjoituksen "Vuosi 2026 on tekoälyn" jakaminen sosiaalisessa mediassa'

    it('should render', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(result.firstChild).toMatchSnapshot()
    })

    it('should render aside', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'complementary', { name: ariaLabel })).toBeDefined()
    })

    it('should render Finnish share label', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(result.querySelector('.share-k')?.textContent).toBe('Jaa:')
    })

    it('should render facebook link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Facebook: jaa kirjoitus "${title}"` })).toBeDefined()
    })

    it('should render correct url for facebook link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Facebook: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'href',
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURI(shareUrl)}`
        )
    })

    it('should render correct rel for facebook link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Facebook: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'rel',
            'noopener noreferrer'
        )
    })

    it('should render correct title for facebook link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Facebook: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'title',
            'Jaa Facebookissa'
        )
    })

    it('should render threads link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Threads: jaa kirjoitus "${title}"` })).toBeDefined()
    })

    it('should render correct url for threads link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Threads: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'href',
            `https://threads.com/intent/post?text=${encodeURIComponent(`Lue "${title}", jonka @${personThreadsHandle} kirjoitti\n\n${shareUrl}`)}`
        )
    })

    it('should render correct rel for threads link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Threads: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'rel',
            'noopener noreferrer'
        )
    })

    it('should render correct title for threads link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Threads: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'title',
            'Jaa Threadsissä'
        )
    })

    it('should render bluesky link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Bluesky: jaa kirjoitus "${title}"` })).toBeDefined()
    })

    it('should render correct url for bluesky link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Bluesky: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'href',
            `https://bsky.app/intent/compose?text=${encodeURIComponent(`Lue "${title}", jonka @${personBlueskyHandle} kirjoitti\n\n${shareUrl}`)}`
        )
    })

    it('should render correct rel for bluesky link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Bluesky: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'rel',
            'noopener noreferrer'
        )
    })

    it('should render correct title for bluesky link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Bluesky: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'title',
            'Jaa Blueskyssa'
        )
    })

    it('should render mastodon link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Mastodon: jaa kirjoitus "${title}"` })).toBeDefined()
    })

    it('should render correct url for mastodon link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Mastodon: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'href',
            `https://${personMastodonInstance}/share?text=${encodeURIComponent(`Lue "${title}", jonka @${personMastodonHandle} kirjoitti\n\n${shareUrl}`)}`
        )
    })

    it('should render correct rel for mastodon link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Mastodon: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'rel',
            'noopener noreferrer'
        )
    })

    it('should render correct title for mastodon link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `Mastodon: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'title',
            'Jaa Mastodonissa'
        )
    })

    it('should render linkedin link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `LinkedIn: jaa kirjoitus "${title}"` })).toBeDefined()
    })

    it('should render correct url for linkedin link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `LinkedIn: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'href',
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURI(shareUrl)}`
        )
    })

    it('should render correct rel for linkedin link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `LinkedIn: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'rel',
            'noopener noreferrer'
        )
    })

    it('should render correct title for linkedin link', async () => {
        const result = await renderAstroComponent(SocialShare, {
            props: {
                ariaLabel,
                shareUrl,
                title,
            },
        })

        expect(getByRole(result, 'link', { name: `LinkedIn: jaa kirjoitus "${title}"` })).toHaveAttribute(
            'title',
            'Jaa LinkedInissä'
        )
    })
    describe('when locale is en', () => {
        const enAriaLabel = 'Sharing post "Test post" on social media'
        const enTitle = 'Test post'
        const enShareUrl = 'https://lavanti.fi/en/blog/test'

        it('should render English share label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(result.querySelector('.share-k')?.textContent).toBe('Share:')
        })

        it('should render facebook link with English label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Facebook` })).toBeDefined()
        })

        it('should render threads link with English label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Threads` })).toBeDefined()
        })

        it('should render correct url for threads link with English share text', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Threads` })).toHaveAttribute(
                'href',
                `https://threads.com/intent/post?text=${encodeURIComponent(`Read "${enTitle}" that was written by @${personThreadsHandle}\n\n${enShareUrl}`)}`
            )
        })

        it('should render bluesky link with English label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Bluesky` })).toBeDefined()
        })

        it('should render correct url for bluesky link with English share text', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Bluesky` })).toHaveAttribute(
                'href',
                `https://bsky.app/intent/compose?text=${encodeURIComponent(`Read "${enTitle}" that was written by @${personBlueskyHandle}\n\n${enShareUrl}`)}`
            )
        })

        it('should render linkedin link with English label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on LinkedIn` })).toBeDefined()
        })

        it('should render mastodon link with English label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Mastodon` })).toBeDefined()
        })

        it('should render correct url for mastodon link with English share text', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: enAriaLabel,
                    locale: 'en',
                    shareUrl: enShareUrl,
                    title: enTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Share post "${enTitle}" on Mastodon` })).toHaveAttribute(
                'href',
                `https://${personMastodonInstance}/share?text=${encodeURIComponent(`Read "${enTitle}" that was written by @${personMastodonHandle}\n\n${enShareUrl}`)}`
            )
        })
    })

    describe('when locale is sv', () => {
        const svAriaLabel = 'Dela inlägget "Testinlägg" på sociala medier'
        const svTitle = 'Testinlägg'
        const svShareUrl = 'https://lavanti.fi/sv/blog/test'

        it('should render Swedish share label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(result.querySelector('.share-k')?.textContent).toBe('Dela:')
        })

        it('should render facebook link with Swedish label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Facebook` })).toBeDefined()
        })

        it('should render threads link with Swedish label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Threads` })).toBeDefined()
        })

        it('should render correct url for threads link with Swedish share text', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Threads` })).toHaveAttribute(
                'href',
                `https://threads.com/intent/post?text=${encodeURIComponent(`Läs inlägget "${svTitle}" som skrevs av @${personThreadsHandle}\n\n${svShareUrl}`)}`
            )
        })

        it('should render bluesky link with Swedish label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Bluesky` })).toBeDefined()
        })

        it('should render correct url for bluesky link with Swedish share text', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Bluesky` })).toHaveAttribute(
                'href',
                `https://bsky.app/intent/compose?text=${encodeURIComponent(`Läs inlägget "${svTitle}" som skrevs av @${personBlueskyHandle}\n\n${svShareUrl}`)}`
            )
        })

        it('should render linkedin link with Swedish label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på LinkedIn` })).toBeDefined()
        })

        it('should render mastodon link with Swedish label', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Mastodon` })).toBeDefined()
        })

        it('should render correct url for mastodon link with Swedish share text', async () => {
            const result = await renderAstroComponent(SocialShare, {
                props: {
                    ariaLabel: svAriaLabel,
                    locale: 'sv',
                    shareUrl: svShareUrl,
                    title: svTitle,
                },
            })

            expect(getByRole(result, 'link', { name: `Dela inlägget "${svTitle}" på Mastodon` })).toHaveAttribute(
                'href',
                `https://${personMastodonInstance}/share?text=${encodeURIComponent(`Läs inlägget "${svTitle}" som skrevs av @${personMastodonHandle}\n\n${svShareUrl}`)}`
            )
        })
    })
})
