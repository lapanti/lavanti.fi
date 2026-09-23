# Spec: Jev decision pipeline — client, corpus and eval gate

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-23

---

## Intent

Several content decisions on the site are made by hand or by a crude proxy: related posts are ordered by tag overlap (`src/lib/posts.ts` `sortByRelatedTags`), tags are assigned from memory, internal links and FAQ candidates are found by rereading the corpus, and newsletter issues never get linked back (#1485). Jev (TypeSafe AI's System One model) returns typed decisions — `choice` over ≤255 options with a probability per option, `score`, and `noul` yes/no — for a fraction of a cent per call, which fits ranking, categorising and judging tasks exactly. It cannot generate text.

Before any Jev output is rendered or enforced, its accuracy on this corpus has to be measured, because English is Jev's primary training language and the site's source language is Finnish. This spec defines the shared foundation every later Jev feature builds on: a dependency-free HTTP client, a corpus builder that turns each post and newsletter into one locale-invariant `Document` with a stable content hash, and an eval script that scores Jev against the decisions a human already made (the tags in `meta.json` and the internal links in post bodies). The eval result is the go/no-go gate for #1487 (ranked related posts) and the suggestion features that follow.

The build never calls Jev. Everything under `scripts/jev/` is author-run tooling; its output enters the site only as committed data in later phases.

---

## Scope

### In scope
- `scripts/jev/client.ts` — `fetch` wrapper for the System One endpoint; provider chosen from the environment; retries; typed request and response
- `scripts/jev/corpus.ts` — builds `Document[]` from `src/content/posts/*` and `src/content/newsletters/*` with a `sourceHash` over `meta.json` and all three locale files
- `scripts/jev/eval.ts` + `npm run jev:eval` — tag-suggestion and link-target evals against existing human decisions, per input language, with cost reporting
- Unit tests (`*.spec.ts` beside the scripts) for corpus building, hashing, ground-truth extraction, metric maths and the no-key path; no network in tests
- `knip.config.ts` entries, `package.json` script, key names documented in `ARCHITECTURE.md`
- Eval results and the go/no-go decision recorded in this spec's Changelog and the "Eval results" section

### Out of scope
- Any rendered or committed Jev output (`related.json`, layout changes) — #1487
- Tag, link and FAQ suggestion scripts, CI wiring, PR comments — later phases
- npm dependencies (`@typesafe-ai/sdk`, `dotenv`, or any other); Node 24 `fetch` and `--env-file-if-exists` only
- Calling Jev at build time, in pre-commit, or in CI
- Non-text inputs, text generation, date or number reasoning

---

## Contract

```gherkin
Feature: Jev client

  Scenario: OpenRouter transport
    Given OPENROUTER_API_KEY is set and TYPESAFE_API_KEY is not
    When the client sends a request
    Then it POSTs to https://openrouter.ai/api/v1/systemone
    And the body carries model "jev-1.13"
    And the Authorization header is "Bearer <OPENROUTER_API_KEY>"

  Scenario: TypeSafe transport takes precedence
    Given both TYPESAFE_API_KEY and OPENROUTER_API_KEY are set
    When the client sends a request
    Then it POSTs to https://api.typesafe.ai/v1/systemone with model "jev-1.13.0"

  Scenario: No key
    Given neither key is set
    When a script asks the client for a provider
    Then the client reports "no provider" without touching the network
    And the calling script prints "skipped: no OPENROUTER_API_KEY or TYPESAFE_API_KEY" and exits 0

  Scenario: Transient failure
    Given the endpoint answers 429 or a 5xx
    When the client sends a request
    Then it retries up to 3 times with exponential backoff starting at 500 ms
    And after the last failure it throws an error naming the status and the question names

  Scenario: Typed answers
    Given a request with a choice, a score and a noul question
    When the response arrives
    Then answers.<name> exposes choice + probabilities + confidence, score + probabilities, or noul respectively
    And usage.input_tokens and usage.cost are returned to the caller

Feature: Corpus builder

  Scenario: One Document per post and newsletter
    Given the content collections on disk
    When buildCorpus() runs
    Then it returns one Document per directory under src/content/posts and src/content/newsletters
    And keys are "post:<id>" and "newsletter:<id>"
    And every Document carries title, description, h2s, lead, tags (empty for newsletters), publishDate and sourceHash

  Scenario: Locale selection
    Given a post with fi, sv and en siblings
    When buildCorpus({ lang: 'fi' }) runs
    Then title, description, h2s and lead come from fi.mdx
    And buildCorpus() with no lang uses en.mdx

  Scenario: Lead is bounded
    Given a post whose prose exceeds 300 words
    When its Document is built
    Then lead contains the first prose paragraphs up to 300 words, markup stripped, imports and export lines excluded

  Scenario: Hash covers every sibling
    Given a Document's sourceHash
    When only fi.mdx changes
    Then sourceHash changes
    And it also changes when meta.json, sv.mdx or en.mdx changes
    And it is byte-identical across two runs with no change

  Scenario: Future-dated documents are included
    Given a post whose publishDate is after today
    When buildCorpus() runs
    Then the post is present with its publishDate, so callers can filter

Feature: Eval gate

  Scenario: Tag eval
    Given the corpus and the 35 tags in src/content/tags
    When `npm run jev:eval -- --task tags --lang en` runs
    Then for each post one request carries the Document as state and one noul question per tag
    And each question's instructions use the tag's English name and first English description paragraph
    And a tag counts as predicted when its noul probability is ≥ 0.5
    And stdout shows micro precision, recall and F1 against meta.json tags at thresholds 0.5 and 0.7
    And stdout shows pillar-tag accuracy (predicted pillar set equals actual pillar set) for posts with id ≥ 43

  Scenario: Link eval
    Given the corpus
    When `npm run jev:eval -- --task links --lang fi` runs
    Then for each prose paragraph of each post one choice question is asked
    And the options are every other Document (title and description in English) plus "none"
    And the ground truth is the set of Documents the paragraph links to via /<lang>/blog/<id>/ or /<lang>/<newsletter segment>/<id>/
    And paragraphs without a ground-truth link are scored as "none" expected
    And stdout shows hit@1 and hit@3 over linked paragraphs and the false-positive rate over unlinked paragraphs (top choice ≠ none with p ≥ 0.5)

  Scenario: Language and sampling flags
    Given `--lang` in {en, fi, sv} and optional `--limit N`
    When the eval runs
    Then state text comes from the chosen locale while option labels stay English
    And only the first N posts by id are evaluated when --limit is given

  Scenario: Cost is visible
    Given any eval run
    When it finishes
    Then stdout shows request count, total input tokens and summed usage.cost in USD

  Scenario: Report file
    Given `--out <path>`
    When the eval finishes
    Then a JSON EvalReport is written to <path>
    And nothing is written when --out is absent

  Scenario: No key
    Given neither API key is set
    When `npm run jev:eval` runs
    Then it prints the skipped notice, makes no request and exits 0

Feature: Isolation

  Scenario: Build stays offline
    Given no Jev key in the environment
    When `npm run build` runs
    Then it succeeds and never imports scripts/jev/*

  Scenario: Tests stay offline
    Given `npm run test`
    When the jev spec files run
    Then no request leaves the process (fetch is injected or stubbed)
```

---

## Data Model

```typescript
// scripts/jev/client.ts
export type QuestionSpec =
    | { type: 'choice'; instructions: string; criteria: Record<string, string> } // ≤255 keys
    | { type: 'score'; instructions: string; criteria: string[] }                // ordered levels
    | { type: 'noul'; instructions: string }

export interface SystemOneRequest {
    model: string
    state: string | Record<string, unknown> | string[]
    questions: Record<string, QuestionSpec>
}

export type Answer =
    | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
    | { type: 'score'; score: string; probabilities: Record<string, number>; confidence: number }
    | { type: 'noul'; noul: number }

export interface SystemOneResponse {
    id: string
    model: string            // e.g. 'typesafe/jev-1.13-20260917'
    answers: Record<string, Answer>
    usage: { input_tokens: number; output_tokens: number; cost?: number }
}

export interface Provider {
    name: 'typesafe' | 'openrouter'
    baseUrl: string          // 'https://api.typesafe.ai' | 'https://openrouter.ai/api'
    model: string            // 'jev-1.13.0' | 'jev-1.13'
    apiKey: string
}

export function resolveProvider(env: NodeJS.ProcessEnv): Provider | null
export function createClient(provider: Provider, fetchImpl?: typeof fetch): {
    ask(state: SystemOneRequest['state'], questions: Record<string, QuestionSpec>): Promise<SystemOneResponse>
}

// scripts/jev/corpus.ts
export type DocKey = `post:${number}` | `newsletter:${number}`
export type Lang = 'en' | 'fi' | 'sv'

export interface Document {
    key: DocKey
    kind: 'post' | 'newsletter'
    id: number
    lang: Lang               // locale the text fields were taken from
    title: string
    description: string
    h2s: string[]
    lead: string             // first prose paragraphs, ≤ 300 words, markup stripped
    paragraphs: string[]     // all prose paragraphs, markup kept (link eval needs the hrefs)
    tags: string[]           // [] for newsletters
    publishDate: string      // ISO date
    sourceHash: string       // sha256 over meta.json + fi.mdx + sv.mdx + en.mdx, hex
}

export function buildCorpus(opts?: { lang?: Lang; root?: string }): Document[]
export function stateFor(doc: Document): Record<string, string>   // title, description, h2s, lead
export function labelFor(doc: Document): string                    // "<title> — <description>", English

// scripts/jev/eval.ts
export interface EvalReport {
    task: 'tags' | 'links'
    lang: Lang
    model: string
    posts: number
    requests: number
    inputTokens: number
    costUsd: number
    metrics: Record<string, number>   // tags: precision@0.5, recall@0.5, f1@0.5, precision@0.7, …, pillarAccuracy
                                      // links: hit@1, hit@3, falsePositiveRate, linkedParagraphs, unlinkedParagraphs
    perPost: Array<{ key: DocKey; expected: string[]; predicted: string[] }>
}
```

Environment:

| Variable | Effect |
|---|---|
| `TYPESAFE_API_KEY` | direct provider, model `jev-1.13.0`, 64k context |
| `OPENROUTER_API_KEY` | OpenRouter provider, model `jev-1.13`, 32k context |
| neither | scripts skip with exit 0 |

Scripts run as `node --env-file-if-exists=.env --experimental-strip-types scripts/jev/eval.ts`.

Constants: `LEAD_WORD_MAX = 300`, `CHOICE_OPTION_MAX = 255`, `RETRY_MAX = 3`, `RETRY_BASE_MS = 500`, `PREDICT_THRESHOLD = 0.5`.

---

## Dependencies

- `scripts/checks/mdx-deep.ts` — reuse `splitMdx`, `fmField`, `stripMarkup`, `proseParagraphs`; do not re-implement MDX parsing
- `scripts/lib/read-json-field.mjs` / `meta.json` — post id, tags, publishDate
- `src/content/tags/*.ts` — English names and descriptions for tag questions; pillar set is the five ids checked in `scripts/checks/content.sh:181-200`
- `src/lib/newsletterRoutes.ts` `NEWSLETTER_SEGMENTS` — link ground truth for newsletter URLs
- [Tag taxonomy](../tags/spec.md) — tag ids are the ground truth labels
- [Newsletter archive](../newsletter/archive.md) — newsletters are tagless and a separate collection; they are corpus members but excluded from the tag eval
- [Scheduled publishing](../posts/scheduled-publishing.md) — future-dated documents exist on disk; callers filter by publishDate

---

## Anti-patterns

- **Do not** import `src/lib/posts.ts` or `astro:content` from `scripts/jev/*` — Astro's content layer is not available in a plain Node process (see the freshness spec)
- **Do not** pass Finnish tag names or descriptions as question criteria — option labels stay English; only the `state` changes with `--lang`
- **Do not** send whole MDX bodies as state — accuracy drops with unrelated material and OpenRouter caps the request at 32k tokens; send `stateFor(doc)`
- **Do not** call the client from unit tests — inject `fetchImpl`
- **Do not** add `jev:eval` to lint-staged, `main.yml` or the build — it is a manual, paid, non-deterministic script
- **Do not** compare probabilities for equality across runs — Jev output drifts; metrics are aggregate
- **Do not** hash only `en.mdx` — Finnish is the source language and most edits land there first

---

## Eval results

_Filled in by the Builder after running the gate. Thresholds proposed in the plan: proceed per task and language where the primary metric is ≥ 0.6 on `en`; record `fi` and `sv` for the suggestion phases._

| Task | Lang | Primary metric | Value | Requests | Cost USD | Go |
|---|---|---|---|---|---|---|
| tags | en | f1@0.5 | | | | |
| tags | fi | f1@0.5 | | | | |
| links | en | hit@3 | | | | |
| links | fi | hit@3 | | | | |

---

## Open Questions

- [ ] Go/no-go thresholds (0.6 proposed) — confirm with the author once the first numbers exist

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Initial draft for #1486; OpenRouter transport smoke-tested (200, 540 ms, $0.000024) |
