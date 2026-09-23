import type { Answer } from './client'
import type { DocKey, Document } from './corpus'

import { describe, expect, it } from 'vitest'

import {
    chunkQuestions,
    doubtfulFaq,
    expectedScore,
    faqQuestions,
    harvest,
    isQuestionHeading,
    normaliseQuestion,
    rank,
} from './faq'

const doc = (key: DocKey, overrides: Partial<Document> = {}): Document => ({
    body: '',
    contentHash: 'c',
    description: '',
    faq: [],
    h2s: [],
    h3s: [],
    id: Number(key.split(':')[1]),
    key,
    kind: key.startsWith('post') ? 'post' : 'newsletter',
    lang: 'fi',
    lead: '',
    paragraphs: [],
    publishDate: '2026-01-01',
    slug: 's',
    sourceHash: 'h',
    tags: [],
    title: key,
    ...overrides,
})

describe('isQuestionHeading', () => {
    it('applies the aeo.sh rule: question word, trailing ?, or a -ko/-kö first word', () => {
        for (const h of [
            'Miksi toimittajariippuvuus maksaa?',
            'Why does it cost',
            'Vad betyder det',
            'Korvaako tekoäly ohjelmoijat',
            'Onko näin',
            'Plain words?',
            'Koko kuva', // the -ko rule, as in aeo.sh
            'Mitä käy junioriohjelmoijien polulle', // ä before the word end: JS \b would miss it
            'Mikä on kansalaisaloite',
            'Pitäisikö lainsäädännön suojata perusoikeuksia',
            'Är det så',
            'Onko-sanalla alkava',
        ]) {
            expect(isQuestionHeading(h), h).toBe(true)
        }
        for (const h of [
            'Sivistys ja tasa-arvo',
            'Digital självständighet',
            'Kokonaisuus ensin',
            'Howard is here',
            'Mitään ei tapahdu',
            'Kokoomus päätti',
            '',
        ]) {
            expect(isQuestionHeading(h), h).toBe(false)
        }
    })
})

describe('harvest', () => {
    const body = (...headings: string[]): string => headings.map((h) => `${h}\n\ntext`).join('\n\n')
    const own = doc('post:1', {
        body: body(
            '## Mitä osaamista vien eduskuntaan?',
            '### Onko kirjasto tasa-arvon turvaaja?',
            '## Sivistys ja tasa-arvo',
            '## mitä digitaalinen itsenäisyys tarkoittaa',
            '### Kuka päättää?'
        ),
        faq: ['Mitä digitaalinen itsenäisyys tarkoittaa?'],
    })
    const n1 = doc('post:2', {
        body: body('## Miksi toimittajariippuvuus maksaa?', '## Mitä osaamista vien eduskuntaan?'),
    })
    const n2 = doc('post:3', { body: body('## Miksi toimittajariippuvuus maksaa?  ', '## Ei kysymys', '### Milloin?') })

    it('takes own question headings first in document order (H2 and H3 interleaved), then neighbours, once each, minus the existing faq', () => {
        expect(harvest(own, [n1, n2])).toEqual([
            { question: 'Mitä osaamista vien eduskuntaan?', source: 'own' },
            { question: 'Onko kirjasto tasa-arvon turvaaja?', source: 'own' },
            { question: 'Kuka päättää?', source: 'own' },
            { question: 'Miksi toimittajariippuvuus maksaa?', source: 'post:2' },
            { question: 'Milloin?', source: 'post:3' },
        ])
        expect(harvest(doc('post:9'), [])).toEqual([])
    })

    it('normalises for dedupe, strips inline markup, and keeps the wording otherwise', () => {
        expect(normaliseQuestion('  Miksi?? ')).toBe('miksi')
        expect(normaliseQuestion('Miksi *eVaka* [toimii](/x/)?')).toBe('miksi evaka toimii')
        expect(harvest(doc('post:1', { body: body('## Miksi?', '## MIKSI', '## Miksi **nyt**?') }), [])).toEqual([
            { question: 'Miksi?', source: 'own' },
            { question: 'Miksi nyt?', source: 'own' },
        ])
    })

    it('chunks the questions at 40 per request, keeping key order', () => {
        const many = Array.from({ length: 45 }, (_unused, i) => ({ question: `Q${i}?`, source: 'own' as const }))
        const chunks = chunkQuestions(faqQuestions(doc('post:1', { faq: ['F?'] }), many))

        expect(chunks.map((c) => Object.keys(c).length)).toEqual([40, 40, 11])
        expect(Object.keys(chunks[0]).slice(0, 4)).toEqual(['a0', 'u0', 'a1', 'u1'])
        expect(Object.keys(chunks[2]).at(-1)).toBe('f0')
        expect(chunkQuestions({})).toEqual([])
    })
})

describe('faqQuestions, rank, doubtfulFaq', () => {
    const target = doc('post:1', { faq: ['Vanha kysymys?', 'Toinen vanha?'] })
    const candidates = [
        { question: 'A?', source: 'own' as const },
        { question: 'B?', source: 'post:2' as const },
        { question: 'C?', source: 'post:3' as const },
    ]

    it('asks a noul and a 1–5 score per candidate and a noul per existing faq question', () => {
        const questions = faqQuestions(target, candidates)

        expect(Object.keys(questions)).toEqual(['a0', 'u0', 'a1', 'u1', 'a2', 'u2', 'f0', 'f1'])
        expect(questions.a1).toEqual({ instructions: 'The article answers this question directly: B?', type: 'noul' })
        expect(questions.u1).toEqual({
            criteria: ['1', '2', '3', '4', '5'],
            instructions: expect.stringMatching(
                /^How likely is a voter to ask this before reading the article\?.* B\?$/
            ),
            type: 'score',
        })
        expect(questions.f1).toEqual({
            instructions: 'The article answers this question directly: Toinen vanha?',
            type: 'noul',
        })
    })

    it('ranks answerable candidates by usefulness then answers, and flags doubtful faq entries', () => {
        const score = (p: Record<string, number>): Answer => ({
            confidence: 0.5,
            probabilities: p,
            score: '3',
            type: 'score',
        })
        const noul = (n: number): Answer => ({ noul: n, type: 'noul' })
        const answers: Record<string, Answer> = {
            a0: noul(0.9),
            a1: noul(0.95),
            a2: noul(0.4),
            f0: noul(0.1),
            f1: noul(0.8),
            u0: score({ '1': 0, '2': 0, '3': 0.5, '4': 0.5, '5': 0 }),
            u1: score({ '1': 0, '2': 0, '3': 0, '4': 0.5, '5': 0.5 }),
            u2: score({ '5': 1 }),
        }

        expect(expectedScore({ '1': 0.5, '5': 0.5 })).toBe(3)
        expect(expectedScore({ '4': 0.5, high: 0.5 })).toBe(2)
        expect(expectedScore({})).toBe(0)
        expect(rank(candidates, answers, { answerable: 0.7 })).toEqual([
            { answers: 0.95, question: 'B?', source: 'post:2', usefulness: 4.5 },
            { answers: 0.9, question: 'A?', source: 'own', usefulness: 3.5 },
        ])
        expect(rank(candidates, answers, { answerable: 0.3 }).map((c) => c.question)).toEqual(['C?', 'B?', 'A?'])
        expect(doubtfulFaq(target, answers, { doubtful: 0.3 })).toEqual([{ answers: 0.1, question: 'Vanha kysymys?' }])
        expect(() => rank(candidates, { ...answers, u2: noul(1) }, { answerable: 0.1 })).toThrow(
            'expected a score answer for u2, got noul'
        )
        expect(() => doubtfulFaq(target, {}, { doubtful: 0.3 })).toThrow('expected a noul answer for f0, got nothing')
    })
})
