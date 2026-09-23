# Spec: Advisory tag suggestions and tag retro-scan

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-23

---

## Intent

Tags are assigned from memory when a post is written, and a new tag is never applied backwards: the 34 tags in `src/content/tags/` grew over years, and a post from 2024 carries only the tags that existed then. The eval gate measured Jev's tag decisions at microF1 0.46 against a 0.35 baseline — under the 0.6 threshold as a whole, but the per-tag rows split cleanly: topical tags (immigration, infrastructure, digitalisation, artificial-intelligence) are reliable, while election-cycle tags and the five broad pillar tags are editorial choices a text does not announce.

This feature is an author-run, advisory script with two modes. **Per post**: which tags the post could carry and does not, which assigned tags Jev doubts, and the five pillar tags with their probabilities shown separately, so the author decides with the numbers in view. **Per tag**: when a tag is added or edited, which existing posts should carry it — the retro-scan nobody does by hand. The per-post mode becomes a step of `/write` and `/review-content`; the retro-scan is enforced the way link suggestions are: a receipt proves it ran on the current tag file, and the existing suggestions gate refuses a commit or pull request that adds or edits a tag file without one. `meta.json` is never written by the script and `content.sh`'s tag and pillar rules stay the only enforced tag rules.

---

## Scope

### In scope
- `scripts/jev/tags.ts` — shared, network-free helpers lifted out of the eval (`loadTagLabels`, `tagQuestions`, `predictedAt`) plus partitioning of an answer into consider / doubtful / pillar, the editorial-tag exclusion, tag ids from staged paths, and Markdown rendering; no CLI
- `scripts/suggest-tags.ts` + `npm run suggest:tags` — per-post mode and `--tag <id>` retro-scan mode; `--changed-since <ref>` for both kinds of changed files
- `scripts/jev/suggestions.ts` — a third receipt kind `tags`, keyed by tag id, hashed over the tag file; missing kinds in an existing `suggestions.json` read as empty
- `scripts/checks/suggestions-stale.ts` — changed `src/content/tags/<id>.ts` files require a matching `tags` receipt; `--base` mode diffs `src/content/tags` too
- `.lintstagedrc.mjs` — the tags rule runs the suggestions check with the staged tag files
- `.claude/skills/write/SKILL.md`, `.claude/skills/review-content/SKILL.md` — a "Tag suggestions" step
- `scripts/jev/eval.ts` — imports the lifted helpers (behaviour unchanged)
- Unit tests for every pure helper and for the CLI with an injected client; no network in tests
- `ARCHITECTURE.md` paragraph; issue #1491 body updated to the receipt design

### Out of scope
- Writing `meta.json` or any gate on Jev's per-post answer — tags stay a human decision (eval: F1 0.46 en / 0.47 fi / 0.40 sv)
- A receipt for the per-post mode — it is a writing aid, not a publishing step; the pillar rule in `content.sh` is the gate on new posts
- Tagging newsletters — the archive spec forbids tags unless category pages list issues (own issue, paired with category-page inclusion)
- New tags or taxonomy changes; suggesting tags that do not exist
- Link and FAQ suggestions (#1490 done, #1492); any Jev call at build time; any npm dependency

---

## Contract

```gherkin
Feature: Per-post tag suggestions

  Scenario: Suggestions for a post
    Given a key and post 57
    When `npm run suggest:tags -- post 57` runs
    Then one request is sent with stateFor(post 57 from the fi corpus) as state and one noul per tag file in src/content/tags (types.ts excluded)
    And each question's instructions use the tag's English name and first English description paragraph
    And stdout shows the assigned tags, then three Markdown tables:
      "consider": tags not assigned with p ≥ 0.7, sorted by p desc, columns tag, p
      "doubtful": assigned tags with p < 0.2, columns tag, p
      "pillar": the five pillar tags with p and an "assigned" mark, in fixed order
    And editorial tags never appear under consider or doubtful; they are listed once as "not suggested: <ids>"
    And "no tags to consider" / "no doubtful tags" replaces an empty table

  Scenario: Locale and threshold flags
    Given `--lang en --consider 0.8 --doubtful 0.1`
    When the script runs
    Then the state comes from en.mdx and the two thresholds apply; labels stay English in every case

  Scenario: Several posts
    Given `post 57 post 71`
    When the script runs
    Then one section per post, in the given order

Feature: Tag retro-scan

  Scenario: Retro-scan for a tag
    Given `--tag immigration`, a tag file that is imported in src/content/tags.ts
    When the script runs
    Then one request per post is sent (posts only, newsletters never; scheduled posts included, since they will need the tag when they go live), each with stateFor(post) as state and the single noul for that tag
    And stdout shows a Markdown table of posts that lack the tag with p ≥ 0.7, newest first, columns post, title, publishDate, p, current tags
    And posts that already carry the tag are counted on one line, not listed
    And a receipt tags[<id>] = { checkedAt, contentHash: sha256 over src/content/tags/<id>.ts, model } is written to src/content/suggestions.json

  Scenario: Unknown tag
    Given `--tag no-such-tag`
    When the script runs
    Then it prints "tag no-such-tag not found" and exits 2

  Scenario: Unregistered tag file
    Given src/content/tags/<id>.ts exists but src/content/tags.ts does not import it
    When `--tag <id>` runs
    Then it prints "tag <id> is not registered in src/content/tags.ts" and exits 2 without a request or a receipt — a scan of a tag that produces no category page proves nothing

  Scenario: Malformed tag file
    Given a tag file with no LocalTag export or without names.en / descriptions.en
    When any mode loads the tag labels
    Then it prints the file name and the missing field and exits 1

  Scenario: Editorial tag
    Given `--tag municipal-elections-2025`
    When the script runs
    Then it scans and records the receipt anyway, prefixed by a notice that the tag is editorial and Jev's recall on such tags was 0.08–0.28 in the eval

Feature: Gate and skills

  Scenario: Changed tag file needs a receipt
    Given a staged or changed src/content/tags/<id>.ts
    When check:suggestions runs (pre-commit with the staged files, CI with --base)
    Then tags[<id>].contentHash must equal the current hash of that file
    And a missing or stale receipt exits 1 naming `npm run suggest:tags -- --tag <id>`
    And types.ts is ignored
    And the gate trusts the receipt: it compares hashes and does not re-check registration (receipts are committed and reviewed like any change)

  Scenario: Old receipts file
    Given a suggestions.json written before the tags kind existed
    When it is read
    Then readReceipts fills every absent kind with {} and rejects only a kind that is present and malformed, so the links gate keeps working unchanged
    And serializeReceipts writes all three kinds in fixed order (backlinks, links, tags), so the next write adds the kind

  Scenario: Post without prose
    Given a post whose body yields no prose paragraphs
    When per-post mode runs
    Then the request is still sent (title and description are enough state) and the section is rendered as usual

  Scenario: Changed documents and tags from git
    Given `--changed-since origin/main`
    When the script runs
    Then it runs per-post mode for changed posts and retro-scan mode for changed tag files, in that order, honouring --lang and the thresholds in both
    And prints "no content changes" and exits 0 when neither exists

  Scenario: Skills
    Given /write or /review-content is run on a post
    Then the skill instructs running `npm run suggest:tags -- post <id>`, deciding per row, editing meta.json by hand, and that the pillar rule in content.sh remains the gate

Feature: Common behaviour

  Scenario: No key
    Given neither key is set
    When any mode runs
    Then it prints the skipped notice and exits 0

  Scenario: Bad arguments
    Given an unknown kind, a non-numeric id, an unknown lang, a threshold outside (0, 1], `--tag` together with positionals, or a non-positive-integer concurrency
    When the script runs
    Then it prints the usage line and exits 2

  Scenario: Unknown post
    Given `post 999`
    When the script runs
    Then it prints "post:999 not found" and exits 2

  Scenario: Failed request
    Given a request that fails after the client's retries
    When the script runs
    Then it prints the sections completed so far, then "failed at <where>: <error>", writes --out when given, keeps receipts of completed retro-scans, and exits 1

  Scenario: Eval unchanged
    Given the lifted helpers
    When `npm run test` runs
    Then the eval's tag tests still pass against the shared module
```

---

## Data Model

```typescript
// scripts/jev/tags.ts — shared library, no CLI. Moved here from eval.ts (which imports them back):
//   loadTagLabels, tagQuestions, predictedAt, TagLabel
export const CONSIDER_THRESHOLD = 0.7      // provisional; in the eval log precision rose and recall fell from 0.5 to 0.7, and a suggestion list wants precision
export const DOUBTFUL_THRESHOLD = 0.2      // provisional
export const PILLAR_TAGS = ['artificial-intelligence', 'digital-independence', 'economy', 'culture-and-education', 'freedom']  // as content.sh:183
// Measured (eval recall 0.08–0.28): municipal-elections-2025, parliamentary-elections-2027, regional-elections-2025.
// By judgment (same nature, too few posts to measure): coop-elections, council-motion, green-party, marketgreen, regional-elections-2022.
export const EDITORIAL_TAGS = ['coop-elections', 'council-motion', 'green-party', 'marketgreen', 'municipal-elections-2025', 'parliamentary-elections-2027', 'regional-elections-2022', 'regional-elections-2025']
export interface TagPartition { consider: Array<{ id: string; p: number }>; doubtful: Array<{ id: string; p: number }>; pillar: Array<{ assigned: boolean; id: string; p: number }> }
export function partition(probabilities: Record<string, number>, assigned: string[], opts: { consider: number; doubtful: number }): TagPartition
export function tagIdsFromPaths(paths: string[]): string[]                   // src/content/tags/<id>.ts → ids, types.ts excluded, unique
export function hashTagFile(id: string, dir?: string): string                // sha256 over the file, hex
export function registeredTagIds(registry?: string): Set<string>             // ids from the `from './tags/<id>'` import lines of src/content/tags.ts

// scripts/jev/suggestions.ts (change)
export type ReceiptKind = 'links' | 'backlinks' | 'tags'                     // tags keyed by tag id, not DocKey
export function readReceipts(path): ReceiptsFile | null                      // absent kinds become {}; null only for a missing file, unparseable JSON, or a present kind that is malformed
export function loadTagLabels(dir?): Promise<TagLabel[]>                     // (in tags.ts) throws a descriptive error on a file without a LocalTag export or names.en / descriptions.en
export interface ChangedTag { hash: string; id: string }
export function recordTagReceipt(file, tag: ChangedTag, model, checkedAt): void
export function findUnchecked(file, changed: Document[], changedTags?: ChangedTag[]): string[]

// scripts/checks/suggestions-stale.ts (change)
export function changedTags(paths: string[], tagsDir: string): ChangedTag[]  // existing src/content/tags/<id>.ts files with their current hash; deleted files skipped

// scripts/suggest-tags.ts — CLI
//   suggest:tags -- post <id>… [--lang fi|sv|en] [--consider 0.7] [--doubtful 0.2] [--concurrency 4] [--out <md>]
//   suggest:tags -- --tag <id> [--lang] [--consider] [--concurrency] [--out]
//   suggest:tags -- --changed-since <ref> [same flags]
export async function runTags(argv: string[], env: NodeJS.ProcessEnv, deps?: { client?; git?; log?; receipts?; root?; tagsDir?; today? }): Promise<number>
```

Requests: per-post mode is one request of ~3k tokens per post (34 nouls) ≈ $0.0001; a retro-scan is one request per post, ≈ 78 requests ≈ $0.01. The `lang` default is `fi`, as for links (the issue said English; the eval measured fi and en within 0.01 F1 of each other, and fi is the text the author is editing).

Registration: `src/content/tags.ts` is the taxonomy's single source of truth (tags spec), but it imports its files without extensions, which Node's strip-types loader cannot resolve. `registeredTagIds()` therefore parses the import lines of `tags.ts` for `./tags/<id>` and treats that set as the registry; a tag file outside it is refused.

Receipt semantics: the `tags` receipt says "the retro-scan ran against this version of the tag file". Editing a tag's English description changes the question, so the hash covers the whole file. Posts added after the scan are not covered by it — that is the per-post mode's job when the post is written.

---

## Dependencies

- [Jev decision pipeline](./spec.md) — client, corpus, the eval whose tag helpers move to `tags.ts`; eval per-tag rows behind the thresholds and the editorial list
- [Link suggestions](./links.md) — receipts, the suggestions gate, CLI conventions (exit codes, `--changed-since`, `--out`, failure output)
- [Tag taxonomy](../tags/spec.md) — `src/content/tags/*.ts` shape (`names.en`, `descriptions.en[0]`), ids never change
- `scripts/checks/content.sh:142-201` — tag validity and the pillar rule, unchanged
- [Newsletter archive](../newsletter/archive.md) — newsletters are tagless; the script only ever considers posts

---

## Anti-patterns

- **Do not** write `meta.json` from the script or gate on the per-post answer — the eval's overall F1 is under the threshold; the human decides
- **Do not** suggest editorial tags — election cycles, motions and party networks are facts about the post's occasion, not its text; the eval recall was 0.08–0.28
- **Do not** put the pillar tags in the consider table — they are shown separately with their probabilities because the author must pick at least one whatever Jev says
- **Do not** send Finnish tag names or descriptions as question criteria — labels come from the English tag fields in every mode
- **Do not** make an old `suggestions.json` malformed by adding a kind — missing kinds read as empty
- **Do not** call Jev from the check, the hook or CI — the gate is a hash comparison, as for links

---

## Calibration runs

2026-09-23, model `typesafe/jev-1.13-20260917` via OpenRouter, thresholds at their provisional values, state in fi.

- `suggest:tags -- post 57` (assigned: artificial-intelligence, digitalisation, enlightenment, economy): consider lists technology at 0.75 only; no doubtful tags (digitalisation and enlightenment stay above 0.2); pillar shows artificial-intelligence 0.86 ✓, economy 0.61 ✓, digital-independence 0.04, culture-and-education 0.09, freedom 0.07. Consistent with the eval: topical tags separate, the pillar decision is the author's. Thresholds kept.
- `--tag immigration` (78 posts, 69 requests, 9 already tagged): one candidate, post 14 (2023, kirkkonummi only) at 0.85; every other untagged post stayed under 0.7. The receipt for the current tag file is committed with this spec.

---

## Open Questions

*(none)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Implemented; calibration runs on post 57 and the immigration tag recorded, data model aligned with the code (hashTagFile argument order, ChangedTag, changedTags) |
| 2026-09-23 | Critic review (PASS WITH NOTES): readReceipts fills absent kinds, unregistered and malformed tag files, posts-only scan incl. scheduled, post without prose, editorial list split into measured and judged, lang default explained, issue checkboxes rewritten |
| 2026-09-23 | Initial draft for #1491; retro-scan gated by a tags receipt instead of a lint-staged print (lint-staged hides output of passing tasks) |
