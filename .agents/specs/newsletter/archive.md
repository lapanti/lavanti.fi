# Spec: Newsletter Archive

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active` (PR #1481)
> **Last updated**: 2026-09-22

---

## Intent

Past newsletters existed only as MailerLite emails. Nothing could link to an issue, the 800–1500-word analyses on the campaign's core keywords were invisible to search and answer engines, and every newsletter CTA degraded into a rhetorical question because there was no public destination to point at.

The archive publishes every sent issue as a page on lavanti.fi in all three languages, **42 days after it was sent**. Subscribers keep a meaningful lead (roughly three issues at a 14-day cadence), and the public corpus grows without the list losing its reason to exist. The embargo length (42 days, a multiple of seven so the page lands on the send weekday), the separate collection, the localized nested URLs, the absence of a bare-id redirect and the canonical policy (one canonical page per thesis, prevented editorially rather than with `rel=canonical`) were decided upstream in the campaign's editorial process; this spec records them as the site-side contract.

Archive entries are **not** blog posts: they carry no hero image and no tags, their visible date is the embargo-lift date, and they live in their own collection so the `posts` schema stays strict.

---

## Scope

### In scope
- `newsletters` content collection at `src/content/newsletters/{id}/{meta.json,fi.mdx,sv.mdx,en.mdx}`, sharing the posts loader
- Issue pages at `/fi/uutiskirje/{id}/{slug}/`, `/en/newsletter/{id}/{slug}/`, `/sv/nyhetsbrev/{id}/{slug}/`
- Archive list pages at `/fi/uutiskirje/arkisto/`, `/en/newsletter/archive/`, `/sv/nyhetsbrev/arkiv/`
- Embargo via `publishDate = sent + 42`, enforced by the schema and applied by the existing build filter and nightly publish job
- OG cards, sitemap `lastmod`, `llms.txt` section, breadcrumbs, hreflang alternates
- Every content check script recognising the new directory
- Links from the subscribe landing pages to the archive
- Footer link to the archive on every page (site column, not the main navigation)

### Out of scope
- Backfill of issues beyond the first (separate PRs, one editorial pass each)
- Bare-id redirect route (`/fi/uutiskirje/1/`) — slugs are immutable after publish
- Tags and category-page inclusion — land together or not at all
- RSS inclusion — the feed is titled and advertised as the blog, and its item builder reads `heroImage` unconditionally
- Freshness auditing — issues are dated historical documents, exempt from the 90/180-day rules
- Any change to how newsletters are written or sent

---

## Contract

```gherkin
Feature: Newsletter archive

  Scenario: Issue page renders in every language
    Given src/content/newsletters/1/ has meta.json, fi.mdx, sv.mdx and en.mdx
    And meta.json publishDate is today or earlier
    When the site is built
    Then /fi/uutiskirje/1/{fi slug}/, /sv/nyhetsbrev/1/{sv slug}/ and /en/newsletter/1/{en slug}/ exist
    And each carries hreflang links to the other two plus x-default = fi
    And each has BlogPosting JSON-LD with datePublished = publishDate
    And each has an og:image at /og/{lang}__{segment}__1__{slug}.png that is a built file
    And each shows the provenance line with the sent date

  Scenario: Embargo hides an unsent-to-public issue
    Given meta.json sent is S and publishDate is S + 42 days
    And S + 42 is after today in Europe/Helsinki
    When the site is built
    Then no page, sitemap entry, OG card or llms.txt line exists for the issue
    And `npm run dev` still renders the issue
    And `npm run check:publish-due` does not list it

  Scenario: Embargo lift is deployed by the nightly job
    Given an issue whose publishDate arrived today
    And its URLs are missing from the live sitemap
    When scheduled-publish.yml runs
    Then check:publish-due exits 1 listing the three issue URLs
    And the existing baseline-regeneration PR flow deploys it

  Scenario: Schema rejects a hand-typed publishDate
    Given meta.json sent is 2026-03-14 and publishDate is 2026-04-01
    When the content layer syncs
    Then the build fails naming the expected publishDate 2026-04-25

  Scenario: Archive list is newest-first and links every published issue
    Given two published issues
    When /fi/uutiskirje/arkisto/ is built
    Then it lists both, newest publishDate first, each linking its fi page
    And it links back to /fi/uutiskirje/
    And it carries CollectionPage JSON-LD and breadcrumbs Home → Uutiskirje → Arkisto

  Scenario: Content checks apply post rules minus tags
    Given src/content/newsletters/1/fi.mdx
    When scripts/mdx-validate.sh runs on it
    Then seo.sh, content.sh, aeo.sh and style-fi.sh treat it as a collection entry, not a static page
    And no `layout:` frontmatter is demanded
    And 3–10 internal links and one question-form heading are required
    And tag validity and the pillar-tag rule are skipped
    And the four-digit-year slug exemption for blog ids 20 and 47 does not apply

  Scenario: Editing an issue requires an updatedDate bump
    Given a change to src/content/newsletters/1/sv.mdx
    When the commit-msg hook runs without [skip-updated-date]
    Then it fails unless src/content/newsletters/1/meta.json updatedDate is today
```

---

## Data Model

```typescript
// src/content/newsletters/{id}/meta.json — shared by the three locales
interface NewsletterMeta {
    id: number            // issue number, restarts at 1, permanent
    sent: string          // YYYY-MM-DD — the real send date, never the source filename date
    publishDate: string   // YYYY-MM-DD — must equal sent + 42 days (schema-enforced)
    updatedDate: string   // YYYY-MM-DD — bumped on every reader-visible edit
}

// src/content/newsletters/{id}/{lang}.mdx frontmatter
interface NewsletterFrontmatter {
    lang: 'fi' | 'sv' | 'en'
    slug: string          // immutable after publish; unique across all locales in the collection
    pageTitle: string     // <title> minus " | Lauri Lavanti": 50–60 chars total
    title: string         // H1 — the email subject, or a sharpened version of it
    description: string   // 120–160 chars
    ogTitle?: string
    ogEmphasis?: string
    faq?: Array<{ q: string; a: string }>
}

// src/lib/newsletterRoutes.ts — astro-free so scripts can import it
const NEWSLETTER_SEGMENTS = { en: 'newsletter', fi: 'uutiskirje', sv: 'nyhetsbrev' }
const ARCHIVE_SEGMENTS = { en: 'archive', fi: 'arkisto', sv: 'arkiv' }
```

The page's **visible date and JSON-LD `datePublished` are `publishDate`** (when the page went public). `sent` appears only in the provenance line. Display order and sitemap order are by `publishDate`, which is the same order as `sent`.

---

## Editorial pass (per issue, before it enters the repo)

The email and its archive page are different artefacts. The source is the sent email's markdown (its subject line becomes `title`, its send date becomes `sent`); the archive entry is a rewrite of it:

1. Drop the body H1 (`title` frontmatter carries it), the sign-off, any subscribe/reply CTA, and the leading translator blockquote in EN/SV.
2. Date time-bound asides ("muutama viikko sitten" → "maaliskuussa 2026"). Remove donation and support-group asks.
3. Add one question-form H2 and 3–10 internal links to existing lavanti.fi pages. Replace `laurilavanti.fi` with `lavanti.fi`.
4. Keep the tone; do not pad. Passages stay under 150 words.
5. After merge and lift, record the public URL against the source issue so later newsletters may link it.

---

## Dependencies

- [Posts](../posts/spec.md) — loader, trilingual layout, per-locale frontmatter conventions
- [Scheduled publishing](../posts/scheduled-publishing.md) — the build filter and nightly job the embargo rides on
- [Newsletter](./spec.md) — the subscribe component and landing pages the archive hangs off
- [SEO](../seo/spec.md) — JSON-LD, OG and hreflang rules the issue pages satisfy

---

## Anti-patterns

- **Do not** add a bare-id redirect route — it creates a redirect chain through the locale-less alias that `dist-crawl.ts` fails CI on. Slugs are immutable instead.
- **Do not** add tags to the schema without also listing newsletters on category pages — a chip would lead to a page that does not list the issue.
- **Do not** add a `rel=canonical` override — every page is self-canonical; thesis overlap with a blog post is prevented editorially.
- **Do not** compute `publishDate` from the source filename date — four of nine issues were sent on a different day. Use `sent`.
- **Do not** show `sent` as the page date — JSON-LD `datePublished` is `publishDate`, and visible dates must match it.
- **Do not** set `blog_id` for newsletters in `seo.sh` — the four-digit-year slug exemption is keyed on blog ids 20 and 47 and would leak to newsletter ids 20 and 47.
- **Do not** apply the freshness rules — an issue is a dated document, not evergreen content.
- **Do not** name the collection or its files `newsletter` (singular) — that namespace is the subscribe component and landing pages.
- **Do not** add the archive to `navLinks` — the footer site column is derived from it, but so is the header on every page; the archive link is appended in `Footer.astro` only. A footer-only change touches just the `commonElements` contentinfo goldens.

---

## Open Questions

- [ ] Archive-page `lastmod` is the hand-bumped frontmatter `updatedDate`; the nightly lift of a new issue does not bump it. Acceptable for now.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-22 | Initial draft (#1479, Phase 1: plumbing + first issue) |
| 2026-09-22 | Phase 2: footer link to the archive |
