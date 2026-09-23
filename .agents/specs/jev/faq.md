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
    Given a key and post 57, whose related.json entry ranks up to ten posts (entries hold 1–10 today)
    When `npm run suggest:faq -- post 57` runs
    Then the candidates are the question-form H2/H3 headings of post 57 (fi) and of its ranked neighbours (fi), each once, minus any that match a question already in post 57's fi `faq`; inline markup is stripped from the wording
    And the questions are, per candidate i, `a<i>` = noul "The article answers this question directly: <question>" and `u<i>` = score with criteria ['1','2','3','4','5'] "How likely is a voter to ask this before reading the article? (1 = never, 5 = almost always): <question>", and per existing faq question j, `f<j>` = the same noul
    And they are sent in chunks of at most 40 questions per request (FAQ_QUESTIONS_MAX, as links.ts does), every chunk with bodyStateFor(post 57) as state, answers merged; a document is ⌈n / 40⌉ requests
    And stdout shows a "candidates" table of candidates with answerability ≥ the effective --answerable, sorted by usefulness desc, then answerability desc, then harvest order (stable), columns question, source (own | <key>), answers (two decimals), usefulness (one decimal)
    And a "doubtful" table of existing faq questions with answerability < the effective --doubtful, least answered first, columns question, answers, or "no doubtful faq entries"
    And a line "faq entries: <n> (FAQPage JSON-LD needs 2)"
    And "no candidates above <answerable>" replaces an empty candidates table
    And a missing or wrongly typed answer for any `a<i>`, `u<i>` or `f<j>` is a failed request (below)

  Scenario: Question-form headings
    Given the headings of a document
    When candidates are harvested
    Then a heading counts when it starts with an EN, FI or SV question word from aeo.sh:33-35 followed by the end or a non-letter, ends with "?", or its first word (letters only) ends in -ko/-kö followed by the end or a non-letter — in Unicode terms, because JS \b treats ä and ö as non-word characters
    And "Mitä käy…", "Mikä on…", "Pitäisikö…", "Är det…" and "Koko kuva" (the -ko rule, as aeo.sh) count; "Mitään…" and "Kokoomus…" do not
    And H2 and H3 both count, in document order

  Scenario: Locale
    Given `--lang en`
    When the script runs
    Then the document, its neighbours' headings and its existing faq all come from en.mdx; the question instructions stay English in every locale

  Scenario: Usefulness
    Given a score answer with probabilities over the levels 1–5
    When usefulness is computed
    Then it is the expected value, printed with one decimal

  Scenario: Dedupe
    Given two candidates or a candidate and an existing faq question that are equal after stripping inline markup, trimming, lower-casing and dropping a trailing "?"
    When candidates are harvested
    Then the later one is dropped

  Scenario: Existing faq read from the frontmatter
    Given a locale file whose frontmatter has a `faq:` block
    When the corpus is built
    Then Document.faq holds the value of every `- q:` line inside the block (up to the next top-level key), at any indent, single-quoted with '' unescaped, double-quoted with a bare apostrophe allowed, or bare — the quote grammar of fmField, in `faqQuestionsOf` in corpus.ts
    And a file without the block yields []

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

  Scenario: No candidates but an existing faq
    Given a document with no candidates and two faq entries
    When the script runs
    Then the `f<j>` questions are still sent, the candidates table reads "no candidates above <answerable>" and the doubtful table is rendered

  Scenario: Report file
    Given `--out report.md`
    When the script finishes, with or without a failure
    Then everything printed is also written to the file

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
    Given a request that fails after the client's retries, or an answer that is missing or of the wrong type
    When the script runs
    Then it prints the sections completed so far, then "failed at <key>: <error>", writes --out when given, and exits 1

  Scenario: Unexpected error
    Given related.json that cannot be parsed, or a content directory that cannot be read
    When the script runs
    Then it fails with exit 1 and the error; a missing related.json is not an error (every document falls back to its own headings, with the notice)
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
export function headingsOf(body: string, level: 2 | 3 = 2): string[]
export function faqQuestionsOf(frontmatter: string): string[]         // the faq: block only; fmField's quote grammar per `- q:` line
export function bodyStateFor(doc: Document): Record<string, string>   // { title, description, headings: h2s then h3s, body: prose paragraphs with markup stripped, joined by blank lines }

// scripts/jev/faq.ts — shared library, no CLI
export const ANSWERABLE_THRESHOLD = 0.7       // provisional: not measured by the eval gate; tuned on the first runs
export const DOUBTFUL_THRESHOLD = 0.3         // provisional
export const NEIGHBOUR_COUNT = 10             // top of the related.json entry
export const FAQ_QUESTIONS_MAX = 40           // questions per request, as BACKLINK_QUESTIONS_MAX
export function isQuestionHeading(heading: string): boolean            // the aeo.sh rule in Unicode terms
export function normaliseQuestion(q: string): string                    // stripMarkup, trim, lower-case, drop trailing ?
export interface Candidate { question: string; source: 'own' | DocKey }
export function harvest(doc: Document, neighbours: Document[]): Candidate[]   // own first, then neighbours in ranked order; deduped; existing faq excluded
export function faqQuestions(doc: Document, candidates: Candidate[]): Record<string, QuestionSpec>   // a<i>, u<i> (criteria '1'–'5'), f<j>
export function chunkQuestions(questions: Record<string, QuestionSpec>): Array<Record<string, QuestionSpec>>   // ≤ FAQ_QUESTIONS_MAX each, key order
export interface RankedCandidate extends Candidate { answers: number; usefulness: number }
export function rank(candidates: Candidate[], answers: Record<string, Answer>, opts: { answerable: number }): RankedCandidate[]   // throws on a missing or wrongly typed answer
export function doubtfulFaq(doc: Document, answers: Record<string, Answer>, opts: { doubtful: number }): Array<{ answers: number; question: string }>
export const expectedScore = (probabilities: Record<string, number>): number   // Σ Number(level) × p over the keys present; not renormalised; a non-numeric key adds 0

// scripts/suggest-faq.ts — CLI
//   suggest:faq -- <post|newsletter> <id>… [--lang fi|sv|en] [--answerable 0.7] [--doubtful 0.3] [--out <md>]
export async function runFaq(argv: string[], env: NodeJS.ProcessEnv, deps?: { client?; log?; related?: RelatedFile | null; root? }): Promise<number>
```

Requests: per document, 2 × (own + neighbours' question headings) + existing faq nouls, typically 20–60 questions; the worst case today is 11 headings × 11 documents ≈ 240 questions, hence the 40-per-request chunking (6 requests). State is under 2,500 tokens (the longest post is 1,575 words); ≈ $0.0003–0.001 per document. Related neighbours come from `src/content/related.json` read with `readRelatedFile` in `scripts/jev/related.ts` — not `src/lib/related.ts`, whose JSON import has no `with { type: 'json' }` attribute and fails under Node's strip-types loader.

State: `stateFor` (title, description, headings, bounded lead) is enough for the link and tag decisions but not for "answers this question directly", which needs the prose. `bodyStateFor` sends every prose paragraph with markup stripped, well inside the 32k context.

---

## Dependencies

- [Jev decision pipeline](./spec.md) — client, corpus, exit-code and notice conventions
- [Related ranking](./related.md) — `related.json` entries and `readRelatedFile`; a document without an entry falls back to its own headings
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
- **Do not** use `\b` around Finnish or Swedish words in JS — it is ASCII-only, so "Mitä" would never match; test with ä/ö fixtures
- **Do not** import `src/lib/related.ts` from a script — its JSON import lacks the import attribute Node requires

---

## Open Questions

*(none)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Critic review (FAIL → revised): readRelatedFile instead of the src/lib JSON import, Unicode question rule with ä/ö fixtures, faq parsing rule and helper named, score criteria '1'–'5' and expectedScore semantics, 40-question chunking, no-candidates-with-faq, report file and unexpected-error scenarios, tie-break and decimals, markup stripped in dedupe |
| 2026-09-23 | Initial draft for #1492: related neighbours instead of tag siblings, existing faq scored as doubtful, newsletters as targets, no gate (author decisions on discovery) |
