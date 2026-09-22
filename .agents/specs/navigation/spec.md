# Feature: Navigation

## Blueprint

### Context
The header navigation provides the primary wayfinding for all three locales. It has two rendered variants (mobile and desktop) that coexist in the DOM at all times. Language switching is handled by a client-side script that rewrites hrefs on page load — there is no server-side i18n routing.

### Architecture
- **Nav data:** `src/content/nav.ts` — single source of truth. `navLinks: Record<Lang, NavLink[]>` defines all links per locale. `skipLinks: Record<Lang, {...}>` defines skip-link labels.
- **NavLink interface:**
  ```ts
  interface NavLink {
      href: string        // absolute path, e.g. "/fi/about/"
      label: string       // visible text
      switchToLang?: Lang // if set, link gets data-switch-to-lang and is rewritten by the inline script
      title: string       // aria-label for the link
  }
  ```
- **Footer site column:** `src/components/Footer.astro` renders `navLinks[lang]` minus the language switches, plus one footer-only item — the newsletter archive (`archivePath(lang)`, label in `src/content/footer.ts`). Anything else that should appear in both header and footer goes through `nav.ts`.
- **Component tree:** `BaseLayout` → `src/components/Header.astro` → `src/components/header/SkipLinks.astro` + `src/components/header/MobileMenu.astro` + `src/components/header/DesktopMenu.astro` → `MainNavigationLink` + `NavigationLink`
- **Responsive split:** MobileMenu is visible below 1200px; DesktopMenu is visible at 1200px+. Both are always in the DOM — CSS `display:none` hides the inactive one. This is why e2e selectors use `.nth(0)` (mobile) vs `.nth(1)` (desktop).
- **Mobile menu toggle:** A CSS-only hamburger — `<input type="checkbox">` drives the open/closed state via sibling selectors. No JS.
- **Active link state:** `aria-current="page"` is set at build time:
  - `MainNavigationLink`: `pathname === href` (exact match for home)
  - `NavigationLink`: `pathname.startsWith(href)` (prefix match for section links)
- **Language-switch script** (in `BaseLayout.astro`):
  ```js
  // window.__langAlternates is injected by BaseLayout when langAlternates prop is set (blog posts only)
  document.querySelectorAll('a[data-switch-to-lang]').forEach(function(a) {
      var lang = a.getAttribute('data-switch-to-lang')
      if (!lang) return
      var alt = window.__langAlternates
      if (alt && alt[lang]) { a.href = alt[lang]; return }
      a.href = window.location.pathname.replace(/^\/(fi|sv|en)\//, '/' + lang + '/')
  })
  ```
  On blog post pages, `PostLayout` computes `langAlternates` via `getPostAlternates(id)` and passes it to `BaseLayout`, which serialises it as `window.__langAlternates`. The script uses this map to resolve the correct translated slug. On all other pages the map is absent and the script falls back to a plain prefix swap.
- **`getPostAlternates`** (`src/lib/posts.ts`): Build-time helper that filters posts by `id` and returns a `Record<Lang, string>` mapping each locale to its canonical post URL.
- **Skip links:** `SkipLinks.astro` renders two visually hidden links (`#main`, `#footer`) that become visible on focus — keyboard accessibility requirement.
- **Dependencies:** All layouts → `BaseLayout` → `Header`. Nav data is used nowhere else.

### Anti-Patterns
- Do not add nav links directly in `.astro` files — always update `src/content/nav.ts`, or the language-switch script won't know about them
- Do not extend the prefix-swap script with arbitrary per-page logic — use the `langAlternates` prop on `BaseLayout` instead (only `PostLayout` sets this)
- Do not use JS to toggle the mobile menu — the hamburger is intentionally CSS-only (`input[type=checkbox]`) for performance and simplicity
- Do not use `aria-current="true"` — the correct value is `"page"` for navigation links
- Do not render only one menu variant and hide it — both must be in the DOM for the `isMobile` test selector pattern to work

---

## Contract

### Definition of Done
- [ ] All nav links for all three locales are defined in `src/content/nav.ts`
- [ ] Language-switch links have `switchToLang` set and their `href` points to the locale's home page (script overwrites it at runtime, but fallback must be valid)
- [ ] Active link has `aria-current="page"` on the correct link for the current page
- [ ] Skip links to `#main` and `#footer` are present and focusable via keyboard
- [ ] Mobile hamburger opens/closes purely via CSS checkbox state
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Accessibility scan passes (no axe violations)

### Regression Guardrails
- The mobile/desktop DOM duplication must be preserved — removing either menu breaks the `isMobile` nth-selector pattern in all e2e page objects
- `aria-current` must be set at build time from `Astro.url.pathname` — do not attempt to set it client-side
- The language-switch regex `^\/(fi|sv|en)\/` must match all three locales — adding a fourth locale requires updating both the script and the regex
- `skipLinks` labels are HTML-encoded (`&#x27A1;`) — never pass them through `{label}` interpolation; use `set:html`

### Scenarios

**Scenario: Desktop nav shows active page**
- Given: A visitor is on `/fi/about/`
- When: The page renders
- Then: The about nav link has `aria-current="page"`; other links have `aria-current="false"`

**Scenario: Mobile hamburger opens menu**
- Given: A visitor is on a mobile viewport (< 1200px)
- When: They click the hamburger checkbox
- Then: The `.links` container height expands to `100dvh - headerSize`; nav links become visible (`opacity: 100%`); no JavaScript is involved

**Scenario: Language switch on a blog post resolves translated slug**
- Given: A visitor is on `/fi/blog/10/sote-on-hyvinvointiyhteiskunnan-kulmakivi/`
- When: The page loads and the inline script runs
- Then: The SV language-switch link's `href` is set to `/sv/blog/10/sote-ar-valfardssallets-hordsten/` (from `window.__langAlternates`); the EN link is set to `/en/blog/10/sote-is-the-cornerstone-of-the-welfare-society/`

**Scenario: Language switch on a non-post page uses prefix swap**
- Given: A visitor is on `/fi/about/`
- When: The page loads and the inline script runs
- Then: `window.__langAlternates` is `null`; the SV link's `href` is rewritten by prefix swap to `/sv/about/`

**Scenario: Skip link is keyboard accessible**
- Given: A visitor navigates by keyboard on any page
- When: They press Tab on page load
- Then: The first focusable element is the "skip to main content" link; it becomes visible when focused; activating it moves focus to `#main`

**Scenario: New nav link added for all locales**
- Given: A new "Events" page is being added at `/{lang}/events/`
- When: The nav entry is added to `navLinks` in `src/content/nav.ts` for all three locales
- Then: The link appears in both MobileMenu and DesktopMenu; no changes to Header, MobileMenu, or DesktopMenu components are needed
