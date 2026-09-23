/**
 * links.ts
 *
 * Network-free helpers shared by the link eval (scripts/jev/eval.ts) and the
 * link-suggestion script (scripts/suggest-links.ts): which documents a
 * paragraph already links, the choice options for "which page substantiates
 * this paragraph", and probability ranking. No CLI.
 *
 * Spec: .agents/specs/jev/links.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import { NEWSLETTER_SEGMENTS } from '../../src/lib/newsletterRoutes.ts'
import { CHOICE_OPTION_MAX } from './client.ts'
import { type DocKey, type DocKind, type Document, labelFor } from './corpus.ts'
/* eslint-enable import-x/extensions */

export const NONE = 'none'

const SEGMENT_KIND: Record<string, DocKind> = Object.fromEntries([
    ['blog', 'post'],
    ...Object.values(NEWSLETTER_SEGMENTS).map((segment) => [segment, 'newsletter']),
])

/** Documents a paragraph links to via /<lang>/blog/<id>/ or /<lang>/<newsletter segment>/<id>/; other links ignored. */
export function linkTargets(paragraph: string, known: ReadonlySet<DocKey>): DocKey[] {
    const out = new Set<DocKey>()
    for (const match of paragraph.matchAll(/\]\(\/(?:en|fi|sv)\/([a-z]+)\/(\d+)\//g)) {
        const kind = SEGMENT_KIND[match[1]]
        if (!kind) continue
        const key: DocKey = `${kind}:${Number(match[2])}`
        if (known.has(key)) out.add(key)
    }

    return [...out]
}

/** Choice criteria for one paragraph: every other document labelled in English, plus "none". Throws above the option cap. */
export function linkOptions(english: Document[], self: DocKey): Record<string, string> {
    if (english.length > CHOICE_OPTION_MAX) {
        throw new Error(
            `corpus has ${english.length} documents; a choice question allows CHOICE_OPTION_MAX=${CHOICE_OPTION_MAX} options`
        )
    }
    const criteria: Record<string, string> = {}
    for (const doc of english) if (doc.key !== self) criteria[doc.key] = labelFor(doc)
    criteria[NONE] = 'No page on the site substantiates a claim made in this paragraph'

    return criteria
}

/** Option keys by probability, best first, "none" excluded. */
export const rankedOptions = (probabilities: Record<string, number>): string[] =>
    Object.entries(probabilities)
        .filter(([key]) => key !== NONE)
        .sort(([, a], [, b]) => b - a)
        .map(([key]) => key)

/** The single most probable option, "none" included. */
export const topChoice = (probabilities: Record<string, number>): string =>
    Object.entries(probabilities).sort(([, a], [, b]) => b - a)[0]?.[0] ?? NONE
