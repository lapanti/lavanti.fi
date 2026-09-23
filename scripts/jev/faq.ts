/**
 * faq.ts
 *
 * Network-free helpers for scripts/suggest-faq.ts: question-form detection
 * for headings (the scripts/checks/aeo.sh rule), candidate harvesting from a
 * document and its related neighbours, dedupe against the existing faq, the
 * request questions, ranking and the doubtful existing entries. No CLI.
 *
 * Spec: .agents/specs/jev/faq.md
 */

/* eslint-disable import-x/extensions -- node --experimental-strip-types needs explicit extensions */
import type { Answer, QuestionSpec } from './client.ts'
import type { DocKey, Document } from './corpus.ts'

import { stripMarkup } from '../checks/mdx-deep.ts'
/* eslint-enable import-x/extensions */

/** Candidates the document answers at or above this are listed. Provisional: not measured by the eval gate. */
export const ANSWERABLE_THRESHOLD = 0.7
/** Existing faq questions answered below this are flagged. Provisional. */
export const DOUBTFUL_THRESHOLD = 0.3
/** Neighbours read from the top of the related.json entry. */
export const NEIGHBOUR_COUNT = 10
/** A request never carries more questions than this; the same state is repeated per chunk (as links.ts). */
const FAQ_QUESTIONS_MAX = 40
const SCORE_LEVELS = ['1', '2', '3', '4', '5']
const ANSWERS_INSTRUCTION = 'The article answers this question directly:'
const USEFULNESS_INSTRUCTION =
    'How likely is a voter to ask this before reading the article? (1 = never, 5 = almost always):'

/*
 * The same word lists as scripts/checks/aeo.sh:33-35; keep them in step. JS \b is
 * ASCII-only, so "word followed by a non-letter or the end" is spelled out.
 */
const QUESTION_WORDS = [
    'How|What|Why|When|Who|Can|Is|Are|Does|Should|Which|Will|Has|Have',
    'Miten|Mitä|Miksi|Milloin|Kuka|Voiko|Onko|Pitäisikö|Mikä|Mikäli|Kuinka|Ketkä|Missä',
    'Hur|Vad|Varför|När|Vem|Kan|Är|Ska|Vilken|Vilket|Vilka|Bör|Har',
].join('|')
const QUESTION_START = new RegExp(`^(?:${QUESTION_WORDS})(?!\\p{L})`, 'u')
const KO_SUFFIX = /^\p{L}+k[oö](?!\p{L})/u

export interface Candidate {
    question: string
    source: 'own' | DocKey
}

export interface RankedCandidate extends Candidate {
    answers: number
    usefulness: number
}

export interface DoubtfulFaq {
    answers: number
    question: string
}

/** The aeo.sh rule: a question word first, a trailing "?", or a first word ending in -ko/-kö. */
export const isQuestionHeading = (heading: string): boolean => {
    const text = heading.trim()

    return QUESTION_START.test(text) || text.endsWith('?') || KO_SUFFIX.test(text)
}

/** Equality key for dedupe: inline markup stripped, trimmed, lower-cased, trailing "?" dropped. */
export const normaliseQuestion = (question: string): string =>
    stripMarkup(question).trim().replace(/\?+$/, '').trim().toLowerCase()

const questionHeadings = (doc: Document): string[] => [...doc.h2s, ...doc.h3s].filter(isQuestionHeading)

/**
 * Own question headings first, then the neighbours' in ranked order, each
 * question once, questions already in the document's faq excluded.
 */
export function harvest(doc: Document, neighbours: Document[]): Candidate[] {
    const seen = new Set(doc.faq.map(normaliseQuestion))
    const out: Candidate[] = []
    const add = (question: string, source: Candidate['source']): void => {
        const key = normaliseQuestion(question)
        if (!key || seen.has(key)) return
        seen.add(key)
        out.push({ question: stripMarkup(question).trim(), source })
    }
    for (const heading of questionHeadings(doc)) add(heading, 'own')
    for (const neighbour of neighbours) {
        for (const heading of questionHeadings(neighbour)) add(heading, neighbour.key)
    }

    return out
}

/** a<i> and u<i> per candidate, f<j> per existing faq question. */
export function faqQuestions(doc: Document, candidates: Candidate[]): Record<string, QuestionSpec> {
    const questions: Record<string, QuestionSpec> = {}
    candidates.forEach((c, i) => {
        questions[`a${i}`] = { instructions: `${ANSWERS_INSTRUCTION} ${c.question}`, type: 'noul' }
        questions[`u${i}`] = {
            criteria: SCORE_LEVELS,
            instructions: `${USEFULNESS_INSTRUCTION} ${c.question}`,
            type: 'score',
        }
    })
    doc.faq.forEach((q, j) => {
        questions[`f${j}`] = { instructions: `${ANSWERS_INSTRUCTION} ${q}`, type: 'noul' }
    })

    return questions
}

/** Chunks of at most FAQ_QUESTIONS_MAX questions, in key order; [] for no questions. */
export function chunkQuestions(questions: Record<string, QuestionSpec>): Array<Record<string, QuestionSpec>> {
    const entries = Object.entries(questions)
    const chunks: Array<Record<string, QuestionSpec>> = []
    for (let start = 0; start < entries.length; start += FAQ_QUESTIONS_MAX) {
        chunks.push(Object.fromEntries(entries.slice(start, start + FAQ_QUESTIONS_MAX)))
    }

    return chunks
}

/**
 * Expected value of a score answer: Σ level × p over the keys present, the
 * levels being the criteria '1'–'5'. Not renormalised; a key that is not a
 * number contributes nothing.
 */
export const expectedScore = (probabilities: Record<string, number>): number =>
    Object.entries(probabilities).reduce((sum, [level, p]) => sum + (Number(level) || 0) * p, 0)

const noulOf = (answers: Record<string, Answer>, name: string): number => {
    const answer = answers[name]
    if (answer?.type !== 'noul') throw new Error(`expected a noul answer for ${name}, got ${answer?.type ?? 'nothing'}`)

    return answer.noul
}

const scoreOf = (answers: Record<string, Answer>, name: string): number => {
    const answer = answers[name]
    if (answer?.type !== 'score')
        throw new Error(`expected a score answer for ${name}, got ${answer?.type ?? 'nothing'}`)

    return expectedScore(answer.probabilities)
}

/** Candidates answered at or above the threshold, usefulness desc, then answers desc, then harvest order. */
export function rank(
    candidates: Candidate[],
    answers: Record<string, Answer>,
    opts: { answerable: number }
): RankedCandidate[] {
    return candidates
        .map((c, i) => ({ ...c, answers: noulOf(answers, `a${i}`), usefulness: scoreOf(answers, `u${i}`) }))
        .filter((c) => c.answers >= opts.answerable)
        .toSorted((a, b) => b.usefulness - a.usefulness || b.answers - a.answers)
}

/** Existing faq questions the document answers below the threshold, least answered first. */
export function doubtfulFaq(doc: Document, answers: Record<string, Answer>, opts: { doubtful: number }): DoubtfulFaq[] {
    return doc.faq
        .map((question, j) => ({ answers: noulOf(answers, `f${j}`), question }))
        .filter((f) => f.answers < opts.doubtful)
        .toSorted((a, b) => a.answers - b.answers)
}
