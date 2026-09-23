# Architecture

Personal homepage of Lauri Lavanti (https://lavanti.fi).
Built with **Astro + TypeScript + MDX**. All content is local — no CMS or external content API. Hosted on **Cloudflare Pages**.

Feature-specific specs (blueprint, contracts, scenarios) live at `.agents/specs/{feature}/spec.md`. Current specs:

- [`.agents/specs/posts/spec.md`](./.agents/specs/posts/spec.md) — blog posts
- [`.agents/specs/pages/spec.md`](./.agents/specs/pages/spec.md) — pages (home, about, contact, blog index, category, 404)
- [`.agents/specs/navigation/spec.md`](./.agents/specs/navigation/spec.md) — header nav, mobile/desktop split, language-switch script, skip links
- [`.agents/specs/seo/spec.md`](./.agents/specs/seo/spec.md) — JSON-LD, Open Graph, hreflang, canonical URLs, Twitter cards
- [`.agents/specs/images/spec.md`](./.agents/specs/images/spec.md) — Cloudflare Images URL builder, crop variants, alt text rules
- [`.agents/specs/cv/spec.md`](./.agents/specs/cv/spec.md) — curriculum vitae data files, CvRow type, component hierarchy
- [`.agents/specs/tags/spec.md`](./.agents/specs/tags/spec.md) — tag taxonomy, category page generation, silent failure on unknown ids
- [`.agents/specs/rss/spec.md`](./.agents/specs/rss/spec.md) — RSS feed endpoints, item structure, locale filtering
- [`.agents/specs/design-system/spec.md`](./.agents/specs/design-system/spec.md) — design tokens, define:vars pattern, spacing/colour/typography constants
- [`.agents/specs/recommendations/spec.md`](./.agents/specs/recommendations/spec.md) — recommendations page, Recommendation data type, single Finnish-only data file shared across locales
- [`.agents/specs/newsletter/spec.md`](./.agents/specs/newsletter/spec.md) — newsletter landing pages, NewsletterSubscribe component, content data file
- [`.agents/specs/newsletter/archive.md`](./.agents/specs/newsletter/archive.md) — public newsletter archive: `newsletters` collection, localized issue/archive routes, 42-day embargo
- [`.agents/specs/cv-descriptions/spec.md`](./.agents/specs/cv-descriptions/spec.md) — CV description fields (string arrays per locale) for CurriculumVitae component

---

## Stack

| Layer      | Technology                                                                     |
| ---------- | ------------------------------------------------------------------------------ |
| Framework  | Astro (static output)                                                          |
| Content    | MDX files (local, no CMS)                                                      |
| Language   | TypeScript                                                                     |
| Styling    | CSS (scoped in components)                                                     |
| Images     | Cloudflare Images (flexible resizing via CF rewrite rule, `src/lib/images.ts`) |
| Icons      | `astro-icon` + `@iconify-json/fa7-brands`                                      |
| Hosting    | Cloudflare Pages                                                               |
| Unit tests | Vitest + happy-dom                                                             |
| E2E tests  | Playwright                                                                     |
| Linting    | ESLint + Prettier                                                              |

---

## Content structure

All content lives as MDX files under `src/pages/` in locale subdirectories.

```
src/pages/
  fi/
    index.mdx                        # home page
    {page}/index.mdx                 # about, contact, blog index, newsletter, recommendations, privacy-policy, topics, ...
    blog/{id}/{slug}/index.mdx       # blog posts
  sv/  (same structure)
  en/  (same structure)
```

Blog posts use a two-segment URL: a stable numeric `id` and a human-readable `slug`. The `id` never changes; the `slug` can.

---

## Layouts

Every MDX file declares a `layout:` in its frontmatter. There are three layouts plus a shared base.

| Layout                  | Used by                                                                   | Props source                                                                |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `FrontPageLayout.astro` | `{lang}/index.mdx`                                                        | `MDXLayoutProps<Frontmatter>` only                                          |
| `PostLayout.astro`      | All blog post MDX                                                         | `MDXLayoutProps<Frontmatter>` only                                          |
| `PageLayout.astro`      | About/contact/blog-index MDX **and** `.astro` files (404, category pages) | Dual-mode: `(Astro.props.frontmatter as Props \| undefined) ?? Astro.props` |
| `BaseLayout.astro`      | Used by the three layouts above                                           | Direct `.astro` props                                                       |

**Why dual-mode for PageLayout?** It is called both from MDX (where Astro injects props under `frontmatter`) and directly from `.astro` files (where props are at the top level). The pattern `(Astro.props.frontmatter as Props | undefined) ?? Astro.props` handles both cases.

---

## Images

Images are stored in **Cloudflare Images**, served via a rewrite rule: `images/* → cdn-cgi/imagedelivery/iOe5UJ6bvcdboiEsn9unNQ/${1}`. No image files are committed to the repo.

- MDX frontmatter references images by slug (no extension, no path), e.g.:
    ```yaml
    heroImage: Lauri-Lavanti-nojaamassa-kasiin
    backgroundImage: Kirkkonummen-keskusta
    ```
- `src/lib/images.ts` builds CF Images flexible-resizing URLs: `getImage(slug, variant)` and `getImageSrcset(slug, variant, widths[])`.
- Cropping, format conversion, and responsive sizing are handled by CF at request time — no build-time processing.
- **Add a new image:** drop original into `src/images/originals/{slug}.jpg` (gitignored, kept locally), then run `CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx npx tsx scripts/upload-to-cf-images.mts`.
- Background/decorative images: `alt=""`. Hero/portrait images: require descriptive `alt` text.
- **Critical:** use `fit=crop`, not `fit=scale-crop` — `scale-crop` is invalid and causes CF to return the unresized original.

---

## Tags

Defined in `src/content/tags.ts` as `LocalTag[]` with `id` and `names: { fi, sv, en }`.

- **Never add tags anywhere else** — this is the single source of truth.
- `buildTagCollection(lang)` returns a `TagCollection`-compatible object for components.

---

## Blog posts content collection

Posts live at `src/content/posts/{id}/{meta.json,fi.mdx,sv.mdx,en.mdx}` — a single Astro Content Collection defined in `src/content.config.ts`, backed by a custom loader (`src/content/lib/postsLoader.ts`) that merges each post's shared `meta.json` (id, dates, tags, heroImage, authors) with its per-language MDX frontmatter (slug, title, description, alt, faq, externalPublications) before schema validation.

`src/lib/posts.ts` wraps `getCollection('posts')` and exports `getAllPosts()` sorted newest-first, plus `getExcerptPosts()`, `getPostAlternates()`, and `getPostHtml()`. Use these whenever you need to list, filter, or link posts at build time. `getCollection()` cannot be exercised directly in Vitest (no prior `astro build`/`sync` in-process), so the filtering/sorting logic is kept in pure, fixture-tested functions (`filterExcerptPosts`, `sortByRelatedTags`, `buildAlternatesMap`) separate from the thin `astro:content`-touching wrappers.

**Scheduled publishing**: `getAllPosts()` excludes posts whose `publishDate` is in the future (Europe/Helsinki, helpers in `src/lib/publishing.ts`) except under `astro dev`. Because every consumer flows through it, one filter gates routes, RSS, sitemap, `llms.txt`, OG cards, and `dist/_redirects`. The nightly `scheduled-publish.yml` workflow (22:00 UTC = Helsinki midnight) compares due posts against the live sitemap (`scripts/checks/publish-due.ts`), regenerates snapshot baselines via `.github/actions/regen-baselines`, and opens an auto-merge PR whose merge deploys production. See the "Scheduled publishing" section in `CLAUDE.md`.

---

## Newsletters content collection (public archive)

Sent newsletter issues live at `src/content/newsletters/{id}/{meta.json,fi.mdx,sv.mdx,en.mdx}` — the same layout as posts, loaded by the same `localizedCollectionLoader` (`src/content/lib/postsLoader.ts`), but with no hero image and no tags. `meta.json` carries `id`, `sent`, `publishDate` and `updatedDate`; the schema refines `publishDate === sent + 42 days` (`embargoLiftDate` in `src/lib/publishing.ts`), which is the subscribers' lead over the public archive. The same build filter as posts keeps an embargoed issue out of every non-dev build, and `scripts/checks/publish-due.ts` lists it for the nightly job once its date arrives.

Routes are localized and nested under the subscribe landing page: `/fi/uutiskirje/{id}/{slug}/`, `/en/newsletter/{id}/{slug}/`, `/sv/nyhetsbrev/{id}/{slug}/` (`src/pages/[lang]/[newsletters]/[id]/[slug]/index.astro`, segments from `src/lib/newsletterRoutes.ts`) and archive lists at `/fi/uutiskirje/arkisto/`, `/en/newsletter/archive/`, `/sv/nyhetsbrev/arkiv/` (`index.mdx` on `PageLayout`). There is **no bare-id redirect route** — slugs are immutable after publish. `src/lib/newsletters.ts` mirrors `src/lib/posts.ts`; `NewsletterLayout.astro` renders the page with a provenance line ("Lähetetty tilaajille 14.3.2026.") because the visible date and JSON-LD `datePublished` are the embargo-lift date. Spec: `.agents/specs/newsletter/archive.md`.

---

## Jev decision pipeline (author-run tooling)

`scripts/jev/` talks to TypeSafe AI's Jev decision model, which returns typed decisions (choice, score, yes/no) with probabilities and cannot generate text. `client.ts` is a dependency-free `fetch` wrapper; `corpus.ts` turns every post and newsletter into one locale-invariant `Document` with a sha256 over `meta.json` and all three locale files; `eval.ts` (`npm run jev:eval`) scores Jev's tag and link-target decisions against the tags in `meta.json` and the internal links already in post bodies.

- **Keys**: `TYPESAFE_API_KEY` (direct, model `jev-1.13.0`) or `OPENROUTER_API_KEY` (OpenRouter route, `jev-1.13`) in `.env`; the direct key wins when both are set. The scripts load `.env` with `--env-file-if-exists` and exit 0 with a notice when neither key is set — except `generate:related`, which exits 1 because it was asked to produce committed data.
- **Never at build time**: the build, pre-commit and CI do not call Jev. Its output reaches the site only as committed data.
- **Related posts** (`src/content/related.json`, spec `.agents/specs/jev/related.md`): `npm run generate:related` asks Jev once per post and newsletter which other document of the same kind is the best next read and stores the top 10 with probabilities (incremental by content hash; a changed candidate set or `--force` rewrites everything). `src/lib/related.ts` reads the file at build; `filterExcerptPosts` and `filterNewsletters` put the ranked ids first and fall back to tag overlap or recency for the rest. `npm run check:related` (lint-staged on content changes, CI Validate content) fails when the file is stale, so every content edit is followed by a regeneration — which needs a key on the committing machine.
- **One-way dependency**: the scripts import pure helpers from `src/` (`newsletterRoutes.ts`, the per-tag files) and read the content directories with `fs`, because Astro's content layer is unavailable in a plain Node process. Nothing under `src/` imports `scripts/jev/`.

- **Link suggestions** (`npm run suggest:links`, spec `.agents/specs/jev/links.md`): advisory. Per document, one choice question per paragraph over every other post and issue plus "none", printed as a Markdown table with canonical URLs, the none probability, a ★ above the provisional 0.5 threshold, doubtful existing links and the `content.sh` link count. `--backlinks newsletter <id>` sends the issue as state with one yes/no question per post paragraph and lists the paragraphs that should link to it. `--changed-since <ref>` runs per-document mode for the documents a branch touched. Every completed run writes a receipt (hash of the three locale files, so an `updatedDate` bump does not invalidate it) to `src/content/suggestions.json`; `npm run check:suggestions` (lint-staged on changed post and newsletter files, CI Validate content with `--base`) fails when a changed document has no matching receipt, or a newsletter no backlinks receipt. CI never calls Jev and holds no key. `/write` and `/review-content` run the script; anchor text stays human-written.
- **Tag suggestions** (`npm run suggest:tags`, spec `.agents/specs/jev/tags.md`): advisory, never writes `meta.json` (eval F1 0.46 en). `post <id>` sends one request with a yes/no question per tag file in `src/content/tags/` (English name and description as the label, `--lang` picks the state) and prints the assigned tags, a "consider" table (unassigned, p ≥ 0.7), a "doubtful" table (assigned, p < 0.2) and the five pillar tags with their scores; editorial tags (election cycles, motions, party networks) are listed once as not suggested. `--tag <id>` retro-scans every post lacking the tag with the single question and lists candidates newest first, then writes a `tags` receipt (hash of the tag file) to `src/content/suggestions.json`; `check:suggestions` requires it for every changed tag file (lint-staged on `src/content/tags/*.ts`, CI with `--base`), so a new or reworded category is always scanned against the existing posts. A tag file that `src/content/tags.ts` does not import is refused. Shared helpers live in `scripts/jev/tags.ts`; the eval imports them.

Spec: `.agents/specs/jev/spec.md`.

---

## i18n / language switching

- Three locales: `fi`, `sv`, `en`.
- Nav links that switch language have `switchToLang?: Lang` in `src/content/nav.ts` → rendered with `data-switch-to-lang` attribute.
- An **inline script in `BaseLayout.astro`** rewrites those hrefs on page load by replacing the locale prefix in `window.location.pathname`. This is intentionally simple — no i18n library.

---

## Blog URL redirects

| From                              | To                          | Mechanism                                                                                                                                                                                                                                                            |
| --------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/{lang}/blog/{id}/`              | `/{lang}/blog/{id}/{slug}/` | True HTTP 301 in production via the generated Cloudflare Pages `_redirects` file (`src/lib/redirectsIntegration.ts`). Under `output: 'static'`, `src/pages/[lang]/blog/[id]/index.astro` also emits a meta-refresh stub that serves as the `astro preview` fallback. |
| `/{lang}/blog/{id}/{wrong-slug}/` | correct canonical URL       | Client-side JS on 404 page using `window.__postIndex` lookup table                                                                                                                                                                                                   |

**Redirect mechanism**: The static redirect map (`src/lib/redirects.ts`) and the bare-id
redirects above are both compiled by Astro into meta-refresh HTML stubs (HTTP 200) under
`output: 'static'`. The `redirects-file` integration (`src/lib/redirectsIntegration.ts`) writes
a `dist/_redirects` file covering the same paths, so Cloudflare Pages serves them as true 301s —
Pages always follows a `_redirects` rule even when a static asset exists at the same path, so the
stubs are bypassed in production and remain only as a local `astro preview` fallback.

---

## ExcerptList

`src/components/ExcerptList.astro` — renders a list of post excerpts.

- Merges MDX posts (from `getExcerptPosts()`, `src/lib/posts.ts`) with any Contentful entries (legacy/future).
- Filters by `lang`, `tag`, and `currentSlug`.
- Accepts optional `limit` prop.
- Data flow: layout → `FrontPageExcerptList` → `ExcerptList` → `Excerpt` → `Meta`.

---

## Inline scripts in `.astro` files

Prettier parses `<script>` blocks as plain JavaScript — **TypeScript syntax causes parse errors**.

Use this pattern for scripts with complex logic:

```astro
<script
    is:inline
    set:html={`
    // plain JS only — no TypeScript
    var foo = 'bar'
    document.querySelectorAll('a').forEach(function(el) { ... })
`}
/>
```

For passing server-side data to a script:

```astro
---
const dataJson = JSON.stringify(someData)
---

<script is:inline set:html={'window.__data=' + dataJson + ';'} />
<script is:inline set:html={`(function() { var d = window.__data; ... })()`} />
```

---

## Code style constraints

| Rule                       | Detail                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Linter                     | ESLint + Prettier — enforced by lint-staged on commit and CI                                                          |
| Import order               | `simple-import-sort` — fix with `npx eslint --fix`                                                                    |
| Blank line before `return` | Required by `@stylistic/padding-line-between-statements`                                                              |
| Attribute order            | `astro/sort-attributes` — attributes must be alphabetically sorted                                                    |
| No `var`                   | Use `let`/`const` in normal code; `var` is acceptable only inside `is:inline set:html` strings (not parsed by ESLint) |
| No `_` to silence errors   | Use proper error handling instead                                                                                     |
| No secrets in commits      | `.env` files, tokens, credentials — never commit                                                                      |

---

## Testing

### Unit tests (Vitest)

- Files: `*.spec.ts` alongside source files in `src/`.
- Environment: `happy-dom`.

### E2E tests (Playwright)

- Files: `tests/e2e/`.
- Pattern: **Page Object Model** — base class `AnyPage`, extended per page.
- `isMobile` flag: selects `nth(0)` (mobile nav) vs `nth(1)` (desktop nav) elements.
- **Web server**: `playwright.config.ts` runs `npm run build && npm run preview` on `:4321` automatically. Do not start a server manually.
    - `reuseExistingServer: !process.env.CI` — reuses a running server locally, always starts fresh on CI.
- **Snapshots**: aria snapshots + screenshot snapshots. After any DOM or visual change, update snapshots before committing:
    ```bash
    npm run test:e2e -- --update-snapshots
    ```
