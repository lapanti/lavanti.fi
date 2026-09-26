# Feature: Design System

## Blueprint

### Context
All visual design tokens — spacing, colours, typography, and layout grid constants — are centralised in `src/lib/styles.ts`. Components consume these via Astro's `define:vars` CSS variable injection. This prevents magic numbers from spreading across component stylesheets.

### Architecture
- **File:** `src/lib/styles.ts` — exports typed TypeScript constants, no CSS files

- **Token categories:**

  **Spacing (`sizes`)** — numeric keys map to rem values:
  ```ts
  sizes[0.25] = '0.25rem'  // 4px
  sizes[0.5]  = '0.5rem'   // 8px
  sizes[1]    = '1rem'     // 16px
  sizes[1.5]  = '1.5rem'   // 24px
  sizes[2.5]  = '2.5rem'   // 40px
  sizes[5]    = '5rem'     // 80px — header height
  sizes[75]   = '75rem'    // 1200px — max content width
  // ... and more
  ```

  **Z-indices (`zIndices`):** `50` (header), `100` (skip links)

  **Named layout constants:**
  ```ts
  HEADER_SIZE     = sizes[5]      // 80px — sized to fit the two-line NameLogo wordmark (measured ~72px tall transformed) with margin
  CONTENT_SIZE    = sizes[75]     // 1200px
  CONTENT_PADDING = sizes[0.5]    // 8px
  ```

  **Grid constants:**
  ```ts
  gridTemplateColumnsArticle  // 5-column grid: 1fr padding content padding 1fr
  gridTemplateRowsLayout      // desktop: 1fr 6rem (footer)
  gridTemplateRowsLayoutMobile// mobile: 1fr 9rem (taller footer)
  gridTemplateColumns         // outer: repeat(1, minmax(0, 1fr))
  gridAreas                   // { main: 'main', footer: 'footer' }
  ```

  **Colours (`colors`):**
  - Brand: `forestGreen` (dark green `rgb(22,62,53)` — the active dark-block background color), `white` (primary text on dark blocks), `sky` (`#bbdde6` — accent)
  - UI: `black`, `gray`, `transparent`, `darkGreenText`
  - Other named colours (not part of the current brand identity, but still defined and in use for specific cases): `peach`, `sand`, `moss`, `evening` (teal `rgb(0,98,114)` — retained in the token file but no longer consumed by any component; kept for possible future use, not dead code to be removed on sight)
  - Social platform brand colours: `bluesky`, `facebook`, `linkedin`, `mastodon`, `threads`, `instagramGradient`, `regionalPurple`
  - Overlay: `forestGreen70` (70% opacity dark green), `evening70` (70% opacity teal, unused alongside `evening`)

  **Typography (`typographics`)** — pre-composed font stacks:
  ```ts
  typographics.h1         = { fontFamily, fontSize, fontWeight, lineHeight }
  typographics.body       = { fontFamily, fontSize, fontWeight, lineHeight }
  typographics.additionalInfo = { ... }
  // etc.
  ```

  **Font sizes (`fontSizes`)** — keyed by rem value with pre-computed `fontSize` and `lineHeight`:
  ```ts
  fontSizes[1.5]  = { fontSize: '1.5rem', lineHeight: '...' }
  fontSizes[1.75] = { fontSize: '1.75rem', lineHeight: '...' }
  ```
  Line-height is a **unitless multiplier**, not an absolute rem value — it scales proportionally with its paired font-size rather than locking in a fixed value. Most entries use `'1.2'`. **Exception:** the three sizes that render as literal `<p>` elements site-wide (`fontSizes[1]`, `fontSizes[1.25]` — body — and `fontSizes[1.875]` — ingress) use `'1.5'` instead, because WCAG 1.4.8 (enforced by this repo's `siteimprove`/`sia-r73` e2e check) requires paragraph line-spacing of at least 1.5×. If a new size is added and will be consumed by a `<p>`-rendering component, it needs `'1.5'`, not `'1.2'`.

  **`fontWeights.black` = `900`** — the heaviest weight of the current heading font (Big Shoulders Display), which is also the standard CSS `font-weight: 900` ("black"). Shared by `typographics.h1`, `typographics.h2`, and the name-logo pattern below.

  **Name-logo pattern** — the "Lauri Lavanti" wordmark is a reusable shape, not a one-off style: Big Shoulders Display Black, white text, uppercase, `rotate(-10deg) skew(-10deg)` applied once to the whole two-line block (not per line), with "Lauri" and "Lavanti" always forced onto their own lines. Uppercase is CSS `text-transform` only — the underlying text stays "Lauri"/"Lavanti" so the accessible name is unaffected. It appears at two sizes — small (nav header, `fontSizes[1.5]`, 24px) and large (homepage hero h1, `typographics.h1`, 48px) — both implemented by the single `src/components/NameLogo.astro` component, parameterized by a `size` prop. Any new place this wordmark is needed should reuse `NameLogo`, not re-implement the transform/line-break.

- **Usage pattern in components:**
  ```astro
  <style define:vars={{ colorsForestGreen: colors.forestGreen, sizes1: sizes[1] }}>
      div { background: var(--colorsForestGreen); padding: var(--sizes1); }
  </style>
  ```
  The variable name in `define:vars` becomes the CSS custom property name. Convention: `camelCase(exportName) + key`.

- **Breakpoint:** `1200px` is the single breakpoint used throughout. It corresponds to `CONTENT_SIZE` (`sizes[75]`). Not exported as a constant — hardcoded in each component's media query.

- **Dependencies:** Almost all components import from `styles.ts`. Changes here propagate everywhere.

- **Motion** — the brand is "a builder, not a commentator": calm, declarative, no hype. Motion follows the Signal Band print metaphor — flat at rest, inverted on hover, a press when held — and is quick, mechanical, and never decorative.

  **Tokens** live in raw CSS on `:root` in `src/components/GlobalStyle.astro` (not `styles.ts`, because the reduced-motion switch is a media query):
  ```css
  --dur-base: 0.18s;  /* colour / background / border inverts */
  --dur-fast: 0.12s;  /* press transforms */
  --dur-menu: 0.28s;  /* mobile menu opening (closing uses --dur-base) */
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
  --press: 2px;       /* :active offset; 1px presses use calc(var(--press) / 2) */
  ```
  `@media (prefers-reduced-motion: reduce)` zeroes all three durations and `--press` in one place. Components consume the tokens directly and never carry their own reduced-motion override. Smooth scrolling and view transitions are declared only under `no-preference`.

  **Approved patterns:**
  - Hover/focus inverts over `--dur-base`; `:active` presses by `--press` over `--dur-fast`.
  - Cross-page crossfade: `@view-transition { navigation: auto }`, 200ms. The solid header holds `view-transition-name: site-header`; hero headers stay unnamed.
  - Signal stripe: the full-size `.stripes` band draws in once, scroll-driven (`animation-timeline: view()`), complete once fully visible. The slim and vertical bands are static. Keep `animation-timeline` out of the rule that sets the `animation` shorthand — the minifier folds it in and Chrome drops the declaration.
  - Content links thicken their underline to 3px on hover.
  - Mobile menu: `<button popovertarget="mobile-nav">` + `<nav id="mobile-nav" popover>`, no JS. The button is a printed text button labelled from `menuLabel` in `src/content/nav.ts`. The panel unrolls with a `clip-path` keyframe animation and closes with a `clip-path` transition (`display`/`overlay` `allow-discrete`); links stagger by `var(--dur-fast) / 3`, index capped at 4. Panel layout: top- and left-aligned list (never `justify-content: center` — it clips the first link once the list overflows), current page marked by an aqua leading rule, language chips pinned low, a static 1.25rem five-band stripe as the closing edge, and a hairline under the hero bar. Do not use `@starting-style`: Siteimprove Alfa (the e2e a11y gate) cannot parse it and drops the rest of the stylesheet, failing sia-r73 site-wide. Without the Popover API the links render inline.

### Anti-Patterns
- Do not hardcode pixel or rem values in component `<style>` blocks — always pull from `styles.ts` via `define:vars`
- Do not add new colours without including a semantic name that describes the use case, not just the value
- Do not add a spacing value that isn't a multiple of 0.125rem (2px) — the scale is intentionally aligned to the 2px grid
- Do not add a second breakpoint — the design is intentionally single-breakpoint at 1200px
- Do not export CSS strings directly from `styles.ts` — only export TypeScript constants that get injected via `define:vars`
- Do not duplicate `typographics` values inline in a component — if a typographic style is needed, it should exist in `styles.ts`
- Do not hardcode transition durations or press offsets — use the motion tokens so reduced motion keeps working
- Do not add scroll-reveal fade-ins, entrance animations on hero content, parallax, zoom/scale hovers, or looping motion — they hide content from crawlers and answer engines, hurt perceived LCP, read as hype, and break the screenshot goldens
- Do not animate layout properties (`height`, `top`, `width`) — use `transform`, `opacity` or `clip-path`

---

## Contract

### Definition of Done
- [ ] New token is added to `styles.ts` with a typed `as const` assertion
- [ ] New token is consumed via `define:vars` in the component, not as a hardcoded value
- [ ] If a new colour is added for a social platform, it is named after the platform (e.g. `bluesky`, `mastodon`)
- [ ] Lint and type-check are enforced by pre-commit hooks and CI

### Regression Guardrails
- `HEADER_SIZE = sizes[3.75]` (60px) is used for both the mobile `<header>` height and the mobile menu popover's top offset — changing this value changes both simultaneously; test both on mobile and desktop
- The header has its own breakpoint, 1024px, separate from the 768px page layout: below it (phones and tablets) the header is the 60px bar with the popover menu; from 1024px it is a 68px bar on every page type, hero and solid alike, with the wordmark overhanging the bar (absolute, `top: 14px`) and the nav padded clear of it. The desktop nav does not fit beside the wordmark below ~1000px, so do not move the switch lower. The front page hides the bar wordmark wherever its desktop hero shows the large one (≥769px).
- Closed mobile menu links must stay out of the tab order and accessibility tree; the `*-banner-Mobile-Chrome.aria.yml` snapshots and `tests/e2e/mobileMenu.spec.ts` guard this
- `gridTemplateColumnsArticle` uses `CONTENT_SIZE` and `CONTENT_PADDING` inline — changing any of those three values changes the article column layout for every page
- Social platform colour tokens (`colors.bluesky`, `colors.facebook`, etc.) are consumed by Footer and SocialShare — changing a colour value changes every appearance of that platform's branding

### Scenarios

**Scenario: New spacing value needed**
- Given: A new component needs `2.75rem` spacing not currently in `sizes`
- When: The value is added: `sizes[2.75] = '2.75rem' as const`
- Then: The component consumes it via `define:vars={{ sizes275: sizes[2.75] }}`; the CSS uses `var(--sizes275)`

**Scenario: New social platform colour added**
- Given: A new social platform `Threads` needs its brand colour
- When: `threads: 'rgb(0, 0, 0)' as const` is added to `colors`
- Then: The Footer and any social share component reference `colors.threads` via `define:vars`; no hardcoded hex values appear in component CSS

**Scenario: Header height change**
- Given: `HEADER_SIZE` is changed from `sizes[3.75]` to `sizes[4]`
- When: The site is built
- Then: The `<header>` height changes; the mobile menu's `top` offset changes to match; the `gridTemplateRowsLayout` and `gridTemplateRowsLayoutMobile` may need updating if they depended on the header height

**Scenario: Component needs typographic style**
- Given: A new component needs the same font style as `typographics.additionalInfo`
- When: The component is written
- Then: It imports `typographics` and uses `define:vars={{ additionalInfoFontFamily: typographics.additionalInfo.fontFamily, ... }}`; it does not copy-paste the font values
