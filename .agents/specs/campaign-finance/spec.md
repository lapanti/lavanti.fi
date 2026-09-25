# Spec: Campaign finance transparency (vaalirahoitus)

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-25
> **Issue**: [#1507](https://github.com/lapanti/lavanti.fi/issues/1507)

---

## Intent

Lauri campaigns on transparency and against corruption. The campaign's own money must therefore be visible on the site before anyone asks: how much the campaign plans to spend, how much it has, where each euro came from, how much has been spent, and how those numbers compare with what previous MPs' campaigns cost.

The page uses the same seven funding categories as the statutory vaalirahoitusilmoitus (laki ehdokkaan vaalirahoituksesta 273/2009 §6), so a reader can later check the site line by line against the disclosure at vaalirahoitusvalvonta.fi. A category with nothing in it is printed as zero rather than hidden, so the reader sees the full set of sources either way. The campaign accepts support from private individuals, companies and associations; it takes no loans.

The page separates three states of money, because conflating them would overstate what the campaign has. `raised` is money banked. `ownCommitment` is the candidate's own undertaking, which he will put in unless donations cover the budget instead: it closes the gap to the budget but is never added to `raised`, and it is hatched rather than filled so a solid block on the bar always means money that has arrived. `spent` is optional, and while no figure is confirmed the page says so instead of printing a zero it cannot stand behind.

Figures change throughout the campaign. Every number on the page and in the teaser must come from one typed data module so an update is a one-file edit plus an `updatedDate` bump. FAQ answers and page descriptions therefore never quote figures.

---

## Scope

### In scope
- One data module `src/content/campaignFinance.ts`: campaign figures (`budget`, `raised` per §6 category, `spent`, `asOf`) and the 2023 benchmark (median/mean for all filers and for Uudenmaan vaalipiiri, funding shares) with source URL, retrieval date and computation method.
- Pure helpers in `src/lib/campaignFinance.ts`: totals, gap, percentages, locale-specific euro and percent formatting, party-row merge, budget segments.
- Pure-CSS components `src/components/campaignFinance/`: `FinanceStat`, `FinanceStats`, `FinanceBars`, `FinanceStack`, `FinanceTeaser`.
- Pages `/fi/eduskuntavaalit/vaalirahoitus/`, `/sv/riksdagsvalet/valfinansiering/`, `/en/elections/campaign-finance/` on `PageLayout` with `langAlternates` and a FAQ.
- Teaser section and FAQ link on the three election pages.
- Footer link, `llms.txt` pillar link, e2e page objects and specs, `langSwap` and `horizontalScroll` cases.

### Out of scope
- Donation payment link or form (separate feature; the FAQ says how to donate in words only).
- Breadcrumb trail or breadcrumb JSON-LD (`PageLayout` only emits `BreadcrumbList` for `CollectionPage` trails; adding an election trail touches `breadcrumbs.ts` and the layout). `Dataset` JSON-LD (`dist-head.ts` allows only known types).
- Main navigation entry (nav stays at six items; footer + election page carry the link).
- Script that re-fetches or recomputes VTV data (2023 data is final; method documented in the data module).
- Real received figures. The state at launch is the true one: nothing received from any source, a 10 000 € own commitment, and no confirmed spending.
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
    Then budget, raised total, spent and gap-to-budget are readable as text with a euro sign
    And the as-of date is printed in the page locale

  Scenario: A pledge is not a receipt
    Given ownCommitment is 10000 and every raised category is 0
    When the funding stack renders
    Then the own-funds row prints 0 €, a separate commitment row prints 10 000 €, and the gap row prints 20 000 €
    And the commitment and gap segments are hatched while every received source would be solid
    And the stack total is the budget, so the segments still sum to 100 %

  Scenario: No confirmed spending means no figure
    Given spent is undefined
    When the spending section renders
    Then spendingSegments returns undefined, no stack is drawn, and the section prints the pending line
    And the summary tiles never carry a spending figure, confirmed or not

  Scenario: Every funding category is listed, zeros included
    Given raised.loans, raised.party, raised.partyAssociations, raised.private, raised.companies and raised.other are all 0
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
    Given spent is 5000 and raised total is 10000
    When the spending stack renders
    Then two legend rows appear: fi/sv "5 000 € (50,0 %)" for spent and unspent, en "€5,000 (50.0%)"

  Scenario: Raised exceeds budget
    Given budget is 30000 and totalRaised is 32000
    When budgetSegments and the funding stack render
    Then gapToBudget is 0, the "still needed" row prints 0 €, and the stack total is 32000 so segments sum to 100 %

  Scenario: Degenerate inputs never break rendering
    Given FinanceBars receives max 0, or FinanceStack receives total 0
    When the component renders
    Then every bar gets --w:0% and no NaN or Infinity appears in the HTML
    And percentOf(part, 0) returns 0

  Scenario: Spent never exceeds raised on the page
    Given spent is greater than totalRaised in the data
    When the data-module spec runs
    Then the spec fails (invariant spent ≤ totalRaised), so the page is never built with a negative unspent row

  Scenario: One-file update
    Given campaignFinance.budget is changed and updatedDate is bumped on the three pages
    When the site is rebuilt
    Then the summary stats, the benchmark budget row, the funding stack and the election-page teasers reflect the new value
    And no component or page file needed editing

  Scenario: Election pages link to the finance page
    Given the fi, sv and en election pages
    When they render
    Then a FinanceTeaser section shows budget, raised and spent and links to the locale's finance page
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
    Then spent ≤ totalRaised ≤ budget, every figure is a non-negative integer, asOf and retrievedDate are ISO dates, benchmark shares sum to 100 ± 0.2, and DISPLAY_SOURCE_ORDER lists the six display sources in §6 order

  Scenario: Layout survives narrow viewports
    Given a 360 px viewport
    When any of the three pages renders
    Then no horizontal scrollbar appears and every heading passes check-overflow

  Scenario: E2E coverage follows the canonical page pattern
    Given tests/e2e/campaignFinancePage.spec.ts and its En/Swe siblings
    When CI runs
    Then each spec has exactly the tests "should render", "should match aria snapshot", "should pass accessibility test", "should pass siteimprove check" and "should match screenshot"
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

export interface CampaignFinance {
    asOf: string                              // ISO date the figures were last confirmed
    budget: number                            // planned total spend, whole euros
    raised: Record<FundingSource, number>     // received so far, whole euros
    spent: number                             // paid out so far, whole euros
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

/** Segment colours; each maps to one token in src/lib/styles.ts colors. */
export type Tone = 'own' | 'loans' | 'private' | 'companies' | 'party' | 'other' | 'needed' | 'spent' | 'unspent'
export const toneColors: Record<Tone, string> = {
    companies: colors.signalBlue,
    loans: colors.oat,
    needed: colors.sand,        // FinanceStack adds a dashed outline to this tone
    other: colors.aquaBlue,
    own: colors.darkGreen,
    party: colors.brightSky,
    private: colors.brightGreen,
    spent: colors.peach,
    unspent: colors.lightSand,
}

export interface FinanceLabels {
    asOf: (formatted: string) => string     // receives formatDate(iso, lang) output; "Tilanne 25.9.2026"
    budget: string
    budgetRow: string                       // benchmark row label for the campaign budget
    gap: string
    mean: string
    median: string
    needed: string
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
| `totalRaised(f)` | Σ `f.raised` |
| `gapToBudget(f)` | `max(0, budget − totalRaised)` |
| `percentOf(part, whole)` | one decimal; `0` when `whole ≤ 0` |
| `barWidth(value, max)` | integer percent 0–100; `0` when `max ≤ 0` |
| `barsMax(rows)` | largest `value` in `rows`, `0` for empty |
| `formatEuro(n, lang)` | fi/sv `12 345 €` (U+00A0 groups and before `€`), en `€12,345`; no `Intl.NumberFormat` |
| `formatPercent(p, lang)` | fi/sv `12,3 %` (U+00A0), en `12.3%` |
| `formatDate(iso, lang)` | hand-rolled: fi/sv `25.9.2026`, en `25 September 2026` (month table); no `Intl.DateTimeFormat`, so aria goldens are ICU-independent |
| `mergeParty(r)` | `Record<DisplaySource, number>`, party + partyAssociations summed and rounded to one decimal |
| `budgetSegments(f, lang)` | six display sources + `needed`, each `{ id, label, tone, value }`; stack total = `max(budget, totalRaised)` |
| `spendingSegments(f, lang)` | `spent` + `unspent` (`totalRaised − spent`); total = `totalRaised`. The data-module invariant `spent ≤ totalRaised` is the guard; the helper does not clamp |

Component props:

| Component | Props |
|---|---|
| `FinanceStat` | `label`, `value`, `note?` |
| `FinanceStats` | `items: { label, value, note? }[]` |
| `FinanceBars` | `caption`, `rows: { emphasis?, label, value }[]`, `unit: 'eur' \| 'percent'`, `lang`; computes `max` via `barsMax` |
| `FinanceStack` | `caption`, `segments: { id, label, tone, value }[]`, `total`, `lang`; every segment in the legend, only `value > 0` in the bar |
| `FinanceTeaser` | `href`, `id` (localized section anchor: rahoitus / finansiering / finance), `lang` |

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
- **Do not** put figures in `description`, `intro` or FAQ text that is not generated from the data module — they go stale on the next update.
- **Do not** make the bars the only carrier of a number — bars are `aria-hidden` decoration; the legend/value text is the content.
- **Do not** drop zero-value categories from the legend — the zero is the statement.
- **Do not** add a second copy of any figure outside `src/content/campaignFinance.ts` — the page intro, the prose and the FAQ answers point at the figures rather than restating them, and they never enumerate which sources are currently zero. Figures from the 2023 benchmark are final and may be quoted in prose.
- **Do not** give a segment a tone that matches the plate it sits on — the `oat` ground hides an `oat` swatch. Reach for an outline before an off-palette colour; `regionalPurple` and the other social-brand tokens are not data colours.
- **Do not** scale a percentage bar to the largest row — a quarter drawn as a full track inflates every share by the same factor.
- **Do not** put a mean beside a median on a skewed distribution as though the pair described it, and do not show two part-to-whole figures with different denominators without naming them.
- **Do not** animate on load — these sections sit below the fold. Scroll-driven reveal only, inside `@supports (animation-timeline: view())` and `prefers-reduced-motion: no-preference`, so the static render is always the correct picture.
- **Do not** use `Dataset` JSON-LD — `scripts/checks/dist-head.ts` rejects unknown types. Breadcrumbs are out of scope by issue, not blocked by the check.
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
