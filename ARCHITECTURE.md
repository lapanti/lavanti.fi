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
| Functions  | Cloudflare Pages Functions (`functions/`) + D1, three routes only (below)      |
| Unit tests | Vitest + happy-dom                                                             |
| E2E tests  | Playwright                                                                     |
| Linting    | ESLint + Prettier                                                              |

---

## Pages Functions and D1

The site stays static. `functions/` holds the only server code, three thin wrappers around `src/lib/volunteers.ts` (logic and unit tests live there; `astro preview` and the e2e suite do not run functions):

| Route                  | Does                                                                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/liity`      | Volunteer sign-up from `/fi/liity/`: validation, honeypot, Turnstile, insert into D1 `volunteers`, 303 to the thank-you page. Fails closed without `DB` or `TURNSTILE_SECRET`.                                                                                                     |
| `GET /lahjoita`        | Logs hour + campaign link into `donate_clicks`, then 302 to the party's donation form (`DONATE_URL` env overrides the constant).                                                                                                                                                   |
| `GET /api/liity/stats` | Bearer `LIITY_STATS_TOKEN`; aggregate counts only, cells under 3 merged into `muu`. `?since=YYYY-MM-DD` adds `since_count` and limits the per-link (`campaign / source`) breakdowns to that window. Read by the lavanti-2027 analytics fetch and the obsidian-notes morning brief. |

- **Configuration:** no `wrangler.toml` (one would take over the dashboard settings). In the `laurilavanti` Pages project: D1 binding `DB` → database `lavanti-fi` (EU jurisdiction), secrets `TURNSTILE_SECRET` and `LIITY_STATS_TOKEN`. The Turnstile site key is public and lives in `src/content/volunteer.ts`.
- **Schema:** `migrations/*.sql`, applied by hand with `npx wrangler d1 execute lavanti-fi --remote --file=<file>`.
- **Retention:** `.github/workflows/volunteer-purge.yml` runs monthly: all volunteer rows after 2027-07-31, click rows after 13 months. It authenticates with the GitHub secret `CLOUDFLARE_D1_TOKEN` (Account · D1 · Edit only, expires 2027-09-01), separate from the deploy token.
- **Deleting one person on request:** `npx wrangler d1 execute lavanti-fi --remote --command "DELETE FROM volunteers WHERE email = '<address>'"`, then reply to confirm. D1 Time Travel keeps a restorable history for 30 days; the row is gone from it after that, which the privacy notice states.
- **Who reads the rows:** Lauri in the D1 console; Lauri, the campaign manager and the volunteer coordinator on 2027.lavanti.fi behind Cloudflare Access (lavanti-2027 repo). Nothing else reads personal rows.

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

**Visible FAQ plate.** `src/components/Faq.astro` renders a locale's `faq` frontmatter as a gray plate. `PostLayout` and `NewsletterLayout` mount it automatically between the prose sheet and the other-writings plate; `PageLayout` mounts it below the page body only when the page passes `faqSection: true`, because a `PageLayout` body is composed by the page itself — pages that want the plate somewhere specific (the election pages, the newsletter-archive landing pages) mount `<Faq>` in their own body instead, which is why the opt-in defaults to off. All three layouts, and the `FAQPage` JSON-LD in `Head.astro`, gate on `hasFaqSection()` in `src/lib/faq.ts` (two entries or more — a FAQPage rich-result requirement), with the plate's trilingual labels in `faqSectionLabels` beside it. Marked-up FAQ content has to be visible on the page for the structured data to be eligible, so `scripts/checks/dist-head.ts` fails any built page that emits `FAQPage` without a rendered `.faq` section.

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

One file per tag in `src/content/tags/<id>.ts` (`LocalTag` in `types.ts`), aggregated into the `tags` array in `src/content/tags.ts`. Each tag has an English `id` plus per-locale `slugs`, `names`, and page copy.

- **Never add tags anywhere else** — a tag file plus its `tags` array entry is the single source of truth.
- Link category pages with `getCategoryPath(id, lang)`; display names via `getTagName(id, lang)`.
- Full contract: `.agents/specs/tags/spec.md`.

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
- **Tag suggestions** (`npm run suggest:tags`, spec `.agents/specs/jev/tags.md`): advisory, never writes `meta.json` (eval F1 0.46 en). `post <id>` sends one request with a yes/no question per tag file in `src/content/tags/` (English name and description as the label, `--lang` picks the state) and prints the assigned tags, a "consider" table (unassigned, p ≥ 0.7), a "doubtful" table (assigned, p < 0.2) and the five pillar tags with their scores; editorial tags (election cycles, motions, party networks) are listed once as not suggested. `--tag <id>` retro-scans every post lacking the tag with the single question and lists candidates newest first, then writes a `tags` receipt (hash of the label Jev sees: id, `names.en`, `descriptions.en[0]`) to `src/content/suggestions.json`; `check:suggestions` requires it for every changed tag file (lint-staged on `src/content/tags/*.ts`, CI with `--base`), so a new or reworded category is always scanned against the existing posts, while an edit outside the label (FAQ, featured posts, later paragraphs, other locales) needs no rescan. `--intro <id>` scores every post carrying the tag as a first read on the topic (a five-level score shown as its 0–4 expected index; Jev keys score levels by index) and marks the tag's current `featured`, the advisory input for the category page's start-here posts (no receipt). A tag file that `src/content/tags.ts` does not import is refused. Shared helpers live in `scripts/jev/tags.ts`; the eval imports them.
- **FAQ candidates** (`npm run suggest:faq`, spec `.agents/specs/jev/faq.md`): advisory, no receipt, never writes frontmatter. For a post or issue it harvests the question-form headings (the `aeo.sh` rule, H2 and H3) of the document and of its top-10 neighbours in `related.json`, drops questions already in the locale's `faq`, and sends the prose as state with a yes/no "answers this directly" and a 1–5 "a voter would ask this" per candidate, plus the yes/no per existing `faq` question, in chunks of 40 questions. Prints candidates above 0.7 by usefulness, existing entries answered below 0.3 as doubtful, and the entry count against the two-entry `FAQPage` threshold in `Head.astro`. `tag <id>` does the same for a category page: it harvests the `faq` questions and question headings of every post carrying the tag and asks, against the tag's name, description and post titles, whether each is about the topic as a whole and whether a voter on the category page would ask it; the source post is listed so the answer written into the tag file's `faq` can be grounded in it. `/write`, `/review-content` and `/aeo-check` run it; answers stay human-written. Helpers in `scripts/jev/faq.ts`; `corpus.ts` exposes `faq`, `h3s` and `bodyStateFor`.

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
