import type { Lang } from './nav'

import data from './recommendations.json'

interface RecommendationLocale {
    alt: string
    title: string
}

export interface Recommendation {
    image: string
    locales: Record<Lang, RecommendationLocale>
    name: string
    recommendation: string
}

/*
 * The entries live in JSON so `npm run recommendations -- approve` can append one without
 * editing TypeScript source (spec: .agents/specs/recommendations/submission-form.md).
 */
export const recommendations: Recommendation[] = data
