# Spec: Campaign finance transparency (vaalirahoitus)

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-25
> **Issue**: [#1507](https://github.com/lapanti/lavanti.fi/issues/1507)

---

## Intent

Lauri campaigns on transparency and against corruption. The campaign's own money must therefore be visible on the site before anyone asks: how much the campaign plans to spend, how much it has, where each euro came from, how much has been spent, and how those numbers compare with what previous MPs' campaigns cost.

The page uses the same seven funding categories as the statutory vaalirahoitusilmoitus (laki ehdokkaan vaalirahoituksesta 273/2009 §6), so a reader can later check the site line by line against the disclosure at vaalirahoitusvalvonta.fi. A category that is zero is printed as zero: "no loans, no party money" is itself the message.

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
- Breadcrumb trail or breadcrumb JSON-LD; `Dataset` JSON-LD (`dist-head.ts` allows only known types).
- Main navigation entry (nav stays at six items; footer + election page carry the link).
- Script that re-fetches or recomputes VTV data (2023 data is final; method documented in the data module).
- Real campaign figures. Initial values are placeholders: budget 30 000 €, own funds 10 000 €, spent 5 000 €, every other source 0 €.
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
    Given the fi page is rendered with CSS disabled
    When the summary section (#lyhyesti) is read
    Then budget, raised total, spent and gap-to-budget are readable as text with a euro sign
    And the as-of date is printed in the page locale

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
    Given benchmark2023 holds all-filers median 32634 and mean 37540 and Uusimaa median 36355 and mean 42517
    When the "how much does a campaign cost" bars render
    Then five rows appear: campaign budget (emphasised), all median, all mean, Uusimaa median, Uusimaa mean
    And each row shows its euro value as text and a decorative bar whose --w is value / max × 100 %
    And a source line links to the VTV CSV URL and states the retrieval date

  Scenario: 2023 funding mix uses the same six display rows
    Given benchmark2023.shares in §6 order
    When the "how did MPs fund their campaigns in 2023" bars render
    Then the rows are own, loans, private, companies, party (merged: party + partyAssociations), other
    And each row shows a percentage with one decimal

  Scenario: Spending stack
    Given spent is 5000 and raised total is 10000
    When the spending stack renders
    Then two legend rows appear: spent 5 000 € (50,0 %) and unspent 5 000 € (50,0 %)

  Scenario: One-file update
    Given campaignFinance.budget is changed and updatedDate is bumped on the three pages
    When the site is rebuilt
    Then the summary stats, the benchmark budget row, the funding stack and the election-page teasers reflect the new value
    And no component or page file needed editing

  Scenario: Election pages link to the finance page
    Given the fi, sv and en election pages
    When they render
    Then a FinanceTeaser section shows budget, raised and spent and links to the locale's finance page
    And the "how can I support the campaign" FAQ answer links to the finance page

  Scenario: Discoverability
    Given the built site
    When the footer, llms.txt and sitemap are inspected
    Then the footer site column links the finance page in every locale
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
    Then spent ≤ totalRaised ≤ budget, every figure is a non-negative integer, asOf and retrievedDate are ISO dates, benchmark shares sum to 100 ± 0.2, and raised keys are in §6 order

  Scenario: Layout survives narrow viewports
    Given a 360 px viewport
    When any of the three pages renders
    Then no horizontal scrollbar appears and every heading passes check-overflow
```

---

## Data Model

```typescript
import type { Lang } from '../content/nav'

/** Order and names follow laki ehdokkaan vaalirahoituksesta 273/2009 §6 (2.1–2.7). */
export type FundingSource = 'own' | 'loans' | 'private' | 'companies' | 'party' | 'partyAssociations' | 'other'

/** What the page shows: party and partyAssociations merged into `party`. */
export type DisplaySource = Exclude<FundingSource, 'partyAssociations'>

export interface CampaignFinance {
    asOf: string                              // ISO date the figures were last confirmed
    budget: number                            // planned total spend, whole euros
    raised: Record<FundingSource, number>     // received so far, whole euros
    spent: number                             // paid out so far, whole euros
}

export interface BenchmarkSet {
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

export interface FinanceLabels {
    asOf: string
    budget: string
    gap: string
    mean: string
    median: string
    needed: string
    raised: string
    sets: Record<BenchmarkSet['id'], string>
    sources: Record<DisplaySource, string>
    spent: string
    unspent: string
}

export const campaignFinance: CampaignFinance
export const benchmark2023: Benchmark
export const financeLabels: Record<Lang, FinanceLabels>
```

Benchmark provenance (documented as a comment in the module): VTV final disclosures CSV `E_VI_eduskuntavaalit2023.csv` (273 filers: elected MPs and alternates), retrieved 2026-09-25. Median and mean of `Vaalikampanjan kulut yhteensa`; Uusimaa subset where `Vaalipiiri/Kunta` contains "Uudenmaan"; share = Σ(`2.x … yhteensa`) / Σ(`Vaalikampanjan rahoitus yhteensa`). The CSV has no elected/alternate flag.

Helper signatures (`src/lib/campaignFinance.ts`):

| Helper | Behaviour |
|---|---|
| `totalRaised(f)` | Σ `f.raised` |
| `gapToBudget(f)` | `max(0, budget − totalRaised)` |
| `percentOf(part, whole)` | one decimal; `0` when `whole` is 0 |
| `formatEuro(n, lang)` | fi/sv `12 345 €` (U+00A0), en `€12,345`; no `Intl.NumberFormat` |
| `formatPercent(p, lang)` | fi/sv `12,3 %`, en `12.3%` |
| `formatAsOf(iso, lang)` | same approach as `src/lib/eventDate.ts` |
| `mergeParty(r)` | `Record<DisplaySource, number>`, party + partyAssociations summed |
| `budgetSegments(f, lang)` | six display sources + `needed`, each `{ id, label, tone, value }` |

Component props:

| Component | Props |
|---|---|
| `FinanceStat` | `label`, `value`, `note?` |
| `FinanceStats` | `items: { label, value, note? }[]` |
| `FinanceBars` | `caption`, `max`, `rows: { emphasis?, label, value }[]`, `unit: 'eur' \| 'percent'`, `lang` |
| `FinanceStack` | `caption`, `segments: { label, tone, value }[]`, `total`, `lang` |
| `FinanceTeaser` | `href`, `lang` |

---

## Dependencies

- [Pages](../pages/spec.md) — page architecture, required frontmatter, DoD.
- [SEO](../seo/spec.md) — hreflang, JSON-LD types, FAQ gating.
- [Design system](../design-system/spec.md) — tokens in `src/lib/styles.ts`, `define:vars`, sanctioned breakpoints.
- [Navigation](../navigation/spec.md) — footer site column pattern; language-switch script and `langAlternates`.

---

## Anti-patterns

- **Do not** format money with `Intl.NumberFormat` — ICU group separators vary by Node build and would break aria goldens.
- **Do not** put figures in `description`, `intro` or FAQ text that is not generated from the data module — they go stale on the next update.
- **Do not** make the bars the only carrier of a number — bars are `aria-hidden` decoration; the legend/value text is the content.
- **Do not** drop zero-value categories from the legend — the zero is the statement.
- **Do not** add a second copy of any figure outside `src/content/campaignFinance.ts`.
- **Do not** use `Dataset` or breadcrumb JSON-LD — `scripts/checks/dist-head.ts` rejects unknown types.
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
