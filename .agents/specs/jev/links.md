# Spec: Link suggestions and newsletter backlinks

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-23

---

## Intent

Internal links are found by rereading the corpus. Every post and issue must carry 3–10 of them (`scripts/checks/content.sh`), the newsletter archive policy wants links in both directions, and today no post links back to any issue (#1485) because nobody re-reads 78 posts when an issue is published. The eval gate measured Jev's per-paragraph link targeting at hit@3 0.85–0.87 against a 0.36 baseline, with Finnish input as good as English, so the *finding* half of the job can be delegated while the *writing* half — anchor text, placement in the sentence, the 3–10 budget — stays with the author.

This feature is an author-run, advisory script with two modes. **Per document**: for each paragraph of a post or issue, which other page on the site (post or issue) substantiates a claim made there, if any. **Backlinks**: for one newsletter issue, which paragraphs of which posts make a claim the issue substantiates — the automated form of the manual audit that produced the pair table in #1485, to be run whenever an issue is added. The script becomes a step of `/write` and `/review-content`, and an advisory CI job writes the same tables to the job summary of any pull request that touches content, so the suggestions appear without anyone remembering to ask. Nothing is enforced: the output is a table, not a gate.

---

## Scope

### In scope
- `scripts/jev/links.ts` — shared, network-free helpers lifted out of the eval (`linkTargets`, option building, paragraph state) plus suggestion-row shaping, doubtful-link detection, backlink question building, changed-document parsing and Markdown rendering; no CLI
- `scripts/suggest-links.ts` + `npm run suggest:links` — the CLI: per-document mode, backlink mode, `--changed-since <ref>` for CI
- `scripts/jev/corpus.ts` — `Document.slug` (per-locale frontmatter slug) so suggestions can print canonical URLs
- `scripts/jev/eval.ts` — imports the lifted helpers instead of defining them (behaviour unchanged)
- `.claude/skills/write/SKILL.md`, `.claude/skills/review-content/SKILL.md` — a "Link suggestions" step
- `.github/workflows/main.yml` — `content-suggestions` job, advisory, skipped without content changes or without the `OPENROUTER_API_KEY` secret
- Unit tests for every pure helper and for the CLI with an injected client; no network in tests
- `ARCHITECTURE.md` paragraph

### Out of scope
- Editing any post to add links (content work: #1485 for existing issues, `/write` for new ones)
- Anchor text, sentence placement, or any prose change — Jev returns typed decisions only
- A gate on missing or weak links; `content.sh` keeps the only enforced rule (3–10 links)
- PR comments from CI (a shared-state action; the job summary is the channel)
- Tag and FAQ suggestions (#1491, #1492); ranking for the related blocks (`related.md`)
- Any npm dependency; any Jev call at build time

---

## Contract

```gherkin
Feature: Per-document link suggestions

  Scenario: Suggestions for a post
    Given a key and post 57 with fi, sv and en siblings
    When `npm run suggest:links -- post 57` runs
    Then one choice request is sent per prose paragraph of fi.mdx
    And each state is { paragraph: <paragraph, markup stripped>, title: <fi title> }
    And the options are every other post and newsletter labelled from the English corpus, plus "none"
    And stdout shows a Markdown table with columns paragraph, starts, target, title, url, p, none
    And for each paragraph the rows are its top 3 options by p that are not "none", not the post itself, not already linked anywhere in the post's body (targets are id-keyed, so the locale of the existing link does not matter), and have p ≥ 0.1
    And "none" is that paragraph's probability of needing no link, so the author can weigh the row
    And rows with p ≥ 0.5 are marked ★ (the thresholds are provisional: the eval measured hit@k and abstain, not probability calibration; they are tuned by hand on the first runs and recorded in this spec)
    And the same target may appear under several paragraphs; the author places it once
    And target titles and urls are for the fi locale (/fi/blog/<id>/<slug>/ or /fi/uutiskirje/<id>/<slug>/)
    And the table is followed by "links now: N of 3–10", N counted with content.sh's regex (every `[text](/path)` link in the body)

  Scenario: Locale, threshold and concurrency flags
    Given `--lang en --threshold 0.7 --concurrency 2`
    When the script runs
    Then paragraphs, titles and urls come from en.mdx files, the ★ mark applies at p ≥ 0.7, and at most two requests are in flight

  Scenario: Suggestions for an issue
    Given `newsletter 2`
    When the script runs
    Then the same table is produced for the issue's paragraphs, with posts and other issues as candidates

  Scenario: Doubtful existing links
    Given a paragraph that already links a document whose option scores below 0.2
    When the script runs
    Then a second table "doubtful" lists paragraph, starts, current target and p

  Scenario: No suggestions
    Given every paragraph's options are "none", already linked or below the 0.1 floor
    When the script runs
    Then stdout says "no new link targets" and the doubtful table still appears when it has rows

  Scenario: Document without prose
    Given a document whose body yields no prose paragraphs
    When the script runs
    Then no request is sent, stdout says "no paragraphs" and the exit code is 0

  Scenario: Report file
    Given `--out <path>`
    When the script finishes
    Then the same Markdown is written to <path>; nothing is written otherwise

Feature: Newsletter backlinks

  Scenario: Backlinks for an issue
    Given `--backlinks newsletter 2`
    When the script runs
    Then one request is sent per post with state = stateFor(issue 2, English corpus)
    And the questions are one noul per prose paragraph of the post (fi.mdx by default): "This paragraph makes a claim that the newsletter issue substantiates: <paragraph>"
    And stdout shows a Markdown table with columns post, title, url, paragraph, starts, p for rows with p ≥ 0.5, sorted by p desc
    And posts that already link issue 2 anywhere in their body are listed separately as "already linked"
    And this noul shape was not measured by the eval gate (which measured per-paragraph choice); the first run on issue 2 is the calibration: post 57, the pair found by hand in #1485, must appear, and the threshold is adjusted and recorded in this spec if it does not

  Scenario: Backlinks for an unknown issue
    Given `--backlinks newsletter 999`
    When the script runs
    Then it prints "newsletter:999 not found" and exits 2

  Scenario: Backlink request stays within budget
    Given a post whose paragraphs would exceed 40 questions
    When the request is built
    Then the paragraphs are split across several requests of at most 40 questions each

Feature: CI and skills

  Scenario: Changed documents from git
    Given `--changed-since origin/main`
    When the script runs
    Then it runs `git diff --name-only origin/main...HEAD -- src/content/posts src/content/newsletters` (three dots: since the merge base)
    And it lists the unique post and newsletter ids in those paths, in path order, skipping ids that no longer have a directory (deleted or renumbered documents)
    And it runs per-document mode for each remaining id, one section per document
    And it prints "no content changes" and exits 0 when nothing remains

  Scenario: Advisory job
    Given a pull request that touches src/content/posts or src/content/newsletters and a repository secret OPENROUTER_API_KEY
    When the pipeline runs
    Then the content-suggestions job runs `suggest:links --changed-since origin/<base> --out suggestions.md` and appends the file to the job summary
    And the step itself always exits 0: a script failure is written to the summary as a notice, so the job shows green and never blocks the pipeline
    And the job is not in the branch protection's required checks (15 explicit contexts today) and must not be added
    And it is skipped, with a notice in the summary, when the secret is absent (fork pull requests included) or no document changed
    And the "no document changed" skip happens inside the script after checkout and `npm ci` (no path-filter action is added), so the job still runs briefly on every pull request

  Scenario: Skills
    Given /write or /review-content is run on a post
    Then the skill instructs running `npm run suggest:links -- post <id>` and deciding on every row, and writing anchor text by hand

Feature: Common behaviour

  Scenario: No key
    Given neither key is set
    When any mode runs
    Then it prints the skipped notice and exits 0

  Scenario: Bad arguments
    Given an unknown kind (including `--backlinks post 5`), a non-numeric id, an unknown lang, a threshold outside (0, 1] or a non-positive-integer concurrency
    When the script runs
    Then it prints the usage line and exits 2

  Scenario: Unexpected error
    Given any other thrown error (for example a target whose frontmatter has no slug)
    When the script runs
    Then it prints the message and exits 1, like a failed request

  Scenario: Unknown document
    Given `post 999` with no such directory
    When the script runs
    Then it prints "post:999 not found" and exits 2

  Scenario: Failed request
    Given a request that fails after the client's retries
    When the script runs
    Then it prints the sections completed so far, then a line "failed at <key> paragraph <n>: <error>", writes the same to --out when given, and exits 1

  Scenario: Eval unchanged
    Given the lifted helpers
    When `npm run test` runs
    Then the eval's link-target and option tests still pass against the shared module
```

---

## Data Model

```typescript
// scripts/jev/corpus.ts (addition)
interface Document {
    body: string   // the MDX body after the frontmatter, for the content.sh link count and already-linked targets
    slug: string   // per-locale frontmatter slug; '' when the frontmatter has none
}

// scripts/jev/links.ts — shared library, no CLI. Moved here from eval.ts (which imports them back):
//   NONE, SEGMENT_KIND, linkTargets, linkOptions, rankedOptions, topChoice
const SUGGEST_FLOOR = 0.1                 // rows below this are noise
export const SUGGEST_THRESHOLD = 0.5      // ★ mark; provisional, see Contract
const DOUBTFUL_THRESHOLD = 0.2            // provisional
const SUGGEST_TOP = 3
export const BACKLINK_QUESTIONS_MAX = 40
export function starts(paragraph: string): string                                            // first 8 words, markup stripped
export function linkOptions(english: Document[], self: DocKey): Record<string, string>         // both kinds + none
export function paragraphState(doc: Document, paragraph: string): { paragraph: string; title: string }
export function urlFor(doc: Document): string                                                  // /<lang>/blog/<id>/<slug>/ or newsletterPath(); throws on an empty slug
export function alreadyLinked(doc: Document, known: ReadonlySet<DocKey>): Set<DocKey>          // over the whole body, not only prose paragraphs
export function linkCount(doc: Document): number                                               // content.sh's regex over the body
export interface SuggestionRow { index: number; key: DocKey; none: number; p: number; starts: string; strong: boolean; title: string; url: string }
export interface DoubtfulRow { current: DocKey; index: number; p: number; starts: string }
export function suggestionRows(index, paragraph, probabilities, opts: { byKey: Map<DocKey, Document>; exclude: ReadonlySet<DocKey>; threshold: number }): SuggestionRow[]  // top SUGGEST_TOP ≥ SUGGEST_FLOOR
export function doubtfulRows(index, paragraph, probabilities, known): DoubtfulRow[]              // only paragraphs with a current corpus link
export function backlinkQuestions(paragraphs: string[]): Array<{ indexes: number[]; questions: Record<string, QuestionSpec> }>  // chunks of ≤ BACKLINK_QUESTIONS_MAX nouls, keyed p<index>
export interface BacklinkRow { index: number; key: DocKey; p: number; starts: string; title: string; url: string }
export function docsFromPaths(paths: string[]): Array<{ id: number; kind: DocKind }>           // src/content/{posts,newsletters}/<id>/… → unique, path order; the CLI drops ids without a directory
export function renderTable(headers: string[], rows: string[][]): string                        // Markdown

// scripts/suggest-links.ts — CLI
//   suggest:links -- <post|newsletter> <id>… [--lang fi|sv|en] [--threshold 0.5] [--concurrency 4] [--out <md>]
//   suggest:links -- --backlinks newsletter <id> [--lang] [--threshold] [--concurrency] [--out]
//   suggest:links -- --changed-since <ref> [--lang] [--threshold] [--concurrency] [--out]
//   (--lang, --threshold, --concurrency and --out apply to every mode; --backlinks accepts only the newsletter kind)
export async function runSuggest(argv: string[], env: NodeJS.ProcessEnv, deps?: { client?; log?; root?; git? }): Promise<number>
```

`starts` is the first eight words of the paragraph with markup stripped. `title` and `url` are taken from the corpus in the chosen locale; the option labels sent to Jev are always English.

Requests: per-document mode sends one request per paragraph (≈ 88 options × ~35 tokens + paragraph ≈ 4k tokens; a 20-paragraph post ≈ $0.004). Backlink mode sends one request per post with the issue as state and up to 40 paragraph nouls (≈ 78 requests ≈ $0.02).

CI job sketch (`main.yml`):

```yaml
content-suggestions:
  if: github.event_name == 'pull_request'
  continue-on-error: true
  permissions: { contents: read }
  steps:
    - checkout (fetch-depth 0), setup-node, npm ci
    - run: |
        if [ -z "$OPENROUTER_API_KEY" ]; then echo "Link suggestions skipped: no OPENROUTER_API_KEY secret" >> "$GITHUB_STEP_SUMMARY"; exit 0; fi
        npm run suggest:links -- --changed-since "origin/${{ github.base_ref }}" --out suggestions.md \
          || echo "Link suggestions failed (advisory, see the job log)" >> "$GITHUB_STEP_SUMMARY"
        [ -f suggestions.md ] && cat suggestions.md >> "$GITHUB_STEP_SUMMARY"
        exit 0
      env: { OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }} }
```

Budget check for backlink mode: the longest post body today is 1,575 words in 38 paragraphs, so one request is about 5k tokens against the 32k OpenRouter limit; the 40-question chunking is a guard, not the normal path.

---

## Dependencies

- [Jev decision pipeline](./spec.md) — client, corpus, the eval whose link-target helpers move to `links.ts`; eval result hit@3 0.85–0.87
- [Ranked related posts](./related.md) — script conventions (exit codes, `--env-file-if-exists`, no CLI in shared modules, `candidatesFor` style)
- [Newsletter archive](../newsletter/archive.md) — bidirectional linking policy; `src/lib/newsletterRoutes.ts` `newsletterPath` for issue URLs
- `scripts/checks/content.sh:129-138` — the 3–10 link budget the output reports against
- `src/lib/posts.ts:69` — post URL shape `/<lang>/blog/<id>/<slug>/`

---

## Anti-patterns

- **Do not** turn suggestions into a check — the eval's abstain rate is 0.73–0.79, so a fifth of unlinked paragraphs get a suggestion; a gate would force links the author rejected
- **Do not** send one request per paragraph in backlink mode — the issue is the state and paragraphs are parallel questions; 78 requests, not 1,200
- **Do not** label options in the document's locale — labels come from the English corpus in every mode, as in the eval and `related.md`
- **Do not** post PR comments from the job — the job summary is the only output; comments are a shared-state action the author has not approved
- **Do not** let the job block the pipeline — `continue-on-error: true` and explicit skips; a missing secret or a Jev outage must not fail a content PR
- **Do not** duplicate `linkTargets` or `linkOptions` — the eval and this script share `scripts/jev/links.ts`

---

## Calibration runs

2026-09-23, model `typesafe/jev-1.13-20260917` via OpenRouter, thresholds at their provisional values.

- `suggest:links -- post 57` (7 paragraphs, fi): newsletter 2 is the ★ target for paragraphs 1–4 (p up to 0.93) and the top option at 0.12 on paragraph 6, with newsletter 1 and post 72 as the next options on paragraph 0; posts 51 and 67 appear on paragraph 5 at 0.23 and 0.17. The three existing links (posts 47, 44, 53) are all flagged doubtful at p ≤ 0.03 — when a much stronger candidate exists, the choice distribution leaves nothing for the current target, so "doubtful" over-flags; read it as "a stronger target exists", not "remove this link". Threshold left at 0.2 pending more runs.
- `--backlinks newsletter 2` (78 posts, 78 requests): 13 rows at p ≥ 0.5, led by post 57 paragraphs 1 and 3 (the pair found by hand in #1485), then post 72 (seven paragraphs, 0.55–0.67), post 44 and post 73 at 0.50. Threshold 0.5 kept.

---

## Open Questions

*(none)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-23 | Critic review of the implementation (PASS WITH NOTES): failure line carries key and paragraph, already-linked over the whole body, strict backlink answers, calibration numbers corrected, data model refreshed, CI summary wording |
| 2026-09-23 | Implemented; calibration runs on post 57 and issue 2 recorded, doubtful flag interpreted |
| 2026-09-23 | Critic re-review (PASS WITH NOTES): flags apply to every mode, `--backlinks post` is a bad argument, unexpected errors exit 1, job-level vs script-level skip stated |
| 2026-09-23 | Critic review (FAIL → revised): top-3 rows with a none column and provisional ★ thresholds, backlink shape marked unmeasured with post 57 as calibration, three-dot diff and skipped missing directories, CI step always exits 0, link count per content.sh, concurrency validation, unknown-issue and no-prose scenarios, moved helpers listed, slug semantics |
| 2026-09-23 | Initial draft for #1490 |
