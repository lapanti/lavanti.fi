# Feature: Recommendations

## Blueprint

### Context
A recommendations page presents endorsements from named individuals who vouch for Lauri. The page exists in all three locales but the recommendation text is always in Finnish — no translations are produced for the individual quotes. The page is intended to build trust with voters and supporters.

**Publishing status:** The page is built and accessible by direct URL but intentionally hidden from search engines and AI answer engines until explicitly published. `noindex` and `nofollow` must be set in the page `<head>` and robots must be blocked via the `X-Robots-Tag` header or equivalent until the page is ready to go public. Do not remove these restrictions without explicit instruction.

### Architecture
- **Submissions:** new entries arrive through the `/suosittele` form and an approve command; see `submission-form.md`.
- **Data file (single, shared across locales):** `src/content/recommendations.json`, typed and re-exported by `src/content/recommendations.ts`
  ```ts
  export interface RecommendationLocale {
      alt: string    // descriptive alt text for the portrait, localised
      title: string  // role or title of the person, localised
  }

  export interface Recommendation {
      image: string                            // Cloudinary filename without extension
      locales: Record<'fi' | 'sv' | 'en', RecommendationLocale>
      name: string                             // full name of the person (same across locales)
      recommendation: string                         // free-text endorsement in Finnish
  }

  export const recommendations: Recommendation[]
  ```
  No locale-specific data files — one file, one array. `recommendation` and `name` are Finnish/shared; `alt` and `title` are locale-keyed inside `locales`.

- **Page files (one per locale, same component, same data):**
  - `src/pages/fi/recommendations/index.mdx`
  - `src/pages/sv/recommendations/index.mdx`
  - `src/pages/en/recommendations/index.mdx`
  All three import from `src/content/recommendations.ts` and render the same `Recommendations` component.

- **Component hierarchy:**
  ```
  Recommendations.astro              (grid/list wrapper, receives Recommendation[])
    └── Recommendation.astro         (one card per person)
          ├── CldImage         (portrait, square crop centred on face)
          └── blockquote       (recommendation text, name, title)
  ```

- **Image contract:** portrait images follow the same Cloudinary convention as `titleBanner/Image.astro` — square `1:1` fill crop with `gravity: face`. `alt` must be descriptive (never empty — these are named people, not decorative images).

- **Layout:** uses `PageLayout.astro` via `layout:` frontmatter — same as about/contact pages.

- **Nav:** add a nav link entry to `src/content/nav.ts` for all three locales pointing to `/{lang}/recommendations/`. Language-switch links with `switchToLang` are not needed for this page — the locale-prefix-swap script handles it automatically since all three pages share the same path segment `recommendations`.

- **Frontmatter schema:**
  ```yaml
  layout: '../../../layouts/PageLayout.astro'
  lang: fi                          # or sv / en
  title: 'Suositukset'              # localised page title
  description: '...'               # localised meta description
  slug: 'fi/recommendations'             # locale-prefixed, no trailing slash here
  type: 'WebPage'
  noindex: true                     # must be true until explicitly published
  ```

- **Search/crawler hiding (until published):** The `noindex: true` frontmatter flag must cause `Head.astro` to emit `<meta name="robots" content="noindex, nofollow" />`. Do not add a canonical link or hreflang links for this page while `noindex` is active — search engines should not index it or discover alternate-locale versions. This is implemented as an opt-in flag in `Head.astro`, not a site-wide setting.

- **Dependencies:** Recommendations page MDX ← `src/content/recommendations.ts`. `Recommendations.astro` ← `Recommendation.astro` ← `astro-cloudinary`. Nav entry ← `src/content/nav.ts`.

### Anti-Patterns
- Do not create locale-specific recommendation data files — one `recommendations.ts` file serves all locales; locale variants live inside the `locales` field
- Do not translate the `recommendation` field — the endorsement text is always Finnish regardless of locale
- Do not make `name` locale-specific — the person's name is the same across all locales
- Do not use `alt=""` on portrait images — these are identified individuals, not decorative images; alt must name the person
- Do not embed recommendation data directly in MDX files — keep it in `src/content/recommendations.ts` so all three locale pages stay in sync automatically
- Do not add `switchToLang` nav links for this page — the path segment `recommendations` is the same in all locales, so the existing locale-prefix-swap script handles language switching correctly
- Do not remove `noindex: true` from the frontmatter or the `<meta name="robots">` tag without explicit instruction to publish — the page is intentionally hidden from search and AI answer engines until then
- Do not add the recommendations page to the sitemap while `noindex` is active

---

## Contract

### Definition of Done
- [ ] `src/content/recommendations.ts` exports `Recommendation[]` with all required fields typed (including `locales` with `alt` and `title` per locale)
- [ ] Every `Recommendation` entry has a non-empty `alt` in each locale describing the person in the image
- [ ] `image` values are Cloudinary filenames without extension
- [ ] Pages exist at `src/pages/fi/recommendations/index.mdx`, `src/pages/sv/recommendations/index.mdx`, `src/pages/en/recommendations/index.mdx`
- [ ] All three pages import from the same `recommendations.ts` — no data duplication
- [ ] Nav entries added to `src/content/nav.ts` for all three locales (can be added at publish time if the page should remain unlisted until then)
- [ ] `<meta name="robots" content="noindex, nofollow" />` is present in `<head>` (via `noindex: true` frontmatter → `Head.astro`) until explicitly published
- [ ] No canonical link or hreflang links are emitted while `noindex` is active
- [ ] Page title and description are localised in each locale's MDX frontmatter
- [ ] `/{lang}/recommendations/` renders correctly in all three locales
- [ ] `npm run build` passes (lint and type-check are enforced by pre-commit hooks and CI)
- [ ] Accessibility scan passes (no axe violations — especially alt text and heading structure)
- [ ] E2E tests added and passing

### Regression Guardrails
- All three locale pages must import from the same `src/content/recommendations.ts` — drift between locales is the primary risk
- Adding a `recommendations` nav link must be done for all three locales in `nav.ts` simultaneously — partial nav updates break the mobile/desktop menu symmetry
- Portrait images must use face-centred square crop — changing crop type breaks visual consistency with other portrait images on the site

### Scenarios

**Scenario: Recommendations page renders the same content in all locales**
- Given: `recommendations.ts` has 5 entries
- When: A visitor navigates to `/fi/recommendations/`, `/sv/recommendations/`, or `/en/recommendations/`
- Then: All three pages render the same 5 recommendation cards with Finnish recommendation text; the page title and surrounding UI chrome are in the respective locale language

**Scenario: Language switch from Finnish recommendations page**
- Given: A visitor is on `/fi/recommendations/`
- When: They click the Swedish language-switch nav link
- Then: The inline script swaps `/fi/` → `/sv/` and lands on `/sv/recommendations/`, which exists

**Scenario: New recommendation added**
- Given: A new `Recommendation` entry is appended to `recommendations.ts`
- When: The site is built
- Then: The new card appears on all three locale pages without any change to the MDX files or components

**Scenario: Missing image**
- Given: A `Recommendation` entry has `image: ''` or an invalid Cloudinary filename
- When: The page renders
- Then: `CldImage` receives an empty src — the component must guard against this (render nothing or a placeholder) to avoid a broken image element

**Scenario: Page is hidden from search engines before publishing**
- Given: All three locale pages have `noindex: true` in frontmatter
- When: A search engine or AI crawler visits `/{lang}/recommendations/`
- Then: The response contains `<meta name="robots" content="noindex, nofollow" />`; no canonical or hreflang links are present; the page is not listed in the sitemap

**Scenario: Page is published**
- Given: Explicit instruction to publish the recommendations page is received
- When: `noindex: true` is removed from all three locale frontmatter files
- Then: `Head.astro` emits canonical and hreflang links normally; the robots meta tag is absent; nav links are added if not already present; the page may be added to the sitemap

**Scenario: Recommendation with long text**
- Given: A recommendation entry has a multi-paragraph `recommendation` string
- When: The card renders
- Then: The text is displayed in full inside the `<blockquote>`; layout does not break at any viewport width
