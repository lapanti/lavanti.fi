# Spec: FAQ candidate ranking

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-23

---

## Intent

Posts and newsletter issues can carry a per-locale `faq` list that becomes `FAQPage` JSON-LD once it has two entries, and AI answer engines quote a page far more often when it answers a question it literally poses. Today 28 of 78 posts have a `faq`; the rest have none, and the ones that exist were written from memory when the post was drafted. The questions worth asking already exist as text: the question-form headings that the AEO rule requires in every post and issue, in the post itself and in its neighbours. Nobody re-reads the neighbours to harvest them.

This feature is an author-run, advisory script that ranks those existing questions for one document: which of them the document actually answers, and which a voter would ask before reading it. It also scores the document's existing `faq` questions, so an entry that drifted from the text after edits is flagged. The author picks the questions and writes the answers. The step belongs to `/write`, `/review-content` and `/aeo-check`; nothing gates on it, because a FAQ is optional content and Jev can neither write a question nobody wrote nor an answer.

---

## Scope

### In scope
- `scripts/jev/faq.ts` — network-free helpers: question-form detection for headings (the `aeo.sh` rule), candidate harvesting from a document and its related neighbours, dedupe against the existing `faq`, request building, ranking and rendering
- `scripts/jev/corpus.ts` — `Document.faq: string[]` (the `q` of every frontmatter `faq` entry) and `Document.h3s` alongside `h2s`, plus `bodyStateFor(doc)` (the document with its prose) for answerability
- `scripts/suggest-faq.ts` + `npm run suggest:faq` — `post <id>… | newsletter <id>…` with `--lang`, `--answerable`, `--doubtful`, `--out`
- `.claude/skills/write/SKILL.md`, `review-content/SKILL.md`, `aeo-check/SKILL.md` — a "FAQ candidates" step
- Unit tests for the helpers and for the CLI with an injected client; no network in tests
- `ARCHITECTURE.md` paragraph

### Out of scope
- Generating questions or answers — Jev returns typed decisions only; a question that nobody wrote as a heading cannot be proposed
- Writing `faq` frontmatter or gating on it: no receipt kind, no `check:suggestions` change, no `--changed-since` (a FAQ is optional content and the AEO rule on headings is the enforced part)
- Candidates from tag siblings (the issue's first idea): unbounded on broad tags — 51 posts carry `kirkkonummi` — and superseded by the related ranking
- Cross-kind neighbours: `related.json` ranks same-kind documents only, so a post's neighbours are posts and an issue's are issues
- Component heading props (`heading="…"`): no post uses them today; `aeo.sh` accepts them, the harvester does not until one exists
- Tag, link and related suggestions (#1491, #1490, #1487)

---

## Contract

```gherkin
Feature: FAQ candidates for one document

  Scenario: Candidates for a post
    Given a key and post 57, whose related.json entry ranks ten posts
    When `npm run suggest:faq -- post 57` runs
    Then the candidates are the question-form H2/H3 headings of post 57 (fi) and of its ten neighbours (fi), each once, minus any that match a question already in post 57's fi `faq`
    And one request is sent with bodyStateFor(post 57) as state and, per candidate i, `a<i>` = noul "The article answers this question directly: <question>" and `u<i>` = score over 1–5 "How likely is a voter to ask this before reading the article?"
    And per existing faq question j, `f<j>` = the same noul
    And stdout shows a "candidates" table of candidates with answerability ≥ 0.7, sorted by usefulness desc then answerability desc, columns question, source (own | <key>), answers, usefulness
    And a "doubtful" table of existing faq questions with answerability < 0.3, columns question, answers, or "no doubtful faq entries"
    And a line "faq entries: <n> (FAQPage JSON-LD needs 2)"
    And "no candidates above 0.70" replaces an empty candidates table

  Scenario: Question-form headings
    Given the headings of a document
    When candidates are harvested
    Then a heading counts when it starts with an EN, FI or SV question word from aeo.sh, ends with "?", or its first word ends in -ko/-kö; H2 and H3 both count, in document order

  Scenario: Locale
    Given `--lang en`
    When the script runs
    Then the document, its neighbours' headings and its existing faq all come from en.mdx; the question instructions stay English in every locale

  Scenario: Usefulness
    Given a score answer with probabilities over the levels 1–5
    When usefulness is computed
    Then it is the expected value, printed with one decimal

  Scenario: Dedupe
    Given two candidates or a candidate and an existing faq question that are equal after trimming, lower-casing and dropping a trailing "?"
    When candidates are harvested
    Then the later one is dropped

  Scenario: Newsletter target
    Given `newsletter 2`
    When the script runs
    Then it works the same with the issue's ranked issues as neighbours

  Scenario: No related entry
    Given a document without an entry in related.json (new, not yet generated)
    When the script runs
    Then it uses the document's own headings only and prints "no related entry for <key>: own headings only"

  Scenario: No candidates and no faq
    Given a document with no question-form headings, no neighbours with any, and no faq
    When the script runs
    Then it prints "no candidates" and the faq-entries line and exits 0 without a request

  Scenario: Several documents
    Given `post 57 post 71`
    When the script runs
    Then one section per document, in the given order, one request each

  Scenario: Skills
    Given /write, /review-content or /aeo-check is run on a document
    Then the skill instructs running `npm run suggest:faq -- <post|newsletter> <id>`, picking questions from the table, writing each answer by hand in the document's voice, and mentions the two-entry JSON-LD threshold

Feature: Common behaviour

  Scenario: No key
    Given neither key is set
    When the script runs
    Then it prints the skipped notice and exits 0

  Scenario: Bad arguments
    Given an unknown kind, a non-numeric id, an unknown lang, or a threshold outside (0, 1]
    When the script runs
    Then it prints the usage line and exits 2

  Scenario: Unknown document
    Given `post 999`
    When the script runs
    Then it prints "post:999 not found" and exits 2

  Scenario: Failed request
    Given a request that fails after the client's retries
    When the script runs
    Then it prints the sections completed so far, then "failed at <key>: <error>", writes --out when given, and exits 1
```

---

## Data Model

```typescript
// scripts/jev/corpus.ts (change)
export interface Document {
    // …existing fields
    faq: string[]          // the q of every frontmatter faq entry, in order; [] when none
    h3s: string[]          // '### ' headings, as h2s
}
export function bodyStateFor(doc: Document): Record<string, string>   // { title, description, headings, body: prose paragraphs joined by blank lines }

// scripts/jev/faq.ts — shared library, no CLI
export const ANSWERABLE_THRESHOLD = 0.7       // provisional: not measured by the eval gate; tuned on the first runs
export const DOUBTFUL_THRESHOLD = 0.3         // provisional
export const NEIGHBOUR_COUNT = 10             // top of the related.json entry
export function isQuestionHeading(heading: string): boolean            // the aeo.sh rule
export function normaliseQuestion(q: string): string                    // trim, lower-case, drop trailing ?
export interface Candidate { question: string; source: 'own' | DocKey }
export function harvest(doc: Document, neighbours: Document[]): Candidate[]   // own first, then neighbours in ranked order; deduped; existing faq excluded
export function faqQuestions(doc: Document, candidates: Candidate[]): Record<string, QuestionSpec>   // a<i>, u<i>, f<j>
export interface RankedCandidate extends Candidate { answers: number; usefulness: number }
export function rank(candidates: Candidate[], answers: Record<string, Answer>, opts: { answerable: number }): RankedCandidate[]
export function doubtfulFaq(doc: Document, answers: Record<string, Answer>, opts: { doubtful: number }): Array<{ answers: number; question: string }>
export const expectedScore = (probabilities: Record<string, number>): number   // Σ level × p

// scripts/suggest-faq.ts — CLI
//   suggest:faq -- <post|newsletter> <id>… [--lang fi|sv|en] [--answerable 0.7] [--doubtful 0.3] [--out <md>]
export async function runFaq(argv: string[], env: NodeJS.ProcessEnv, deps?: { client?; log?; related?; root? }): Promise<number>
```

Requests: one per document, ≈ 2 × (own + neighbours' question headings) + existing faq nouls, typically 20–60 questions over a state of under 1,500 tokens ≈ $0.0003 per document. Related neighbours come from `src/content/related.json` through `rankedKeys` in `src/lib/related.ts` (a pure helper; the one-way dependency rule allows scripts to import it).

State: `stateFor` (title, description, headings, bounded lead) is enough for the link and tag decisions but not for "answers this question directly", which needs the prose. `bodyStateFor` sends the full prose paragraphs; posts are 300–800 words, well inside the 32k context.

---

## Dependencies

- [Jev decision pipeline](./spec.md) — client, corpus, exit-code and notice conventions
- [Related ranking](./related.md) — `related.json` entries and `rankedKeys`; a document without an entry falls back to its own headings
- [Link suggestions](./links.md) — CLI conventions (positional `kind id` pairs, `--out`, failure output)
- `scripts/checks/aeo.sh:33-35` — the question-word lists; `faq.ts` must keep the same words
- `src/components/Head.astro:231` — the two-entry `FAQPage` threshold quoted in the output

---

## Anti-patterns

- **Do not** generate or paraphrase questions — every candidate is a heading someone wrote; the script reports it verbatim
- **Do not** write `faq` frontmatter or add a receipt — advisory content aid, as the issue says
- **Do not** send `stateFor` for answerability — the bounded lead cannot say whether the body answers a question; send the prose
- **Do not** harvest tag siblings — unbounded on broad tags; the related ranking is the neighbourhood
- **Do not** mix locales — candidates, existing faq and state all come from the same `--lang` file

---

## Open Questions

*(none)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Initial draft for #1492: related neighbours instead of tag siblings, existing faq scored as doubtful, newsletters as targets, no gate (author decisions on discovery) |
