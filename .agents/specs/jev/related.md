# Spec: Ranked related posts (related.json)

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-23

---

## Intent

Every post page ends with three "other posts" and every newsletter issue with three "other issues". Today the post block is ordered by the number of shared tags with recency as the tie-break, and the newsletter block by recency alone. With 34 tags, five of them broad pillar tags, most posts tie on one shared tag and the block degrades to "the three newest posts with the same pillar". Newsletters, which carry no tags by design, can never be related to anything.

This feature replaces that ordering with a ranking Jev computes once per document and that is committed to the repository as `src/content/related.json`. For each post and newsletter, Jev is asked one `choice` question — which of all the other documents is the best next read — and the answer's probability distribution is stored. The eval gate (`.agents/specs/jev/spec.md`) measured this question shape at hit@3 0.85–0.87 against a 0.36 baseline, so the ranking is trusted enough to render.

The build never calls Jev: it reads the committed file, keeps only documents that are published at build time, and falls back to the tag-overlap order for any document without an entry. A staleness check keeps the file honest — it fails pre-commit and CI when a post or newsletter was added, edited or deleted without regenerating — so the ranking is a permanent step of publishing, not a one-off.

---

## Scope

### In scope
- `scripts/generate-related.ts` + `npm run generate:related` — asks Jev and writes `src/content/related.json`; incremental by source hash, full re-ask when the candidate set changes, output stabilised so an unchanged ranking produces no diff
- `scripts/checks/related-stale.ts` + `npm run check:related` — offline check that the file matches the content on disk; wired into lint-staged and the CI Validate content job
- `src/lib/related.ts` — reads the file at build and exposes ranked ids per kind
- `src/lib/posts.ts` `filterExcerptPosts` and `src/lib/newsletters.ts` `filterNewsletters` — optional `rankedIds` ordering with the existing order as fallback
- `src/components/ExcerptList.astro`, `src/components/newsletter/NewsletterList.astro` — pass-through `rankedIds` prop
- `src/layouts/PostLayout.astro`, `src/layouts/NewsletterLayout.astro` — feed ranked ids from `related.ts`
- Unit tests for every pure function; one e2e golden regeneration (post 10's aria snapshot lists the three related links)
- `ARCHITECTURE.md` note; `.agents/specs/newsletter/archive.md` note on the ranked "other issues" block

### Out of scope
- Newsletters as candidates on post pages, or posts on newsletter pages — needs a rendering decision (issues have no hero image); the data already carries both kinds
- CI auto-commit of `related.json` (the `commit-baselines.ts` pattern) — regeneration is author-run and gated by the check
- Tag, link and FAQ suggestion scripts — later phases
- Any Jev call at build time, in pre-commit or in CI; any npm dependency
- Changing what the related blocks look like — only their order changes

---

## Contract

```gherkin
Feature: Generating related.json

  Scenario: First generation
    Given no src/content/related.json and a key in the environment
    When `npm run generate:related` runs
    Then one request per post and newsletter is sent, each a single choice question over every other document
    And the file is written with model, generatedAt, candidateSetHash and one entry per document
    And each entry holds its sourceHash and up to 10 ranked { key, p } items, p rounded to 2 decimals, ordered by p desc then publishDate desc then id desc

  Scenario: Question shape
    Given a document A
    When its request is built
    Then the state is stateFor(A) from the English corpus
    And the question is a choice whose criteria map every other document key to labelFor(doc) from the English corpus
    And there is no "none" option

  Scenario: Unchanged content sends nothing
    Given related.json whose candidateSetHash matches the documents on disk
    And every entry's sourceHash matches its document
    When `npm run generate:related` runs
    Then no request is sent
    And the file is byte-identical afterwards

  Scenario: Edited document is re-asked alone
    Given related.json in sync
    When fi.mdx of post 57 changes and `npm run generate:related` runs
    Then exactly one request is sent, for post:57
    And only the post:57 entry may change

  Scenario: New or deleted document re-asks everything
    Given related.json in sync
    When a post directory is added or removed and `npm run generate:related` runs
    Then candidateSetHash changes and one request per remaining document is sent
    And entries for removed documents are dropped

  Scenario: Stable output
    Given an entry whose fresh answer has the same top-3 keys in the same order as the stored ranked list
    When the file is written
    Then the stored ranked list is kept as is and only sourceHash is updated
    And `git diff src/content/related.json` after a second run with no content change is empty

  Scenario: Changed top three is rewritten
    Given an entry whose fresh answer differs from the stored top-3 keys or their order
    When the file is written
    Then the entry's ranked list is replaced by the fresh top 10

  Scenario: Force
    Given `--force`
    When the generator runs
    Then every document is re-asked regardless of hashes, and the stabilisation rule still applies

  Scenario: No key
    Given neither OPENROUTER_API_KEY nor TYPESAFE_API_KEY is set
    When `npm run generate:related` runs
    Then it prints the skipped notice and exits 1, because a regeneration was requested and could not happen

  Scenario: Deterministic file
    Given any generation
    When the file is written
    Then entries are sorted by key, ranked items keep their order, the JSON is 2-space indented with a trailing newline

Feature: Staleness check

  Scenario: In sync
    Given related.json matching the content on disk
    When `npm run check:related` runs
    Then it exits 0 and makes no network call

  Scenario: Missing file
    Given no related.json
    When the check runs
    Then it exits 1 and names `npm run generate:related`

  Scenario: Missing entry
    Given a post or newsletter directory with no entry
    When the check runs
    Then it exits 1 naming the key

  Scenario: Stale entry
    Given an entry whose sourceHash differs from the document's hash
    When the check runs
    Then it exits 1 naming the key

  Scenario: Candidate set drift
    Given a candidateSetHash that differs from the hash of the document keys on disk
    When the check runs
    Then it exits 1 saying the candidate set changed

  Scenario: Dangling keys
    Given an entry for a document that no longer exists, or a ranked key that no longer exists
    When the check runs
    Then it exits 1 naming the dangling key

  Scenario: Model drift
    Given a file whose model does not start with the generator's MODEL_PREFIX
    When the check runs
    Then it exits 1 asking for a full regeneration

  Scenario: Hooks and CI
    Given a staged change under src/content/posts or src/content/newsletters
    When the pre-commit hook runs
    Then `check:related` runs and blocks the commit while the file is stale
    And the Validate content job in main.yml runs the same check

Feature: Rendering

  Scenario: Ranked post block
    Given related.json has an entry for post:57 whose ranked posts are 71, 76, 12 and a newsletter
    And posts 71, 76 and 12 are published
    When /fi/blog/57/… renders
    Then the "other posts" block lists 71, 76, 12 in that order

  Scenario: Unpublished candidates are skipped
    Given post:57's ranked list starts with a future-dated post
    When a production build renders the page
    Then that post is absent and the next ranked published post takes its place
    And under `astro dev` the future-dated post is shown, as everywhere else

  Scenario: Ranked list shorter than the block
    Given only two ranked posts are published
    When the block renders with limit 3
    Then the third slot is filled by the tag-overlap order over the remaining posts

  Scenario: No entry falls back
    Given a post with no entry in related.json
    When the page renders
    Then the block is ordered exactly as before this feature (shared-tag count, then date)

  Scenario: Ranked newsletter block
    Given related.json has an entry for newsletter:2 whose ranked newsletters are 7, 4, 9
    When /fi/uutiskirje/2/… renders
    Then the "other issues" block lists 7, 4, 9; an issue without an entry keeps the recency order

  Scenario: Same order in every locale
    Given post:57's entry
    When the fi, sv and en pages render
    Then all three list the same post ids in the same order

  Scenario: Build stays offline
    Given no Jev key in the environment
    When `npm run build` runs
    Then it succeeds and nothing under src/ imports scripts/jev
```

---

## Data Model

```typescript
// src/content/related.json
interface RelatedFile {
    candidateSetHash: string                     // sha256 over the sorted document keys
    entries: Record<DocKey, RelatedEntry>        // keys sorted
    generatedAt: string                          // ISO date of the last write
    model: string                                // e.g. 'typesafe/jev-1.13-20260917'
}

interface RelatedEntry {
    ranked: Array<{ key: DocKey; p: number }>    // ≤ 10, p rounded to 2 decimals, self excluded
    sourceHash: string                           // Document.sourceHash at generation time
}

// scripts/generate-related.ts
export const MODEL_PREFIX = 'typesafe/jev-1.13'   // check:related compares against this
export const RANKED_MAX = 10
export const STABLE_TOP = 3
export function candidateSetHash(keys: DocKey[]): string
export function rankAnswer(probabilities: Record<string, number>, docs: Map<DocKey, Document>): RelatedEntry['ranked']
export function mergeEntry(previous: RelatedEntry | undefined, fresh: RelatedEntry): RelatedEntry  // stabilisation rule
export function planRequests(file: RelatedFile | null, corpus: Document[], force: boolean): DocKey[]

// scripts/checks/related-stale.ts
export function findStale(file: RelatedFile | null, corpus: Document[]): string[]   // [] means in sync

// src/lib/related.ts
export function rankedKeys(key: DocKey, file?: RelatedFile): DocKey[]
export function relatedPostIds(id: number, file?: RelatedFile): number[]           // post keys only
export function relatedNewsletterIds(id: number, file?: RelatedFile): number[]     // newsletter keys only
```

`filterExcerptPosts(posts, q)` gains `q.rankedIds?: number[]`: posts whose id is in `rankedIds` come first in that order, the rest follow in the existing order (`sortByRelatedTags` when `relatedTags` is given, else date). `filterNewsletters` gains the same field with recency as the rest-order. Both functions stay pure and fixture-tested.

Request shape: `state = stateFor(doc)`, `questions = { next_read: { type: 'choice', instructions: 'Which of these is the best next read for someone who has just finished this article?', criteria: { [otherKey]: labelFor(other) } } }`. Concurrency 4, retries from the client. Expected full regeneration: 87 requests, roughly 350k tokens, $0.015.

---

## Dependencies

- [Jev decision pipeline](./spec.md) — `scripts/jev/client.ts` (provider, retries), `scripts/jev/corpus.ts` (`buildCorpus`, `stateFor`, `labelFor`, `sourceHash`); the eval result that justifies rendering
- `src/lib/posts.ts`, `src/lib/newsletters.ts` — build-time filtering already excludes future-dated documents except under `astro dev`, so `related.ts` never needs date logic
- [Scheduled publishing](../posts/scheduled-publishing.md) — future-dated documents are in the file; the build filter hides them until due, so the nightly job needs no regeneration
- [Newsletter archive](../newsletter/archive.md) — newsletters are tagless; ranked ids replace recency in their block
- `.lintstagedrc.mjs`, `.github/workflows/main.yml` Validate content — where the check runs
- `tests/e2e/blogPostPage.spec.ts` aria snapshots — list the three related links of post 10; regenerate via the Update baselines workflow

---

## Anti-patterns

- **Do not** import `related.json` through a content collection or `astro:content` — it is a plain JSON import in `src/lib/related.ts`; the collection loaders match only `*/{fi,sv,en}.mdx`
- **Do not** filter by date in `related.ts` — `getAllPosts()` and `getAllNewsletters()` already apply the publish filter and dev exception; duplicating it drifts
- **Do not** rewrite an entry whose top three did not change — Jev probabilities drift between runs and every rewrite is diff noise plus a golden regeneration
- **Do not** call Jev from `check:related`, the build, or CI — the check is a hash compare; the generator is the only network user
- **Do not** add a "none" option to the ranking question — every document has a best next read
- **Do not** let the generator swallow a failed request and write a partial file — abort and leave the previous file intact
- **Do not** regenerate in the nightly scheduled-publish job — the file already contains future documents

---

## Open Questions

*(none)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Initial draft for #1487 |
