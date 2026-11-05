# Feature: SEO & Metadata

## Blueprint

### Context
Every page emits structured metadata for search engines and social platforms: JSON-LD schema, Open Graph tags, hreflang alternate links, canonical URLs, and Twitter/X card tags. All of this is generated in `Head.astro` at build time.

### Architecture
- **Entry point:** `src/components/Head.astro` — consumes props from `BaseLayout`, generates all `<head>` content
- **JSON-LD types:** defined in `src/lib/jsonld.ts` as typed constants:
  ```ts
  BLOGPOSTING    = 'BlogPosting'
  COLLECTIONPAGE = 'CollectionPage'
  PERSON         = 'Person'
  WEBPAGE        = 'WebPage'
  WEBSITE        = 'WebSite'
  ```
  If `type` is missing or not in `JSON_LD_TYPES`, the schema falls back to `WebPage`. `WEBSITE` is not in `JSON_LD_TYPES`: no page selects it as its own type (see the WebSite node below).
- **Schema fields by type:**

  | Type | Extra fields |
  |---|---|
  | `BlogPosting` | `datePublished`, `dateModified`, `mainEntityOfPage`, `image` (ImageObject), `primaryImageOfPage` (ImageObject), `publisher` (Person reference) |
  | `CollectionPage` | `inLanguage`; with `collection`, `about` (DefinedTerm) and `mainEntity` (ItemList) |
  | `Person` | `jobTitle` (locale-specific), `description` (locale-specific), `knowsAbout[]`, `memberOf[]` (PoliticalParty Vihreä liitto, Organization Markkinavihreät), `sameAs` |
  | `ProfilePage` | `mainEntity` (the canonical Person node) |
  | `WebPage` | on the candidate pages (`CANDIDATE_PAGE_SLUGS` in `src/lib/jsonld.ts`), `about: { '@id': PERSON_ID }` |

- **WebSite node:** every page emits one sibling `<script>` block after the primary one: `@id` `https://lavanti.fi/#website` (`WEBSITE_ID`), `@type: WebSite`, `name`, `url` (site root), `inLanguage` (page locale), `publisher: { '@id': PERSON_ID }`.
- **Graph links:** every `WebPage`, `BlogPosting`, `CollectionPage` and `ProfilePage` carries `isPartOf: { '@id': WEBSITE_ID }`. The `Person` node (home pages) does not: it is not a CreativeWork. Every reference to Lauri outside the canonical Person node — generic-page `author`, BlogPosting `author` and `publisher`, Event `organizer` and `performer` — carries `@id: PERSON_ID`, with `name` and `url` alongside for engines that read one page in isolation. Guest co-authors have no `@id`.

- **Supplemental FAQPage schema:** When a `BlogPosting` page includes a `faq` prop with 2 or more `{q, a}` entries, a second `<script type="application/ld+json">` block is emitted with `@type: FAQPage`. This block coexists alongside the primary `BlogPosting` schema — it does not replace it. The `FAQPAGE` constant is exported from `src/lib/jsonld.ts` but is **not** added to `JSON_LD_TYPES` (which lists only primary page types). The `faq` prop flows from MDX frontmatter → `PostLayout` → `BaseLayout` → `Head`.

- **All schemas always include:** `@context`, `@type`, `author`, `description`, `headline`, `url`, and `image` (if `ogImage` provided). For `BlogPosting`, `image` is an `ImageObject` `{ '@type': 'ImageObject', url, width: 1200, height: 630 }` and `primaryImageOfPage` (same shape) is also emitted. All other types emit `image` as a bare URL string. See [imageobject.md](./imageobject.md).

- **Canonical URL derivation:**
  - `slug === 'index'` → `Astro.site` (site root)
  - `slug` present → `new URL(slug + '/', Astro.site)`
  - `slug` absent → no canonical tag

- **hreflang generation:** When `langAlternates` is provided (blog posts), uses the pre-computed per-locale URLs directly. Otherwise swaps the leading locale segment of `slug` for each language:
  ```ts
  // With langAlternates (PostLayout sets this for blog posts):
  new URL(langAlternates[l], Astro.site)
  // Fallback for non-post pages:
  slug.replace(/^(fi|sv|en)/, l) + '/'
  ```
  All three locales always get an `alternate` link, including the current page's own locale, plus an `x-default` link to the Finnish URL.
- **`langAlternates` prop:** Optional `Record<Lang, string>` passed from `PostLayout` via `BaseLayout`. Contains the canonical path for each locale (e.g. `/sv/blog/10/sote-ar-valfardssallets-hordsten/`). When absent, the regex-swap fallback is used.

- **og:image:** Passed in as a pre-computed URL string from the layout. Layouts use `getCldImageUrl` from `astro-cloudinary/helpers` to generate a 1200×630 fill crop. `Head.astro` does not call Cloudinary — it only emits the URL it receives.

- **Title format:** `title === 'Lauri Lavanti' ? title : `${title} | Lauri Lavanti``
- **Title length:** The final rendered `<title>` must be 50–60 characters inclusive. Measured after stripping soft-hyphen characters (`\u00AD`) and applying the suffix rule. Enforced at build time by `scripts/check-overflow.mjs` via `npm run validate-page-titles`.

- **og:type:** `'article'` for `BlogPosting`, `'website'` for everything else

- **article:section / article:tag:** `BlogPosting` only. One `article:tag` per tag, `article:section` is the first. Content is the tag name in the page locale, `getTagName(id, lang)` with soft hyphens stripped (falls back to the id for an unregistered tag), never the English tag id

- **Twitter card:** `summary_large_image` when `ogImage` is set, `summary` otherwise

- **Prop flow:** `MDX frontmatter` → layout (FrontPageLayout / PostLayout / PageLayout) → `BaseLayout` → `Head`

- **Dependencies:** `Head` depends on `src/lib/jsonld.ts` for type constants. Layouts depend on `getCldImageUrl` from `astro-cloudinary/helpers` for og:image URL generation.

### Anti-Patterns
- Do not call `getCldImageUrl` inside `Head.astro` — it must receive a pre-computed URL string; image URL generation is the layout's responsibility
- Do not add a new **primary** JSON-LD type (set via the `type` prop on `Head`) without: (1) adding the constant to `src/lib/jsonld.ts`, (2) adding it to `JSON_LD_TYPES`, (3) defining which extra fields it emits in `Head.astro`. Supplemental/secondary schema types (e.g. `FAQPage`) that coexist alongside the primary type are exported as constants from `jsonld.ts` but must **not** be added to `JSON_LD_TYPES` — they are emitted as separate `<script>` blocks via dedicated props, not via the `type` prop
- Do not hardcode social profile URLs in `Head.astro` outside the defined constants — keep them in the named variables so they're easy to update
- Do not set `slug` to a value that includes a trailing slash — the canonical URL builder appends one
- Do not point `x-default` anywhere but the Finnish alternate — Finnish is the default locale
- Do not use `type === undefined` to mean "no schema" — an undefined type renders a `WebPage` schema, which is correct for pages without an explicit type
- Do not emit a second `WebSite` node or write a Person reference to Lauri without `@id: PERSON_ID` — `scripts/checks/dist-head.ts` fails the build on both

---

## Contract

### Definition of Done
- [ ] Every page has `<title>`, `<meta name="description">`, `<link rel="canonical">`, and three `<link rel="alternate" hreflang>` tags
- [ ] `BlogPosting` pages have `datePublished` and `dateModified` in JSON-LD
- [ ] `Person` pages have locale-specific `jobTitle` and `description` in JSON-LD
- [ ] Every page emits exactly one `WebSite` node (`@id` `https://lavanti.fi/#website`), and every page entity links to it with `isPartOf`
- [ ] Every Person reference to Lauri except the canonical node carries `@id: PERSON_ID`
- [ ] Pages with `heroImage` emit `og:image` at 1200×630
- [ ] `og:type` is `article` for posts, `website` for all other pages
- [ ] Twitter card is `summary_large_image` when image present, `summary` otherwise
- [ ] `npm run test` passes (jsonld.spec.ts validates type constants)
- [ ] Every page `<title>` is 50–60 characters (soft hyphens stripped, suffix applied); confirmed by `npm run validate-page-titles`

### Regression Guardrails
- `JSON_LD_TYPES` must stay in sync with the constants exported from `jsonld.ts` — the spec test enforces this
- The hreflang regex `^(fi|sv|en)` must match all active locales — adding a fourth locale requires updating this regex
- Every MDX page must declare `updatedDate`; `PostLayout` reads it directly with no fallback. The strict sitemap helper enforces presence at build time

### Scenarios

**Scenario: Blog post page metadata**
- Given: A post with `heroImage`, `publishDate: '2024-01-01'`, `updatedDate: '2024-06-01'`, `lang: 'fi'`, `id: 10`
- When: The page is built
- Then: JSON-LD type is `BlogPosting`; `datePublished` is `2024-01-01`; `dateModified` is `2024-06-01`; `og:type` is `article`; `og:image` is a 1200×630 Cloudinary fill URL; Twitter card is `summary_large_image`; three hreflang links point to the correct translated slugs from `langAlternates` (not a prefix swap)

**Scenario: Home page (Person type) metadata**
- Given: `src/pages/fi/index.mdx` with `type: 'Person'`, `slug: 'fi'`
- When: The page is built
- Then: JSON-LD type is `Person`; `jobTitle` is the Finnish value from `personJobTitle` in `src/content/person.ts` (currently `'eduskuntavaaliehdokas, kunnanvaltuutettu ja johtava ohjelmistokehittäjä ja DI'`); `memberOf` lists `Vihreä liitto` and `Markkinavihreät`; canonical URL is `https://lavanti.fi/fi/`; hreflang for `sv` points to `https://lavanti.fi/sv/`

**Scenario: Page without slug**
- Given: A page rendered without a `slug` prop
- When: The page is built
- Then: No `<link rel="canonical">` is emitted; no `og:url` is emitted; hreflang links are not emitted

**Scenario: Missing or unknown type**
- Given: A page passes `type: undefined` or an unknown string
- When: `Head.astro` processes it
- Then: JSON-LD `@type` falls back to `WebPage`; no type-specific extra fields are added; the separate `WebSite` node is still the only `WebSite` on the page

**Scenario: Candidate page graph**
- Given: `src/pages/fi/eduskuntavaalit/index.mdx` with `type: 'WebPage'`, `slug: 'fi/eduskuntavaalit'`
- When: The page is built
- Then: The `WebPage` node has `about: { '@id': PERSON_ID }`, `author` with `@id: PERSON_ID`, and `isPartOf: { '@id': 'https://lavanti.fi/#website' }`; each Event node's `organizer` and `performer` carry `@id: PERSON_ID`; exactly one `WebSite` node is emitted

**Scenario: Title formatting**
- Given: A page with `title: 'Laurista'`
- When: The `<title>` tag is rendered
- Then: It reads `Laurista | Lauri Lavanti`; if `title` is `'Lauri Lavanti'`, it reads just `Lauri Lavanti`

**Scenario: Blog post with FAQPage schema**
- Given: A `BlogPosting` page with `faq: [{q: '...', a: '...'}, {q: '...', a: '...'}]`
- When: The page is built
- Then: Two `<script type="application/ld+json">` blocks are emitted — the first with `@type: BlogPosting`, the second with `@type: FAQPage`. The FAQPage block has `mainEntity` with one `Question` per entry, each with an `acceptedAnswer`.

**Scenario: Title length enforcement**
- Given: An MDX file whose rendered title is outside 50–60 chars
- When: `npm run validate-page-titles` or `npm run build` is run
- Then: Script exits 1 and prints `ERROR: title length N (expected 50–60): "…" — src/pages/…/index.mdx`

**Scenario: FAQPage not emitted with fewer than 2 entries**
- Given: A `BlogPosting` page with `faq: [{q: '...', a: '...'}]` (only one entry)
- When: The page is built
- Then: Only the primary `BlogPosting` JSON-LD block is emitted; no FAQPage block appears.

**Scenario: Person page with FAQPage schema**
- Given: A page with `type: 'Person'` and `faq` with 2+ entries (e.g. home or about page)
- When: The page is built
- Then: Two `<script type="application/ld+json">` blocks are emitted — the first with `@type: Person`, the second with `@type: FAQPage`.

**Scenario: Category page (CollectionPage type) metadata** *(FAQPage part planned — `LocalTag` has no `faq` field yet and the category route does not pass one)*
- Given: A tag category page with `type: 'CollectionPage'`, `heroImage`, `description`, `faq` (2+ entries for the locale)
- When: The page is built
- Then: JSON-LD `@type` is `CollectionPage`; base fields (`author`, `description`, `headline`, `url`, `image`) are emitted; `og:type` is `website`; Twitter card is `summary_large_image`; a second JSON-LD block with `@type: FAQPage` is emitted; a visible `<FaqSection>` is rendered in the page body below `<ExcerptList>`.

---

## Sitemap & lastmod

### Blueprint

- **Generated by:** `@astrojs/sitemap` configured in `astro.config.mjs`
- **Date source:** `src/lib/sitemapLastmod.ts` builds a `Map<urlPath, isoDate>` at config-load time by:
  - Scanning every `src/pages/**/*.mdx` for `updatedDate` (required field, no fallback)
  - Reading `updatedDate` from each tag in `src/content/tags/` for category URLs
- **Serialization:** the `sitemap()` integration's `serialize` function decodes the URL pathname (so non-ASCII slugs match), looks it up in the map, and attaches `lastmod` when present
- **Strictness:** the helper throws at config-load if any MDX page is missing `updatedDate` — silent omission is not allowed
- **Output format:** the sitemap plugin's Zod schema is `z.date().optional()`; string ISO dates are coerced into `Date` and re-serialised as W3C ISO datetime (`YYYY-MM-DDTHH:mm:ss.sssZ`), which is valid per sitemaps.org and accepted by search engines
- **Filter (unchanged):** excludes bare `/[lang]/blog/[id]/` redirect pages, `/kategoria/` legacy redirects, and `/(en|fi|sv)/recommendations/` pages
- **hreflang alternates:** `src/lib/sitemapAlternates.ts` registers an integration listed before `sitemap()`. Its `astro:build:done` reads each built page's `<link rel="alternate" hreflang>` set (including `x-default`), and `serialize` attaches it as `links`, rendered as `<xhtml:link>`. The sitemap therefore carries exactly the alternates `Head.astro` emits. Alternates whose target is not a built page or fails the sitemap filter are dropped; a URL left with fewer than two locales gets no `links`
- **`/sitemap.xml`:** the plugin writes `sitemap-index.xml`; `_redirects` sends `/sitemap.xml` there with a 301 (`fileRedirects` in `src/lib/redirectsIntegration.ts`)

### Anti-Patterns

- Do not add `updatedDate` as an optional field anywhere — `LocalTag.updatedDate` and the MDX frontmatter are both required
- Do not fall back to `publishDate` when `updatedDate` is missing; missing `updatedDate` is an error, not a soft case
- Do not add inline date-extraction helpers in `astro.config.mjs` — extend `src/lib/sitemapLastmod.ts` instead
- Do not emit `<changefreq>` or `<priority>`; both are deliberately omitted
- Do not use the `i18n` option of `@astrojs/sitemap` — it swaps the locale prefix, which is wrong for posts, categories and pages whose slugs differ per locale
- Do not move `sitemapAlternates.integration` after `sitemap()` — the map would be empty when `serialize` runs

### Contract

#### Definition of Done
- [ ] Every URL in `dist/sitemap-0.xml` carries a `<lastmod>` element (count of `<lastmod>` equals count of `<url>`)
- [ ] A URL's `<xhtml:link>` set in `dist/sitemap-0.xml` equals the `<link rel="alternate" hreflang>` set in its built HTML, minus targets outside the sitemap
- [ ] Every MDX page under `src/pages/` declares `updatedDate` in frontmatter, and every post under `src/content/posts/` has `updatedDate` in its `meta.json` (build fails otherwise)
- [ ] Every tag in `src/content/tags/` declares `updatedDate` (TS error otherwise)
- [ ] `PostLayout` emits `dateModified` directly from `updatedDate` — no fallback
- [ ] `npm run test` passes; `npm run check` is clean; `npm run build` succeeds

#### Regression Guardrails
- `LocalTag.updatedDate` is required, not optional — TypeScript prevents new tags from shipping without it
- `updatedDate` is a required field on the posts collection schema (`src/content.config.ts`) — Astro's content-layer sync surfaces missing-date posts at build/check time
- Adding a fourth locale requires updating both the helper's category-URL emission and the existing hreflang regex
- New MDX pages without `updatedDate` fail the build at config-load time, not at deploy time

#### Scenarios

**Scenario: Blog post lastmod from updatedDate (no fallback)**
- Given: `/fi/blog/1/kotihoidon-tuen-kuntalisa/` with `publishDate: '2021-02-04'`, `updatedDate: '2025-12-19'`
- When: `npm run build` runs
- Then: sitemap entry for that URL has `<lastmod>2025-12-19T00:00:00.000Z</lastmod>`; the BlogPosting JSON-LD `dateModified` is also `2025-12-19`

**Scenario: Blog post never edited still has updatedDate**
- Given: a post first published 2024-01-01 and never substantively edited
- When: the file is committed
- Then: its frontmatter has `updatedDate: '2024-01-01'` (equal to `publishDate`); sitemap lastmod equals that value

**Scenario: Non-post MDX lastmod**
- Given: `src/pages/fi/about/index.mdx` with `updatedDate: '2026-05-15'`
- When: the sitemap is built
- Then: the entry for `/fi/about/` has `<lastmod>2026-05-15T00:00:00.000Z</lastmod>`

**Scenario: Category page lastmod from tag**
- Given: `src/content/tags/artificial-intelligence.ts` with `updatedDate: '2026-05-15'`
- When: the sitemap is built
- Then: entries for `/fi/category/artificial-intelligence/`, `/en/.../`, `/sv/.../` all carry `<lastmod>2026-05-15T00:00:00.000Z</lastmod>`

**Scenario: Missing updatedDate fails the build**
- Given: a new MDX page committed without `updatedDate` in frontmatter
- When: `npm run build` runs
- Then: build fails at config-load with an error naming the offending file path

**Scenario: All sitemap URLs have lastmod**
- Given: the full content set
- When: `npm run build` runs
- Then: count of `<lastmod>` elements equals count of `<url>` elements in `dist/sitemap-0.xml`
