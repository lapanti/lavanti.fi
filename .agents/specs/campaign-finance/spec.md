# Spec: Campaign finance transparency (vaalirahoitus)

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-05
> **Issue**: [#1507](https://github.com/lapanti/lavanti.fi/issues/1507)

---

## Intent

Lauri campaigns on transparency and against corruption. The campaign's own money must therefore be visible on the site before anyone asks: how much the campaign plans to spend, how much it has, where each euro came from, how much has been spent, and how those numbers compare with what previous MPs' campaigns cost.

The page uses the same seven funding categories as the statutory vaalirahoitusilmoitus (laki ehdokkaan vaalirahoituksesta 273/2009 §6), so a reader can later check the site line by line against the disclosure at vaalirahoitusvalvonta.fi. A category with nothing in it is printed as zero rather than hidden, so the reader sees the full set of sources either way. The campaign accepts support from private individuals, companies and associations; it takes no loans.

A transparent budget shows both sides: where the money comes from and where it goes. Spending is broken down into the seven expense categories of the same statutory disclosure (Vaalimainonta medioissa, Ulkomainonta, Vaalilehtien, esitteiden ja muun painetun materiaalin hankinta, Mainonnan suunnittelu, Vaalitilaisuudet, Vastikkeellisen tuen hankintakulut, Muut kulut), each with its budgeted amount beside what has actually gone out, so a reader sees the plan and the progress against it.

The page separates money that has moved from money that is bound to move, because conflating them would overstate what the campaign has or understate what it owes. On the income side, `banked` is money on the campaign account and `pending` (tilittämättä) is money contractually coming but not yet remitted. On the spending side, `banked` is money paid out and `committed` (sitouduttu) is money the campaign is bound to pay. Pending and committed money is hatched rather than filled, so a solid block always means money that has actually moved. A promise without a contract is not money in either state and never appears on the page: there is no pledge figure.

Figures change throughout the campaign. Every number on the page and in the teaser comes from one typed data module, `src/content/campaignFinance.ts`, which reads the automation-owned figures (`asOf`, `raised`, `spent`) from `src/content/campaignFinanceFigures.json` and holds the manual ones itself. An update is an edit to one of the two files plus an `updatedDate` bump. Page prose renders its figures from that module, 2023 benchmark included. FAQ answers and page descriptions never quote campaign figures. The single exception is the "how much does a campaign cost" FAQ answer: FAQ answers are frontmatter strings shared with FAQPage JSON-LD and cannot read the module, so it quotes the final 2023 medians and means, and `src/content/campaignFinance.spec.ts` fails if they differ from `benchmark2023`.

---

## Scope

### In scope
- One data module `src/content/campaignFinance.ts`: campaign figures (`budget`, `raised` banked/pending per §6 funding source, `spent` budgeted/banked/committed per expense category, `asOf`) and the 2023 benchmark (median/mean for all filers and for Uudenmaan vaalipiiri, funding shares) with source URL, retrieval date and computation method. The automation-owned figures live in `src/content/campaignFinanceFigures.json`, imported by the module.
- Pure helpers in `src/lib/campaignFinance.ts`: totals, gap, percentages, locale-specific euro and percent formatting, party-row merge, budget, spending and category rows.
- Pure-CSS components `src/components/campaignFinance/`: `FinanceStat`, `FinanceStats`, `FinanceBars`, `FinanceStack`, `FinanceTeaser`.
- Pages `/fi/eduskuntavaalit/vaalirahoitus/`, `/sv/riksdagsvalet/valfinansiering/`, `/en/elections/campaign-finance/` on `PageLayout` with `langAlternates` and a FAQ.
- Teaser section and FAQ link on the three election pages.
- Breadcrumb trail under the election page: the pages set `breadcrumbParent: 'elections'`, and `PageLayout` builds the trail and its `BreadcrumbList` from it.
- Footer link, `llms.txt` pillar link, e2e page objects and specs, `langSwap` and `horizontalScroll` cases.
- The donation link: `campaignFinance.donationUrl` is the constant short URL `https://lavanti.fi/lahjoita`, and the finance page's button links to it. Print, social and every other reference use the same short URL. The only place that holds the real destination (the donation page on vihreat.fi or uudenmaanvihreat.fi) is a Cloudflare Single Redirect rule on the lavanti.fi zone, a 302 kept outside the repo, so changing the destination is a dashboard edit with no deploy. The page may go live before the donation page exists: `campaignFinance.donationsOpen` gates the button, and while it is false the page prints a "link is coming" line instead. Opening donations is two steps done together: point the rule at the donation page, then set `donationsOpen: true`.

### Out of scope
- A donation form or payment handling on this site: donations are taken on the party's page.
- `Dataset` JSON-LD (`dist-head.ts` allows only known types).
- Main navigation entry (nav stays at six items; footer + election page carry the link).
- Script that re-fetches or recomputes VTV data (2023 data is final; method documented in the data module).
- Client-side JavaScript of any kind.

---

## Contract

```gherkin
Feature: Campaign finance transparency page

  Scenario: Page renders in all three locales
    Given the site is built
    When /fi/eduskuntavaalit/vaalirahoitus/, /sv/riksdagsvalet/valfinansiering/ and /en/elections/campaign-finance/ are requested
    Then each returns a PageLayout page with type WebPage
    And the head carries hreflang links for fi, sv and en plus x-default, all resolving to built pages
    And the head carries FAQPage JSON-LD with at least two questions
    And the visible FAQ plate renders the same questions

  Scenario: Summary stats are text, not pixels
    Given a page is rendered with CSS disabled
    When the summary section (fi #lyhyesti, sv #ikorthet, en #inbrief) is read
    Then budget, raised (banked), spent (banked) and gap-to-budget are readable as text with a euro sign
    And the raised tile notes the pending total and the spent tile the committed total, when either is above 0
    And the as-of date is printed in the page locale

  Scenario: Pending is not banked
    Given raised.own is { banked: 3000, pending: 7000 } and every other source is 0
    When the funding stack renders
    Then the own-funds row prints "3 000 € + 7 000 € tilittämättä" (sv "ej inbetalt", en "pending")
    And the own-funds bar draws 3000 solid followed by 7000 hatched in the same tone
    And the gap row prints budget − 10 000 €, hatched
    And the stack total is max(budget, banked + pending), so the segments still sum to 100 %

  Scenario: Committed is not paid
    Given spent.media is { budgeted: 11000, banked: 1000, committed: 4000 }
    When the category bars render
    Then the media row prints "1 000 € + 4 000 € sitouduttu / 11 000 €" (sv "bundet", en "committed")
    And the bar draws 1000 solid and 4000 hatched, with a marker at the budgeted amount

  Scenario: Every expense category is listed, zeros included
    Given every spent category is { budgeted: B, banked: 0, committed: 0 }
    When the category bars render
    Then seven rows appear in statutory order: media, outdoor, print, design, events, supportCosts, other
    And each prints "0 € / B" in its locale's format

  Scenario: No spending yet means no spending stack
    Given Σ spent.banked + Σ spent.committed is 0
    When the spending section renders
    Then spendingSegments returns undefined, no stack is drawn, and the section prints the pending line
    And the category bars still render, zeros included

  Scenario: Every funding category is listed, zeros included
    Given raised.loans, raised.party, raised.partyAssociations, raised.private, raised.companies and raised.other are all { banked: 0, pending: 0 }
    When the "where the money comes from" stack renders
    Then the legend lists six rows: own funds, loans, private individuals, companies, party (incl. party associations), other entities, plus one "still needed" row
    And each zero row prints "0 €" (fi/sv) or "€0" (en)
    And the bar itself contains no zero-width segment and is aria-hidden

  Scenario: Party rows merge for display
    Given raised.party is 300 and raised.partyAssociations is 200
    When mergeParty(raised) is called
    Then the result has one key "party" with value 500 and no key "partyAssociations"
    And every other key keeps its value

  Scenario: Benchmark compares budget with 2023 campaigns
    Given benchmark2023 holds all-filers median 32634 and Uusimaa median 36355
    When the "how much did a winning campaign cost" bars render
    Then three rows appear: campaign budget (emphasised), all median, Uusimaa median
    And no mean is drawn: the costs are right-skewed, so the page states the quartiles in words instead
    And max is the largest row value (barsMax), so the tallest row has --w:100%
    And each row shows its euro value as text and a decorative bar whose --w is round(value / max × 100) %
    And a source line links to the VTV CSV URL and states the retrieval date

  Scenario: Percentages are drawn against the whole
    Given FinanceBars receives unit "percent" and the largest row is 24.7
    When the bars render
    Then that row's --w is 25%, not 100%: a share is drawn against 100, never against the largest share
    And an amount unit still scales to the largest row, which has no natural ceiling

  Scenario: Each part-to-whole figure names its denominator
    Given the funding stack divides by the budget and the spending stack divides by the money raised
    When their captions render
    Then each caption says which whole its percentages are shares of, because the two differ

  Scenario: The comparison states the shape of the distribution
    Given the 2023 costs run from 0 € to 136 739 € with the mean above the median
    When the comparison section renders
    Then the prose gives the interquartile range, says the figures cover only elected members and their alternates, says the Uusimaa rows are part of the national ones, and says our own figure is a plan against realised costs

  Scenario: 2023 funding mix uses the same six display rows
    Given benchmark2023.shares in §6 order
    When the "how did MPs fund their campaigns in 2023" bars render
    Then the rows are own, loans, private, companies, party (merged: party + partyAssociations), other
    And the merged party value is rounded to one decimal after summing (3.0 + 8.3 → 11.3, never 11.299999)
    And each row shows a percentage with one decimal

  Scenario: Spending stack
    Given Σ spent.banked is 3000, Σ spent.committed is 2000 and banked + pending raised is 10000
    When the spending stack renders
    Then two legend rows appear: spent "3 000 € + 2 000 € sitouduttu" (3000 solid, 2000 hatched) and unspent "5 000 €"
    And the stack total is max(raised, spent + committed), so committed spending that runs ahead of income never draws a negative row

  Scenario: Raised exceeds budget
    Given budget is 30000 and banked + pending raised is 32000
    When budgetSegments and the funding stack render
    Then gapToBudget is 0, the "still needed" row prints 0 €, and the stack total is 32000 so segments sum to 100 %

  Scenario: Degenerate inputs never break rendering
    Given FinanceBars receives max 0, or FinanceStack receives total 0
    When the component renders
    Then every bar gets --w:0% and no NaN or Infinity appears in the HTML
    And percentOf(part, 0) returns 0

  Scenario: Paid-out money never exceeds banked income
    Given Σ spent.banked is greater than Σ raised.banked in the data
    When the data-module spec runs
    Then the spec fails; committed spending is exempt, because a contract can precede the money

  Scenario: One-file update
    Given campaignFinance.budget, or a figure in campaignFinanceFigures.json, is changed and updatedDate is bumped on the three pages
    When the site is rebuilt
    Then the summary stats, the benchmark budget row, the funding and spending stacks, the category bars and the election-page teasers reflect the new value
    And no component or page file needed editing

  Scenario: Election pages link to the finance page
    Given the fi, sv and en election pages
    When they render
    Then a FinanceTeaser section shows the summaryTiles (budget, raised, spent, gap) and links to the locale's finance page
    And the "how can I support the campaign" FAQ answer names the finance page in plain text (FAQ answers are plain strings shared with FAQPage JSON-LD; the link lives in the teaser)

  Scenario: Discoverability
    Given the built site
    When the footer, llms.txt and sitemap are inspected
    Then the footer site column carries a footer-only <li> for the finance page after the newsletter-archive item, in every locale, without touching nav.ts
    And llms.txt lists /fi/eduskuntavaalit/vaalirahoitus/ under the pillar links
    And the sitemap lists all three URLs with lastmod equal to updatedDate

  Scenario: Language switch
    Given a visitor on /fi/eduskuntavaalit/vaalirahoitus/
    When the language-switch script runs
    Then the SV link points to /sv/riksdagsvalet/valfinansiering/ and the EN link to /en/elections/campaign-finance/

  Scenario: Money formatting is deterministic
    Given the value 30000
    When formatEuro is called for fi, sv and en
    Then fi and sv return "30 000 €" with a no-break space between groups and before the sign
    And en returns "€30,000"
    And the output does not depend on the Node ICU build

  Scenario: Invariants hold
    Given the data module
    When its spec runs
    Then Σ spent.banked ≤ Σ raised.banked, banked + pending raised ≤ budget, every figure is a non-negative integer, asOf and retrievedDate are ISO dates, benchmark shares sum to 100 ± 0.2, DISPLAY_SOURCE_ORDER lists the six display sources in §6 order and EXPENSE_CATEGORY_ORDER the seven categories in statutory order

  Scenario: Automated update opens a PR for review
    Given a campaign-finance-update payload whose raised or spent figures differ from main
    When campaign-finance-update.yml runs
    Then branch chore/campaign-finance-update points at one API-signed commit on top of main with the new figures, the three updatedDate bumps and regenerated baselines
    And a PR from that branch is open, with auto-merge off
    And a PR already open from an earlier week stays open and shows the new commit, never closed or marked merged

  Scenario: Automated update with unchanged figures
    Given a payload whose raised and spent equal main's, whatever its asOf
    When campaign-finance-update.yml runs
    Then nothing is pushed and no PR is opened or changed

  Scenario: Automated update rejects an invalid payload
    Given a payload with an unknown or missing source or category, an unknown or missing field within one, a negative or fractional figure, Σ spent.banked > Σ raised.banked, banked + pending raised > budget, or an asOf that is not an ISO date or lies in the future
    When the updater runs
    Then it exits non-zero before any push

  Scenario: The updater's output is already formatted
    Given any valid payload, with its keys in any order
    When the updater writes campaignFinanceFigures.json
    Then sources follow §6 order, categories statutory order, and fields banked, pending / budgeted, banked, committed
    And the file is byte-identical to Prettier's output for it under the repo config, so no format or lint check can fail on the bot's commit

  Scenario: Figure edits require the page bump
    Given a commit that changes src/content/campaignFinance.ts or src/content/campaignFinanceFigures.json
    When scripts/checks/updated-date.ts runs
    Then it fails unless updatedDate is bumped on the three finance pages

  Scenario: Layout survives narrow viewports
    Given a 360 px viewport
    When any of the three pages renders
    Then no horizontal scrollbar appears and every heading passes check-overflow

  Scenario: E2E coverage follows the canonical page pattern
    Given tests/e2e/campaignFinancePage.spec.ts and its En/Swe siblings
    When CI runs
    Then each spec has exactly the tests "should render", "should match aria snapshot", "should pass accessibility test", "should pass siteimprove check" and "should match screenshot"
    And "should render" asserts seven category rows in the spending section, which sits below the fold and so outside the viewport screenshot
    And aria and screenshot goldens were produced by the Update baselines workflow and committed, never generated locally

  Scenario: Page titles fit the SEO window
    Given the three new pages
    When scripts/checks/content.sh runs
    Then each pageTitle plus " | Lauri Lavanti" is 50–60 characters and each description 120–160
```

---

## Data Model

```typescript
import type { Lang } from '../content/nav'
import { colors } from '../lib/styles'

/** Names follow laki ehdokkaan vaalirahoituksesta 273/2009 §6 (2.1–2.7). */
export type FundingSource = 'own' | 'loans' | 'private' | 'companies' | 'party' | 'partyAssociations' | 'other'

/** What the page shows: party and partyAssociations merged into `party`. */
export type DisplaySource = Exclude<FundingSource, 'partyAssociations'>

/**
 * Reading order on the page, following §6. Object literals cannot carry it:
 * eslint `sort-keys` forces every record into alphabetical order.
 */
export const DISPLAY_SOURCE_ORDER: readonly DisplaySource[]

/** The seven expense categories of the statutory disclosure, in its order. */
export type ExpenseCategory = 'media' | 'outdoor' | 'print' | 'design' | 'events' | 'supportCosts' | 'other'
export const EXPENSE_CATEGORY_ORDER: readonly ExpenseCategory[]

export interface Income {
    banked: number                            // on the campaign account (Toteutunut)
    pending: number                           // contractually coming, not yet remitted (Tilittämättä)
}

export interface Expense {
    budgeted: number                          // planned (Budjetoitu)
    banked: number                            // paid out (Toteutunut)
    committed: number                         // bound to be paid (Sitouduttu)
}

/** The shape of campaignFinanceFigures.json, written whole by the weekly update. */
export interface FinanceFigures {
    asOf: string                              // ISO date the figures were last confirmed
    raised: Record<FundingSource, Income>
    spent: Record<ExpenseCategory, Expense>
}

export interface CampaignFinance extends FinanceFigures {
    budget: number                            // planned total spend, whole euros (manual)
    donationsOpen: boolean                    // manual
    donationUrl: string                       // manual
}

/** Internal: `Benchmark` carries the shape consumers need, so this stays unexported. */
interface BenchmarkSet {
    id: 'all' | 'uusimaa'
    mean: number
    median: number
    n: number
}

export interface Benchmark {
    retrievedDate: string                     // ISO date the CSV was fetched
    sets: BenchmarkSet[]
    shares: Record<FundingSource, number>     // percent of total financing, one decimal
    sourceUrl: string
}

/** Segment colours; each maps to one token in src/lib/styles.ts colors. `needed` is always hatched. */
export type Tone = 'own' | 'loans' | 'private' | 'companies' | 'party' | 'other' | 'needed' | 'spent' | 'unspent'

export interface FinanceLabels {
    asOf: (formatted: string) => string     // receives formatDate(iso, lang) output; "Tilanne 25.9.2026"
    budget: string
    budgetRow: string                       // benchmark row label for the campaign budget
    categories: Record<ExpenseCategory, string>
    committed: string                       // suffix after a committed amount: "sitouduttu"
    gap: string
    mean: string
    median: string
    needed: string
    pending: string                         // suffix after a pending amount: "tilittämättä"
    raised: string
    sets: Record<BenchmarkSet['id'], string>
    source: (retrieved: string) => string  // "Lähde: VTV:n vaalirahoitusilmoitukset 2023, haettu 25.9.2026"
    sources: Record<DisplaySource, string>
    spent: string
    teaser: { cta: string; eyebrow: string; heading: string }
    unspent: string
}

export const campaignFinance: CampaignFinance
export const benchmark2023: Benchmark
export const financeLabels: Record<Lang, FinanceLabels>
```

Section captions and prose live in the three MDX pages (per-locale files), not in the module.

Benchmark provenance (documented as a comment in the module): VTV final disclosures CSV `E_VI_eduskuntavaalit2023.csv` (273 filers: elected MPs and alternates), retrieved 2026-09-25. Median and mean of `Vaalikampanjan kulut yhteensa`; Uusimaa subset where `Vaalipiiri/Kunta` contains "Uudenmaan"; share = Σ(`2.x … yhteensa`) / Σ(`Vaalikampanjan rahoitus yhteensa`). The CSV has no elected/alternate flag.

Helper signatures (`src/lib/campaignFinance.ts`):

| Helper | Behaviour |
|---|---|
| `totalRaised(f)` | `{ banked, pending }`, each Σ over `f.raised` |
| `totalSpent(f)` | `{ budgeted, banked, committed }`, each Σ over `f.spent` |
| `gapToBudget(f)` | `max(0, budget − banked − pending)` |
| `withPending(amount, pending, suffix, lang)` | `"3 000 € + 7 000 € tilittämättä"`, or just the amount when `pending` is 0 |
| `percentOf(part, whole)` | one decimal; `0` when `whole ≤ 0` |
| `barWidth(value, max)` | integer percent 0–100; `0` when `max ≤ 0` |
| `barsMax(rows)` | largest `value` in `rows`, `0` for empty |
| `formatEuro(n, lang)` | fi/sv `12 345 €` (U+00A0 groups and before `€`), en `€12,345`; no `Intl.NumberFormat` |
| `formatPercent(p, lang)` | fi/sv `12,3 %` (U+00A0), en `12.3%` |
| `formatDate(iso, lang)` | hand-rolled: fi/sv `25.9.2026`, en `25 September 2026` (month table); no `Intl.DateTimeFormat`, so aria goldens are ICU-independent |
| `mergeParty(r)` | `Record<DisplaySource, number>`, party + partyAssociations summed and rounded to one decimal |
| `budgetSegments(f, lang)` | six display sources (value = banked, pending = pending) + `needed`, each `{ id, label, tone, value, pending?, pendingLabel? }`; stack total = `max(budget, banked + pending)` |
| `spendingSegments(f, lang)` | undefined when Σ banked + committed is 0; else `spent` (value = banked, pending = committed) + `unspent` (`max(0, raised − banked − committed)`, raised = banked + pending); total = `max(raised, banked + committed)` |
| `categoryRows(f, lang)` | seven `BarRow`s in `EXPENSE_CATEGORY_ORDER`: value = banked, pending = committed, target = budgeted |
| `summaryTiles(f, lang)` | budget; raised (banked, note = pending); spent (banked, note = committed); gap (note = as-of date) |

Component props:

| Component | Props |
|---|---|
| `FinanceStat` | `label`, `value`, `note?` |
| `FinanceStats` | `items: { label, value, note? }[]` |
| `FinanceBars` | `caption`, `rows: { emphasis?, label, value, pending?, pendingLabel?, target? }[]`, `unit: 'eur' \| 'percent'`, `lang`; `max` = `barsMax` over each row's `max(value + pending, target)`; pending drawn hatched after the fill, target as a marker; the amount text names every part |
| `FinanceStack` | `caption`, `segments: { id, label, tone, value, pending?, pendingLabel? }[]`, `total`, `lang`; every segment in the legend, only `value + pending > 0` in the bar; pending drawn hatched in the segment's tone, `needed` hatched whole |
| `FinanceTeaser` | `href`, `id` (localized section anchor: rahoitus / finansiering / finance), `lang` |

---

## Automated weekly update

A weekly job outside this repo reads the budget sheet and sends `repository_dispatch` event `campaign-finance-update` to this repo. The `workflow_dispatch` input `payload` takes the same JSON for manual runs.

```typescript
type FinancePayload = FinanceFigures          // whole euros; asOf is the Helsinki date the sheet was read
```

| Step | Behaviour |
|---|---|
| `scripts/ci/update-campaign-finance.ts` | Runs before `npm ci`, so it imports nothing outside Node built-ins and `src/lib/publishing.ts`; its source and category lists mirror the module's types and a spec holds them in step. Validates the payload against the invariants above (`budget` read from the module). Writes `campaignFinanceFigures.json` whole, in canonical key order, with `JSON.stringify(…, null, 4)` plus a newline, which matches Prettier under `.prettierrc.mjs`. Sets `updatedDate` on the three finance pages to today (Helsinki). Prints `unchanged` and edits nothing when `raised` and `spent` equal the file's, whatever `asOf` says |
| Scratch branch | `chore/campaign-finance-update-<run id>`, cut from `main`, deleted at the end of the run |
| Baselines | `.github/actions/regen-baselines` against a preview of the edited tree, aliased to the scratch branch |
| Commit | `scripts/ci/commit-baselines.ts` on the scratch branch, API-signed. `COMMIT_PATHS` lists the figures JSON, the three pages and `tests` |
| Rolling branch | `chore/campaign-finance-update` moves to that commit in one ref update: an unmerged earlier week is replaced, never stacked. It never points at `main` itself, because GitHub closes or marks merged an open PR whose head is already in its base |
| PR | Opened if none is open for the branch. Never auto-merged: a person checks the figures against the budget sheet and merges |

`budget`, `donationUrl`, `donationsOpen` and `benchmark2023` are not in the payload and stay manual edits in `campaignFinance.ts`.

Pending income and committed spending do enter the payload, because both are bound by a contract: a donation agreed but not yet remitted, an invoice the campaign has accepted. They are separate fields, never folded into banked money. A promise without a contract, such as the candidate's own undertaking before he pays it in, is in neither column of the sheet and so never reaches the page; once he transfers it, it is banked like any other money.

Unit tests must not `toMatchSnapshot()` rendered output derived from the fields this update rewrites (`asOf`, `raised.*`, `spent.*`) — such a snapshot fails every week the figures actually change. Components that read `campaignFinance` live (e.g. `FinanceTeaser`) get behavioural assertions instead; a render-snapshot test is only safe when the finance data comes in as props/fixtures (`FinanceStats`, `FinanceBars`, `FinanceStack`).

The sender needs a fine-grained PAT scoped to this repo with Contents read/write (what `repository_dispatch` requires). The workflow reuses `SCHEDULED_PUBLISH_TOKEN`, so the PR triggers the `pull_request` workflows.

---

## Dependencies

- [Pages](../pages/spec.md) — page architecture, required frontmatter, DoD.
- [SEO](../seo/spec.md) — hreflang, JSON-LD types, FAQ gating.
- [Design system](../design-system/spec.md) — tokens in `src/lib/styles.ts`, `define:vars`, sanctioned breakpoints.
- [Navigation](../navigation/spec.md) — footer site column pattern; language-switch script and `langAlternates`.

---

## Anti-patterns

- **Do not** format money or the as-of date with `Intl.*` — ICU output varies by Node build and would break aria goldens.
- **Do not** put an `<a>` inside a FAQ answer — `Faq.astro` renders `a` as plain text and the same string feeds FAQPage JSON-LD.
- **Do not** put figures in `description`, `intro`, prose or FAQ text that is not generated from the data module — they go stale on the next update. The one exception is the FAQ cost answer, held to `benchmark2023` by a test.
- **Do not** make the bars the only carrier of a number — bars are `aria-hidden` decoration; the legend/value text is the content.
- **Do not** drop zero-value categories from the legend — the zero is the statement.
- **Do not** hand-edit `src/content/campaignFinanceFigures.json` into another key order or indentation — the next weekly update rewrites it whole, and a diff of reordered keys hides the figures a reviewer should be checking.
- **Do not** add a second copy of any figure outside `src/content/campaignFinance.ts` and `src/content/campaignFinanceFigures.json` — the page intro, the prose and the FAQ answers point at the figures rather than restating them, and they never enumerate which sources are currently zero or which source currently carries the campaign. Prose renders 2023 benchmark figures from `benchmark2023` (`formatInteger`, `formatDecimal`, `benchmarkSet`) rather than typing them.
- **Do not** give a segment a tone that matches the plate it sits on — the `oat` ground hides an `oat` swatch. Reach for an outline before an off-palette colour; `regionalPurple` and the other social-brand tokens are not data colours.
- **Do not** scale a percentage bar to the largest row — a quarter drawn as a full track inflates every share by the same factor.
- **Do not** put a mean beside a median on a skewed distribution as though the pair described it, and do not show two part-to-whole figures with different denominators without naming them.
- **Do not** animate on load — these sections sit below the fold. Scroll-driven reveal only, inside `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`, so the static render is always the correct picture.
- **Do not** use `Dataset` JSON-LD — `scripts/checks/dist-head.ts` rejects unknown types.
- **Do not** use `@media` widths outside the `breakpoints` map — `src/lib/mediaQueries.spec.ts` fails.
- **Do not** write unhyphenated long compounds in `heading=` props — `scripts/check-overflow.mjs` measures them; use soft hyphens.
- **Do not** regenerate e2e goldens locally — they are CI-canonical; use the Update baselines workflow.

---

## Open Questions

- [ ] None.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-25 | Initial draft |
| 2026-09-25 | Real state: received money, an own commitment and optional spending are three separate things; pledged money is hatched; summaryTiles replaces the per-page tile arrays |
| 2026-09-25 | Statistical review: percent bars scale to 100, means dropped from the comparison in favour of stated quartiles, denominators named in both stack captions, comparison reframed as the cost of winning campaigns; scroll-driven bar reveal added behind @supports |
| 2026-09-25 | Implementation drift: BenchmarkSet unexported, FinanceTeaser takes a section id, DISPLAY_SOURCE_ORDER replaces key order, loans tone moved off oat |
| 2026-09-25 | Critic round 1: plain-text FAQ mention, Tone type + labels, edge-case scenarios (raised > budget, max 0, spent > raised), section ids per locale, footer-only li pattern, hand-rolled date, e2e and title scenarios |
| 2026-09-30 | Site review: benchmark prose renders from data (`range`, `formatInteger`, `formatDecimal`, `benchmarkSet`); FAQ cost answer is the one test-guarded copy; funding FAQ no longer implies the current mix; breadcrumbs moved in scope; summary and teaser scenarios match `summaryTiles` |
| 2026-10-05 | Both sides of the budget: `ownCommitment` removed (no pledge figure); income split into banked/pending and spending into budgeted/banked/committed per the seven statutory expense categories, pending and committed hatched; category bars with budget markers; the summary tiles now carry spending, reversing the 2026-09-25 rule, since every figure comes from the budget sheet and a zero there is confirmed; automation-owned figures moved to `campaignFinanceFigures.json`, written whole in Prettier-identical canonical order; payload reshaped accordingly |
