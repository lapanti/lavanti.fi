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
    Then it retries up to 3 times with exponential backoff starting at 500 ms (sleep is injectable for tests)
    And after the last failure it throws an error naming the status and the question names
    And no error message or log line ever contains the API key

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
    And every Document carries title, description, h2s, lead, paragraphs, tags (empty for newsletters), publishDate and sourceHash
    And paragraphs are the prose paragraphs from proseParagraphs() with link markup intact


  Scenario: Locale selection
    Given a post with fi, sv and en siblings
    When buildCorpus({ lang: 'fi' }) runs
    Then title, description, h2s and lead come from fi.mdx
    And buildCorpus() with no lang uses en.mdx

  Scenario: Lead is bounded
    Given a post whose prose exceeds 300 words
    When its Document is built
    Then lead contains whole prose paragraphs, in order, while the cumulative word count stays ≤ 300, and always at least the first paragraph
    And lead has markup stripped, imports and export lines excluded

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

  Scenario: Default run
    Given a key is set
    When `npm run jev:eval` runs with no flags
    Then it runs task tags and task links for lang en and lang fi
    And prints one table with a row per task × lang, the primary metric, the baseline, requests and cost

  Scenario: Tag eval
    Given the corpus and the 34 tag files in src/content/tags (types.ts excluded)
    When `npm run jev:eval -- --task tags --lang en` runs
    Then for each post one request carries stateFor(doc) as state and one noul question per tag
    And each question's instructions use the tag's English name and first English description paragraph
    And a tag counts as predicted when its noul probability is ≥ PREDICT_THRESHOLD (0.5)
    And stdout shows micro and macro precision, recall and F1 against meta.json tags at thresholds 0.5 and 0.7 (macro averaged over tags with support)
    And stdout shows a per-tag row (support, precision, recall) so rare tags are visible
    And stdout shows the frequency baseline: F1 of always predicting the three most common tags
    And stdout shows pillar accuracy: share of posts with id ≥ 43 whose predicted pillar set at 0.5 equals the actual pillar set
      (stricter than content.sh, which only requires at least one pillar tag)

  Scenario: Link eval
    Given the corpus
    When `npm run jev:eval -- --task links --lang fi` runs
    Then for each prose paragraph of each post one request is sent
    And the state is { title: <post title>, paragraph: <paragraph text, markup stripped> }
    And the single choice question's options are every other Document as labelFor(doc) plus "none"
    And labels always come from the English corpus (buildCorpus() without lang), whatever --lang the state uses

  Scenario: Too many documents for one choice question
    Given 256 or more Documents in the corpus (255 leaves 254 others plus "none")
    When the link task builds its options
    Then it throws an error naming CHOICE_OPTION_MAX before any request is sent
    And the ground truth is the set of Documents the paragraph links to via /<lang>/blog/<id>/ or /<lang>/<newsletter segment>/<id>/, links to other pages ignored
    And over linked paragraphs stdout shows hit@1 and hit@3: the share where at least one expected Document is among the top k non-none options by probability
    And over unlinked paragraphs stdout shows the abstain rate: the share where "none" is the top option
    And stdout shows the popularity baseline: hit@3 of always predicting the three most-linked Documents
    And stdout shows the number of linked and unlinked paragraphs

  Scenario: Language, sampling and concurrency flags
    Given `--lang` in {en, fi, sv}, optional `--limit N` and optional `--concurrency C` (default 4)
    When the eval runs
    Then state text comes from the chosen locale while option labels stay English
    And only the first N posts by id are evaluated when --limit is given
    And at most C requests are in flight at once

  Scenario: Cost is visible
    Given any eval run
    When it finishes
    Then stdout shows request count, total input tokens and summed usage.cost in USD
    And the report never contains the API key or the Authorization header

  Scenario: Report file
    Given `--out <path>`
    When the eval finishes
    Then a JSON array with one EvalReport per task × lang is written to <path>
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
export function createClient(
    provider: Provider,
    deps?: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void> },
): {
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
export function labelFor(doc: Document): string                    // "<title> — <description>"; pass a Document from the English corpus

// scripts/jev/eval.ts
export interface EvalReport {
    task: 'tags' | 'links'
    lang: Lang
    model: string
    posts: number
    requests: number
    inputTokens: number
    costUsd: number
    metrics: Record<string, number>   // tags: microF1@0.5, macroF1@0.5, precision@0.5, recall@0.5, …@0.7, baselineF1, pillarAccuracy
                                      // links: hit@1, hit@3, abstainRate, baselineHit@3, linkedParagraphs, unlinkedParagraphs
    perTag?: Array<{ id: string; support: number; precision: number; recall: number }>
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

Constants: `LEAD_WORD_MAX = 300`, `CHOICE_OPTION_MAX = 255` (254 Documents + "none"), `RETRY_MAX = 3`, `RETRY_BASE_MS = 500`, `PREDICT_THRESHOLD = 0.5`, `CONCURRENCY_DEFAULT = 4`.

Cost and time expectations (OpenRouter, 2026-09-23 smoke call: 579 tokens = $0.000024, 540 ms): tag eval ≈ 78 requests per language, well under $0.01; link eval ≈ 1,200 paragraph requests × ~5k tokens per language ≈ $0.30 and about 3 minutes at concurrency 4.

---

## Dependencies

- `scripts/checks/mdx-deep.ts` — reuse `splitMdx`, `fmField`, `stripMarkup`, `proseParagraphs` (CLI-guarded by `isMain`, safe to import); relative imports need the `.ts` extension under `--experimental-strip-types`; do not re-implement MDX parsing
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
- **Do not** send whole MDX bodies as state — accuracy drops with unrelated material and OpenRouter caps the request at 32k tokens; send `stateFor(doc)` for document-level questions and `{ title, paragraph }` for paragraph-level ones
- **Do not** batch several paragraphs' choice questions into one request — each carries ~88 options, and the request budget is shared by state and all questions
- **Do not** read the eval numbers without the baselines — 34 labels at ~3.4 per post and a link graph dominated by two posts make raw F1 and hit@k look better or worse than they are
- **Do not** call the client from unit tests — inject `fetchImpl`
- **Do not** add `jev:eval` to lint-staged, `main.yml` or the build — it is a manual, paid, non-deterministic script
- **Do not** compare probabilities for equality across runs — Jev output drifts; metrics are aggregate
- **Do not** hash only `en.mdx` — Finnish is the source language and most edits land there first

---

## Eval results

_Filled in by the Builder after running the gate. Thresholds proposed in the plan: proceed per task and language where the primary metric is ≥ 0.6 on `en` and clearly above its baseline; record `fi` and `sv` for the suggestion phases. For tags, recall matters more than precision: the ground truth was assigned from memory, so a "false positive" may be a tag the author missed._

Run 2026-09-23, model `typesafe/jev-1.13-20260917` via OpenRouter, 78 posts, concurrency 8, total cost $0.32.

| Task | Lang | Primary metric | Value | Baseline | Requests | Cost USD | Go |
|---|---|---|---|---|---|---|---|
| tags | en | microF1@0.5 | 0.467 | 0.352 | 78 | 0.008 | advisory only |
| tags | fi | microF1@0.5 | 0.460 | 0.352 | 78 | 0.010 | advisory only |
| links | en | hit@3 | 0.841 | 0.364 | 795 | 0.152 | go |
| links | fi | hit@3 | 0.850 | 0.364 | 793 | 0.153 | go |

Secondary numbers: tags en precision/recall 0.435/0.504 at 0.5, macroF1 0.512, pillar set accuracy 0.222 (36 posts); links en hit@1 0.692, abstain rate 0.740 over 688 unlinked paragraphs; fi within 0.02 of en on every metric.

Reading:

- **Links (go).** Given a paragraph, Jev puts a human-chosen target in its top 3 for 84–85% of linked paragraphs, against 36% for always suggesting the three most-linked posts. This is the same question shape as related-post ranking (a `choice` over every other document), so it also clears #1487.
- **Tags (advisory only).** Above baseline but under the 0.6 threshold. The per-tag rows explain why: topical tags are reliable (immigration 0.80/0.89 precision/recall, infrastructure 0.67/0.89, digitalisation 0.57/0.89, transportation 0.67/0.80, artificial-intelligence 0.80/0.67), while tags the text never announces are not — election-cycle tags (regional-elections-2025 recall 0.08, municipal-elections-2025 0.28, parliamentary-elections-2027 0.20) and the broad pillar tags (economy recall 0.16, digital-independence 0.22, culture-and-education precision 0.07). Those are editorial assignments the author makes from campaign context; a text classifier cannot recover them. Tag suggestions stay a suggestion, and the suggestion script should present topical tags and pillar tags separately.
- **Language.** Finnish state text performs as well as English on both tasks. Later phases may send the source-language text; computing on the English sibling is not required for accuracy.

---

## Open Questions

*(none — thresholds applied 2026-09-23: links clear 0.6 with a wide margin, tags do not and remain advisory)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Initial draft for #1486; OpenRouter transport smoke-tested (200, 540 ms, $0.000024) |
| 2026-09-23 | Eval gate run: links go (hit@3 0.84–0.85), tags advisory only (F1 0.46–0.47), fi ≈ en |
| 2026-09-23 | Critic re-review (PASS WITH NOTES): option-cap check moved to the link task; option labels always from the English corpus |
| 2026-09-23 | Critic review: define link-eval state and per-paragraph requests, hit@k and abstain rate, default run, 34 tags, baselines, `paragraphs` field, option cap failure, lead bound, injectable sleep, key never logged |
