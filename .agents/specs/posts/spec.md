# Spec: Blog Posts

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-07-30

---

## Intent

Blog posts are the primary content type on the site — political commentary, municipal news, and personal views. They must be stable (URLs never break), discoverable (by tag and language), and accessible (WCAG-compliant, keyboard navigable). Every post must exist in all three languages (fi, sv, en) — this guarantee is non-negotiable and must never weaken.

Until now, each post was 3 fully hand-written page-routed MDX files, and every other post-related route (bare-id redirect, RSS, category) was likewise hand-duplicated 3x per locale. This produced 195+ near-identical files for 65 posts, no runtime validation of frontmatter shape, and — critically — no guarantee that fields which happen to be identical across a post's three translations today (dates, tags, hero image, authors, external publications) actually stay in sync; nothing caught it if they silently drifted.

This spec covers collapsing that duplication to one dynamic route per route type, generated from a single data source, while eliminating the drift risk structurally rather than merely detecting it, and without weakening the guarantee that every post exists in all three languages. See `/home/lapanti/.claude/plans/the-current-site-has-whimsical-iverson.md` for the full design rationale and rejected alternatives.

---

## Scope

### In scope
- `src/content.config.ts` + custom loader (`src/content/lib/postsLoader.ts`) defining one `posts` collection merging per-id `meta.json` with per-language MDX frontmatter
- New file layout for all 65 posts: `src/content/posts/{id}/{meta.json,fi.mdx,sv.mdx,en.mdx}`
- Dynamic routes replacing 12 duplicated per-locale files: `src/pages/[lang]/blog/[id]/[slug]/index.astro`, `src/pages/[lang]/blog/[id]/index.astro` (redirect), `src/pages/[lang]/rss.xml.ts`, `src/pages/[lang]/category/[tag].astro`
- `PostLayout.astro` moving from `MDXLayoutProps` (implicit MDX-layout convention) to explicit props
- `src/lib/mdxPosts.ts` replaced by `src/lib/posts.ts` (async, collection-backed)
- `src/pages/404.astro`'s wrong-slug redirect (`window.__postIndex`) updated for the async loader
- One-off migration script converting all 65 posts, verifying shared fields are byte-identical across each fi/sv/en triplet before collapsing them into `meta.json`
- Check-script updates (`cross-file.mjs`, `mdx-deep.ts`, `seo.sh`, `content.sh`, `aeo.sh`, `style-fi.sh`, `redirects.mjs`) and a new `scripts/lib/read-json-field.mjs` helper so bash checks can read `meta.json` fields
- `src/lib/sitemapLastmod.ts` dedicated branch for the new layout
- `.lintstagedrc.mjs`, `.github/workflows/main.yml`, `package.json` glob/find updates for the new file location

### Out of scope
- `about/`, `contact/`, `newsletter/`, `privacy-policy/`, `recommendations/`, front-page `index.mdx` — stay as manually duplicated per-locale files (unique long-form content, low duplication cost)
- `en-cv.ts`/`fi-cv.ts`/`sv-cv.ts` — unchanged
- `blog/index.mdx`, `blog/all/index.mdx` — stay as thin per-locale MDX wrapper pages
- The language switcher's non-post fallback behaviour, the hreflang mechanism in `Head.astro` itself, and the `astro.config.mjs` `i18n` block — this migration must keep feeding them correct data, not change how they work
- Any change to tag definitions (`src/content/tags.ts`) or the multi-author byline convention below — both carry over unchanged

---

## Contract

```gherkin
Feature: Blog post content-collection routing

  Scenario: New post is added
    Given meta.json and fi.mdx/sv.mdx/en.mdx are created at src/content/posts/66/ with valid data
    When the site is built
    Then the post appears at /fi/blog/66/{slug}/, /sv/blog/66/{slug}/, /en/blog/66/{slug}/
    And it appears in ExcerptList on each locale's /{lang}/blog/ page
    And /{lang}/blog/66/ redirects 301 to the canonical slug URL for each locale

  Scenario: Post slug is changed
    Given a post at /{lang}/blog/{id}/{old-slug}/ has its slug updated in its {lang}.mdx frontmatter to {new-slug}
    When the site is built
    Then /{lang}/blog/{id}/{new-slug}/ serves the post
    And /{lang}/blog/{id}/ still redirects to the new slug
    And /{lang}/blog/{id}/{old-slug}/ hits the 404 page, which client-side redirects to the new canonical URL via window.__postIndex

  Scenario: Post filtered by tag
    Given a post's meta.json has tags: ["kirkkonummi"]
    When a visitor navigates to /{lang}/category/kirkkonummi
    Then the post excerpt appears in the list for that locale; posts without that tag do not appear

  Scenario: Translation-completeness guarantee is preserved
    Given a post id has fi.mdx and en.mdx but no sv.mdx under src/content/posts/{id}/
    When cross-file.mjs runs (pre-commit or CI)
    Then it fails, naming the missing locale — exactly as it does today for the old layout

  Scenario: hreflang and language switcher resolve correctly
    Given a post exists in all three locales under the new layout
    When the page is built
    Then its hreflang alternate links point at the correct three canonical URLs (one per locale)
    And the language switcher's data-switch-to-lang links resolve to those same three URLs, even though each locale's slug differs

  Scenario: RSS feed reflects posts correctly
    Given posts exist for a locale under the new layout
    When /{lang}/rss.xml is requested
    Then it lists those posts, each with the correct title, description, and pubDate sourced from that post's data
    And a post's rendered body content is included, matching its {lang}.mdx source

  Scenario: meta.json-only edit still triggers validation
    Given only src/content/posts/{id}/meta.json is staged for commit (no .mdx change)
    When pre-commit runs
    Then lint-staged still re-runs mdx-validate.sh against that id's three language files

  Scenario: Freshness check still fires
    Given a post's meta.json has publishDate more than 90 days ago and no updatedDate
    When mdx-deep.ts runs
    Then the commit is rejected with the same freshness error as today

  Scenario: Sitemap build does not regress
    Given the migration has moved all posts to the new layout
    When the site is built
    Then sitemapLastmod does not throw, and every post's lastmod date matches meta.json's updatedDate

  Scenario: Post with missing tag id
    Given a post's meta.json has tags: ["nonexistent-tag"]
    When the site is built
    Then the tag filter silently returns zero results for that tag — no build error, but the post is invisible under that category (anti-pattern: always use tag ids defined in src/content/tags.ts)

  Scenario: Post with two or more FAQ entries
    Given a post's {lang}.mdx frontmatter has faq with two or more entries
    When the page is built
    Then PostLayout renders the Faq plate between the prose sheet and the "Muita kirjoituksia" plate, with the locale's heading (Usein kysyttyä / Vanliga frågor / Frequently asked questions) and the eyebrow "Q & A"
    And Head.astro emits the FAQPage JSON-LD for the same entries — both gated on hasFaqSection() in src/lib/faq.ts, so the visible block and the structured data can never disagree

  Scenario: Post with fewer than two FAQ entries
    Given a post's {lang}.mdx frontmatter has one faq entry or none
    When the page is built
    Then neither the plate nor the FAQPage JSON-LD is rendered — a FAQPage rich result needs two questions, and marked-up questions must be visible on the page
```

---

## Data Model

```typescript
// src/content.config.ts schema — the full validated shape of a collection entry.
// Sourced by merging src/content/posts/{id}/meta.json (shared) with
// src/content/posts/{id}/{lang}.mdx frontmatter (per-language) in the custom loader.
interface PostEntry {
  // shared, lives only in meta.json — one physical copy per post id
  id: number
  publishDate: string // ISO 8601
  updatedDate: string // ISO 8601
  tags: string[] // at least one; must exist in src/content/tags.ts
  heroImage: string // Cloudinary filename, no extension
  authors?: AuthorEntry[] // src/content/person.ts
  externalPublications?: ExternalPublication[] // src/lib/byline.ts — each entry may carry an
    // optional `lang`, the language the linked article itself is written in (not translated
    // per reader; defaults to 'fi' when omitted, since most press mentions are Finnish-language).
    // Shown on every locale, with a "(på svenska)"-style suffix when it doesn't match the page
    // being viewed

  // per-language, lives only in {lang}.mdx frontmatter
  lang: 'fi' | 'sv' | 'en'
  slug: string // URL-safe, kebab-case, unique per locale
  pageTitle: string
  title: string
  description: string
  alt: string // descriptive, non-empty for hero images
  faq?: Array<{ q: string; a: string }>
}

// src/lib/posts.ts — enriched shape used by routes/components
interface Post extends PostEntry {
  url: string // `/${lang}/blog/${id}/${slug}/`
  wordCount: number
  readingTime: number
}
```

File layout:
```
src/content/posts/{id}/
  meta.json   # PostEntry's shared fields
  fi.mdx      # PostEntry's per-language fields + body
  sv.mdx
  en.mdx
```

The `id` is permanent and numeric — never reuse, never duplicate across posts. The `slug` may change; always redirect from old slugs rather than keeping stale files.

Because `meta.json`'s fields have exactly one physical copy per post id, cross-locale drift on `publishDate`/`updatedDate`/`tags`/`heroImage`/`authors`/`externalPublications` is impossible by construction — there is no second copy to fall out of sync. This is a property of the layout, not a runtime check to test.

---

## Dependencies

- [Tags](../tags/spec.md) — posts reference tag `id` strings in `meta.json`'s `tags[]`; never invent new tag ids in post data
- [SEO](../seo/spec.md) — hreflang generation consumes `langAlternates`, which this migration must keep computing correctly (mechanism itself is out of scope)
- [RSS](../rss/spec.md) — RSS route is being collapsed to `src/pages/[lang]/rss.xml.ts` as part of this migration; content/dates must not regress
- [Images](../images/spec.md) — `heroImage` resolution via `astro-cloudinary` is unaffected by this migration; only the frontmatter field's file location changes

---

## Anti-patterns

- **Do not** leave posts split across both the old (`src/pages/{lang}/blog/{id}/{slug}/`) and new (`src/content/posts/{id}/`) layout on `main` — a half-migrated tree double-counts posts in `cross-file.mjs`, the sitemap, and `redirects.mjs`
- **Do not** detect "is this a blog post" by content-sniffing (`/PostLayout/.test(content)`) in any check script going forward — use the path (`src/content/posts/*/{fi,sv,en}.mdx`); content-sniffing breaks once `layout:` is removed from frontmatter
- **Do not** assume `heroImage`/`tags`/`publishDate`/etc. can be read from the file being checked in `content.sh`/`seo.sh`/`mdx-deep.ts` — they now live in the sibling `meta.json`; but `alt`/`description`/`slug` etc. stay in the language file being checked (mixed-source, not a blanket switch)
- **Do not** blind-strip every `import` line during migration — post id 64 (all three locales) uses `<ImageWithCaption>` directly in the MDX body outside the `export const components` remap object; strip only imports that appear solely inside that remap
- **Do not** add a tag id in `meta.json` that is not defined in `src/content/tags.ts` — it silently breaks tag filtering
- **Do not** give two posts the same `id`, even across locales — the redirect route and `getPostAlternates` use `id` as the lookup key
- **Do not** use TypeScript syntax in `<script>` blocks in `.astro` layout files — Prettier parses them as plain JS and will fail
- **Do not** import from `src/lib/posts.ts` in client-side code — `getCollection()` is a build-time-only API
- **Do not** point `src/lib/sitemapLastmod.ts` at the new layout without its dedicated URL-construction branch — `updatedDate` no longer lives in any `.mdx` file, so the existing per-file `updatedDate` requirement would hard-throw the build for every post

---

## Open Questions

- [ ] Exact Astro `Loader` API surface (`parseFrontmatter`, `store.set()`, `LoaderContext`) for the custom loader merging `meta.json` + per-language MDX — verify in the migration spike, not assumed from docs
- [ ] Whether `<Content components={mdxComponents} />` actually overrides per-post custom component remaps the way file-local `export const components` did on page-routed MDX — verify in the spike; if it doesn't, the per-post remap consolidation approach needs rethinking
- [ ] Whether `getCollection()` resolves inside Vitest as-is, or needs an `astro sync` step added to `pretest`/CI
- [ ] Whether `mdx-deep.ts`'s existing `fmField` regex extraction works unchanged against `meta.json`'s raw text, or needs a small dedicated JSON-aware reader

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-30 | Rewrote for Content Collection migration (issue #1341) — supersedes the file-based-routing architecture, frontmatter schema, and URL/redirect contract description from the original version of this spec |
| 2026-07-30 | Addressed /review-spec findings: added hreflang and RSS Contract scenarios, replaced the non-testable drift scenario with a Data Model note, trimmed Intent to problem/why only |
