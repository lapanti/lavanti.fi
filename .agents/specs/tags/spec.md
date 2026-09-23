# Feature: Tag Taxonomy

## Blueprint

### Context
Tags are the content taxonomy used to categorise blog posts and generate category pages. They are defined centrally and referenced by `id` in post frontmatter. Tag filtering silently fails for unknown ids — there are no runtime errors, just missing results.

### Architecture
- **Single source of truth:** `src/content/tags.ts`
  ```ts
  interface LocalTag {
      id: string                                            // URL-safe, kebab-case, never changes
      names: { en: string; fi: string; sv: string }        // short display name (tag chips, links)
      pageTitle: { en: string; fi: string; sv: string }    // 34–44 raw chars; full <title> after suffix = 50–60 chars
      descriptions: { en: string[]; fi: string[]; sv: string[] } // array of intro paragraphs for category pages
      metaDescription: { en: string; fi: string; sv: string }    // meta description for SEO (single string)
      updatedDate: string                                   // required; used by sitemap lastmod
      heroImage?: string                                    // Cloudinary image id; fallback: 'Lauri-Lavanti-next-to-a-table'
      heroImageAlt?: { en: string; fi: string; sv: string } // required when heroImage is set
      // NOT IMPLEMENTED — planned in #1502, see the FAQ scenarios below:
      // faq?: { en?: Array<{ q: string; a: string }>; fi?: …; sv?: … }  // per-locale
  }
  export const tags: LocalTag[]
  export function getTagName(id: string, lang?: Lang): string | undefined
  ```
  Currently 30 tags.

- **Post reference:** `tags: [id1, id2]` — array of tag `id` strings, shared per post id in `meta.json` (not per-language frontmatter). The posts collection schema (`src/content.config.ts`) validates it's a non-empty string array, but not that each id exists in `tags.ts` — an unknown id passes schema validation but silently produces no category page match (caught instead by `scripts/checks/content.sh`'s tag-validity check).

- **`buildTagCollection(lang)`** (referenced in `ExcerptList` context): builds a `TagCollection`-compatible object. Comes from `tags.ts` via the pattern documented in `ARCHITECTURE.md`.

- **Category pages:** single dynamic route `src/pages/[lang]/category/[tag].astro` — `getStaticPaths` maps the cross product of locales × `tags` → `{ params: { lang, tag: t.id }, props: { tag: t } }`. Only ids in `tags.ts` get a page generated.

- **Category page enrichment:** Each category page passes `type={COLLECTIONPAGE}`, `description` (from `tag.metaDescription[lang]`), `heroImage` (tag override or `'Lauri-Lavanti-next-to-a-table'`), and `alt` to `PageLayout`. Each string in `tag.descriptions[lang]` is rendered as a separate `<Paragraph>` before `<ExcerptList>`. No `faq` is passed: tags carry no FAQ data yet (see the FAQ scenarios below), so category pages emit neither the plate nor FAQPage JSON-LD.

- **Filtering in `ExcerptList`:** delegates to `getExcerptPosts({ tag })` (`src/lib/posts.ts`), which filters by `post.tags.includes(tagId)` — strict string equality. No fuzzy matching.

- **`getTagName(id, lang)`:** returns the display name for a given id and locale. Returns `undefined` for unknown ids.

- **Dependencies:** `tags.ts` ← category pages, ExcerptList, TitleBanner (tag links on post pages), post frontmatter (by convention, not enforced by TS)

### Anti-Patterns
- Do not add a tag id to post frontmatter that is not defined in `tags.ts` — the category page for that id will not exist, and no posts will appear under it
- Do not rename a tag `id` without updating every post that references the old id — the old category URL will 404 and posts will disappear from filtering
- Do not add locale-specific tags — all tags must have `fi`, `sv`, and `en` names; partial entries break the category page for the locales with missing names
- Do not add tags in components, layouts, or MDX content — `tags.ts` is the only place
- Do not sort or reorder `tags` array for display — components that need sorted display should sort locally
- Do not use `names` as the page `<title>` — `names` is for display only (tag chips, links); use `pageTitle` for category page SEO titles
- Do not add a `pageTitle` shorter than 34 raw chars or longer than 44 raw chars — the final rendered title (with ` | Lauri Lavanti` suffix) must be 50–60 chars
- Do not add `heroImage` without also setting `heroImageAlt` — alt text is required for accessibility

---

## Contract

### Definition of Done
- [ ] New tag has a unique `id` in kebab-case that does not conflict with existing ids
- [ ] All three locale names (`fi`, `sv`, `en`) are provided in `names`, `pageTitle`, and `descriptions`
- [ ] `pageTitle` raw length is 34–44 chars per locale (final title with suffix = 50–60 chars)
- [ ] Posts referencing the new tag `id` appear in `ExcerptList` when filtered by that tag
- [ ] `/{lang}/category/{id}` resolves to a generated page for all three locales
- [ ] `npm run build` passes (new category pages are generated)

### Regression Guardrails
- Tag `id` values are part of the public URL (`/category/{id}`) — changing an id is a breaking URL change; add a redirect if needed
- `getStaticPaths` in category pages iterates `tags` directly — every tag always gets a page generated in every locale, regardless of whether any post uses it
- `getTagName` returns `undefined` for unknown ids — callers must handle this case; do not assume it always returns a string

### Scenarios

**Scenario: New tag added**
- Given: A new tag with all required fields (`id`, `names`, `pageTitle`, `descriptions`) is added to `tags.ts`
- When: The site is built
- Then: `/fi/category/{id}`, `/sv/category/{id}`, and `/en/category/{id}` are generated with intro text and `CollectionPage` JSON-LD; posts with the tag appear in those pages

**Scenario: Post references unknown tag id**
- Given: A post has `tags: [olematon-tagi]` and that id is not in `tags.ts`
- When: A visitor navigates to `/fi/category/olematon-tagi`
- Then: The page does not exist (404) — `getStaticPaths` did not generate it; the post appears nowhere under that tag

**Scenario: Tag renamed (breaking change)**
- Given: Tag `id: 'kirkkonummi'` is renamed to `id: 'kirkkonummi-kunta'`
- When: The site is built without updating post frontmatter
- Then: `/fi/category/kirkkonummi` no longer exists; posts with `tags: [kirkkonummi]` in frontmatter appear in no category (silent failure); the new `/fi/category/kirkkonummi-kunta` page exists but is empty

**Scenario: getTagName for valid and invalid ids**
- Given: `getTagName('kirkkonummi', 'fi')` and `getTagName('nonexistent', 'fi')`
- When: Called at runtime
- Then: First returns `'Kirkkonummi'`; second returns `undefined`

**Scenario: Category page with FAQ (2+ entries) — NOT IMPLEMENTED**
- Given: A tag has `faq.fi` with 2+ entries
- When: `/fi/category/{id}` is rendered
- Then: Two `<script type="application/ld+json">` blocks are emitted — one `CollectionPage`, one `FAQPage`. A visible `<Faq>` plate appears below the `<ExcerptList>`.
- Status: `LocalTag` has no `faq` field and `[tag].astro` passes none, so no category page renders either today. The rendering half exists: `PageLayout` takes `faq` plus a `faqSection: true` opt-in and mounts `src/components/Faq.astro` below the page body (#1500). What is missing is the data — the field on `LocalTag` and trilingual entries for the tags that warrant them (#1502).

**Scenario: Category page FAQ in only one locale — NOT IMPLEMENTED**
- Given: A tag has `faq.fi` with 2+ entries but no `faq.sv`
- When: `/sv/category/{id}` is rendered
- Then: No `FAQPage` JSON-LD and no plate for the Swedish page; the Finnish page still gets both. `hasFaqSection()` (`src/lib/faq.ts`) is the single gate for both.
