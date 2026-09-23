import type { Lang } from '../content/nav'
import type { FaqItem } from './jsonld'

/**
 * Both the visible FAQ plate and the FAQPage JSON-LD are gated on the same count:
 * a FAQPage rich result needs two or more entries, and Google's structured-data
 * policy requires the marked-up questions to be visible on the page. Keeping one
 * predicate keeps the two from drifting apart.
 */
export const hasFaqSection = (faq?: Array<FaqItem>): faq is Array<FaqItem> => !!faq && faq.length >= 2

/** Trilingual FAQ plate labels shared by PostLayout, NewsletterLayout and PageLayout. */
export const faqSectionLabels: Record<Lang, { eyebrow: string; heading: string }> = {
    en: { eyebrow: 'Q & A', heading: 'Frequently asked questions' },
    fi: { eyebrow: 'Q & A', heading: 'Usein kysyttyä' },
    sv: { eyebrow: 'Q & A', heading: 'Vanliga frågor' },
}
