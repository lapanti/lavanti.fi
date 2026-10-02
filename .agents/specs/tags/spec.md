# Feature: Tag Taxonomy

## Blueprint

### Context
Tags are the content taxonomy used to categorise blog posts and generate category pages. They are defined centrally and referenced by `id` in post frontmatter. Tag filtering silently fails for unknown ids — there are no runtime errors, just missing results.

### Architecture
- **One file per tag:** `src/content/tags/<id>.ts` exports one `LocalTag` (e.g. `economyTag`). The interface lives in `src/content/tags/types.ts`:
  ```ts
  interface LocalTag {
      id: string                                            // URL-safe, kebab-case, English, never changes
      slugs: { en: string; fi: string; sv: string }         // per-locale URL slug; ids stay English, slugs localise
      names: { en: string; fi: string; sv: string }        // short display name (tag chips, links)
      pageTitle: { en: string; fi: string; sv: string }    // 34–44 raw chars; full <title> after suffix = 50–60 chars
      descriptions: { en: string[]; fi: string[]; sv: string[] } // array of intro paragraphs for category pages
      metaDescription: { en: string; fi: string; sv: string }    // meta description for SEO (single string)
      updatedDate: string                                   // required; used by sitemap lastmod
      heroImage?: string                                    // Cloudflare Images id; fallback below
      heroImageAlt?: { en: string; fi: string; sv: string } // required when heroImage is set
      faq?: { en?: FaqItem[]; fi?: FaqItem[]; sv?: FaqItem[] } // per-locale category FAQ; 2+ entries per present locale
      featured?: number[]                                   // up to 3 post ids shown first as "start here"
      local?: true                                          // Kirkkonummi-only category; ranked last in other pages' related topics
  }
  ```
  Currently 34 tags.

- **Aggregator:** `src/content/tags.ts` imports every tag file and exports:
  ```ts
  export const tags: LocalTag[]
  export function getTagName(id: string, lang?: Lang): string | undefined   // lang defaults to 'fi'
  export const CATEGORY_SEGMENTS: Record<Lang, string>                       // { en: 'category', fi: 'kategoria', sv: 'kategori' }
  export function getCategoryPath(id: string, lang: Lang): string | undefined // e.g. '/fi/kategoria/tekoaly/'
  ```
  A tag file that is not listed in the `tags` array gets no category page, but `scripts/checks/content.sh` still accepts its id, because it reads ids from the files directly.

- **Post reference:** `tags: [id1, id2]` — array of tag `id` strings, shared per post id in `meta.json` (not per-language frontmatter). The posts collection schema (`src/content.config.ts`) validates it's a non-empty string array, but not that each id exists. An unknown id passes schema validation but silently produces no category page match. `scripts/checks/content.sh` catches it instead with its tag-validity check, run from the pre-commit hook and in CI. Newsletters and static pages carry no tags.

- **Pillar tags:** every post with id ≥ 43 must carry at least one of `artificial-intelligence`, `digital-independence`, `economy`, `culture-and-education`, `freedom`. `scripts/checks/content.sh` enforces this. The same list is duplicated as `PILLAR_TAGS` in `scripts/jev/tags.ts`, which `npm run suggest:tags` uses (spec: `.agents/specs/jev/tags.md`).

- **Category pages:** single dynamic route `src/pages/[lang]/[category]/[tag].astro`. `getStaticPaths` maps the cross product of locales × `tags` → `{ params: { category: CATEGORY_SEGMENTS[lang], lang, tag: tag.slugs[lang] }, props: { tag } }`. URLs are `/fi/kategoria/{fi-slug}/`, `/sv/kategori/{sv-slug}/`, `/en/category/{en-slug}/`. Always build links with `getCategoryPath`. Only tags in the `tags` array get a page generated.

- **Category page enrichment:** each category page renders `PageLayout` (`variant="split"`, `plated`, `type={COLLECTIONPAGE}`) with `description` from `tag.metaDescription[lang]`, `updatedDate` from `tag.updatedDate` (CollectionPage `dateModified`) and `langAlternates` from `getCategoryPath` for all three locales. `heroImage` is the tag override or the fallback `Lauri-Lavanti-dipolissa-lasijulkisivun-edessa-hero-pysty`, with mobile fallback `…-hero-vaaka`. The body, in order:
  1. Intro plate: each string in `tag.descriptions[lang]` as a `<Paragraph>`.
  2. "Start here" plate (localised; only with `featured`): `<ExcerptList onlyIds={featured} rankedIds={featured}>`.
  3. "Related posts" plate (localised): `<ExcerptList tag={tag.id}>`, excluding the featured ids.
  4. "Related topics" plate (localised; only with 2+ siblings): `<Chips>` linking up to five sibling categories ranked by `relatedTags()` (`src/lib/tagCooccurrence.ts`, Jaccard over the locale's published posts; every tag with a page qualifies, election and party tags included). On a page whose tag is not `local`, `local` siblings (kirkkonummi, municipal-elections-2025, west-railway, council-motion) rank after every topical sibling, so pages read across the Uusimaa electoral district do not lead with one municipality.
  5. FAQ plate: `faq={tag.faq?.[lang]}` with the `faqSection` opt-in; `PageLayout` mounts `<Faq>` after the body when `hasFaqSection()` holds.
- **Category JSON-LD:** CollectionPage carries `inLanguage`, `about` (a `DefinedTerm` named `names[lang]` in the set `/{lang}/blog/`) and `mainEntity`, an `ItemList` of every published post under the tag in page order (featured first), from the same `getExcerptPosts` query the lists use, so scheduled posts stay out. A locale with 2+ FAQ entries adds a sibling `FAQPage` script.
- **Category FAQ and featured content:** answers are human-written, grounded in posts under the tag. `npm run suggest:faq -- tag <id>` ranks candidate questions from those posts and `npm run suggest:tags -- --intro <id>` ranks the posts as first reads (`.agents/specs/jev/faq.md`, `.agents/specs/jev/tags.md`); both are advisory.

- **Tag-suggestion receipt:** committing a new or edited `src/content/tags/*.ts` requires a receipt that `npm run suggest:tags -- --tag <id>` ran on its current Jev label — `id`, `names.en`, `descriptions.en[0]` (enforced in `.lintstagedrc.mjs`). Edits to `faq`, `featured`, later paragraphs or other locales need no new scan.

- **Legacy URLs:** the old `/blogi/<tag>/` category URLs redirect to `/fi/kategoria/<slug>/`. The redirects are hardcoded in `src/lib/redirects.ts`. `scripts/checks/redirects.mjs` derives valid category targets from the tag files.

- **Filtering in `ExcerptList`:** delegates to `getExcerptPosts({ tag })` (`src/lib/posts.ts`), which filters by `post.tags.includes(tagId)` — strict string equality. No fuzzy matching.

- **`getTagName(id, lang)`:** returns the display name for a given id and locale. Returns `undefined` for unknown ids.

- **Dependencies:** `tags.ts` ← category pages, ExcerptList, TitleBanner (tag links on post pages), post frontmatter (by convention, not enforced by TS)

### Anti-Patterns
- Do not add a tag id to a post's `meta.json` that has no file in `src/content/tags/` — the category page for that id will not exist, and no posts will appear under it
- Do not add a tag file without also adding it to the `tags` array in `tags.ts` — the id passes the content check, but no category page is generated
- Do not rename a tag `id` without updating every post that references the old id — posts will disappear from filtering
- Do not change a `slugs` value without adding a redirect from the old path — the slug is the public URL, so the old category URL will 404
- Do not change the pillar list in only one place — `scripts/checks/content.sh` and `PILLAR_TAGS` in `scripts/jev/tags.ts` must match
- Do not add locale-specific tags — all tags must have `fi`, `sv`, and `en` values in every per-locale field; partial entries break the category page for the locales with missing values
- Do not build category URLs by hand — use `getCategoryPath(id, lang)`
- Do not add tags in components, layouts, or MDX content — `src/content/tags/` plus the `tags.ts` array is the only place
- Do not sort or reorder `tags` array for display — components that need sorted display should sort locally
- Do not use `names` as the page `<title>` — `names` is for display only (tag chips, links); use `pageTitle` for category page SEO titles
- Do not add a `pageTitle` shorter than 34 raw chars or longer than 44 raw chars — the final rendered title (with ` | Lauri Lavanti` suffix) must be 50–60 chars
- Do not add `heroImage` without also setting `heroImageAlt` — alt text is required for accessibility

---

## Contract

### Definition of Done
- [ ] New tag has a unique `id` in kebab-case that does not conflict with existing ids
- [ ] All three locales (`fi`, `sv`, `en`) are provided in `slugs`, `names`, `pageTitle`, `descriptions`, and `metaDescription`
- [ ] `pageTitle` raw length is 34–44 chars per locale (final title with suffix = 50–60 chars)
- [ ] The tag file is listed in the `tags` array in `src/content/tags.ts`
- [ ] A `suggest:tags` receipt for the tag file is committed alongside it
- [ ] Posts referencing the new tag `id` appear in `ExcerptList` when filtered by that tag
- [ ] `getCategoryPath(id, lang)` resolves to a generated page for all three locales
- [ ] `npm run build` passes (new category pages are generated)

### Regression Guardrails
- Tag `slugs` values are part of the public URL (`/fi/kategoria/{slug}/` etc.) — changing a slug is a breaking URL change; add a redirect
- Tag `id` values are the post-to-tag join key — changing an id requires updating every `meta.json` that references it
- `getStaticPaths` in category pages iterates `tags` directly — every tag always gets a page generated in every locale, regardless of whether any post uses it
- `getTagName` returns `undefined` for unknown ids — callers must handle this case; do not assume it always returns a string

### Scenarios

**Scenario: New tag added**
- Given: A new tag file with all required fields is added under `src/content/tags/` and listed in the `tags` array
- When: The site is built
- Then: `/fi/kategoria/{fi-slug}/`, `/sv/kategori/{sv-slug}/`, and `/en/category/{en-slug}/` are generated with intro text and `CollectionPage` JSON-LD; posts with the tag appear in those pages

**Scenario: Post references unknown tag id**
- Given: A post's `meta.json` has `tags: [olematon-tagi]` and no file in `src/content/tags/` has that id
- When: The post is committed, or CI runs `scripts/checks/content.sh`
- Then: The check fails with `unknown tag: 'olematon-tagi'`. If it were bypassed, the build would still succeed and the post would appear under no category for that id (silent failure)

**Scenario: Post #43+ without a pillar tag**
- Given: A post with id ≥ 43 has `tags: [kirkkonummi]` only
- When: `scripts/checks/content.sh` runs
- Then: It fails with `missing pillar tag` and lists the five pillar ids

**Scenario: Tag id renamed (breaking change)**
- Given: Tag `id: 'kirkkonummi'` is renamed to `id: 'kirkkonummi-kunta'`, slugs unchanged
- When: Posts' `meta.json` still reference `kirkkonummi`
- Then: `content.sh` fails each such post with `unknown tag`. If it were bypassed, `/fi/kategoria/kirkkonummi/` would still exist but be empty, and the posts would appear in no category

**Scenario: Tag slug changed (breaking URL change)**
- Given: The `sv` slug of `kirkkonummi` changes from `kyrkslatt` to `kyrkslatt-kommun`
- When: The site is built without a redirect
- Then: `/sv/kategori/kyrkslatt/` returns 404; the new `/sv/kategori/kyrkslatt-kommun/` page lists the same posts

**Scenario: getTagName for valid and invalid ids**
- Given: `getTagName('kirkkonummi', 'fi')` and `getTagName('nonexistent', 'fi')`
- When: Called at runtime
- Then: First returns `'Kirkkonummi'`; second returns `undefined`

**Scenario: Category page with FAQ (2+ entries)**
- Given: A tag has `faq.fi` with 2+ entries
- When: `/fi/kategoria/{fi-slug}/` is rendered
- Then: A `CollectionPage` and a `FAQPage` JSON-LD block are emitted (beside the BreadcrumbList). A visible `<Faq>` plate appears below the post lists. Tested in `src/pages/[lang]/[category]/_tag.spec.ts` and the tag e2e specs.

**Scenario: Category page FAQ in only one locale**
- Given: A tag has `faq.fi` with 2+ entries but no `faq.sv`
- When: `/sv/kategori/{sv-slug}/` is rendered
- Then: No `FAQPage` JSON-LD and no plate for the Swedish page; the Finnish page still gets both. `hasFaqSection()` (`src/lib/faq.ts`) is the single gate for both. Tested with a fixture tag in `_tag.spec.ts`; real tags ship all three locales.

**Scenario: Tag without faq**
- Given: A tag has no `faq`
- When: Its category pages are rendered
- Then: No FAQ plate and no `FAQPage` JSON-LD

**Scenario: Featured posts**
- Given: A tag has `featured: [67, 80]`
- When: Its category page is rendered
- Then: A "Start here" plate lists posts 67 and 80 in that order, the "Related posts" list leaves them out, and the ItemList starts with them. `src/content/tags.spec.ts` fails a `featured` with more than 3 ids, a duplicate, or a post that is missing, scheduled, lacks the tag or lacks a locale

**Scenario: Related topics**
- Given: Two or more other tags share a published post with the tag
- When: Its category page is rendered
- Then: A "Related topics" plate links up to five of them, most similar first by Jaccard over unique post ids; with fewer than two, the plate is left out. On a non-local page, `local` siblings come after all others regardless of similarity

**Scenario: CollectionPage describes the collection**
- Given: Any category page
- When: It is rendered
- Then: CollectionPage JSON-LD has `inLanguage`, `dateModified` = `tag.updatedDate`, `about` (DefinedTerm) and an `ItemList` of the published posts in page order
