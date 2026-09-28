# Spec: Canonical Person + ProfilePage JSON-LD with co-author support

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-09-28

---

## Intent

Search engines, LLMs, and answer engines (Google AI Overviews, ChatGPT, Perplexity, Gemini) rely on schema.org structured data to identify and attach authority to real-world entities. Currently lavanti.fi emits a `Person` schema on About pages, but it lacks a stable `@id`, misses key authority signals (Wikipedia, Wikidata, employer, education, localized expertise), and every `BlogPosting.author` is a bare name stub with no entity link. This prevents LLMs from confidently resolving "Lauri Lavanti" as the same entity across pages and external knowledge sources.

This spec defines: a canonical `Person` entity with a stable `@id`, a `ProfilePage` wrapper for About pages (2025/2026 best practice per Google Search Central), entity-by-id references on all `BlogPosting` author fields, and optional co-author support with auto-rendered bylines.

The goal is maximum E-E-A-T entity reconciliation: LLMs and answer engines should attach Lauri Lavanti as an authority on artificial intelligence, digital independence, technology, and politics.

---

## Scope

### In scope
- `src/content/person.ts` — new file, single source of truth for all canonical Person data
- `PERSON_ID = 'https://lavanti.fi/fi/laurista/#person'` — stable entity identifier; `id="person"` anchor added to FI About page to make fragment resolvable
- `src/lib/jsonld.ts` — add `PROFILEPAGE = 'ProfilePage'` constant
- `src/components/Head.astro` — consume `person.ts`; emit `ProfilePage > mainEntity Person` branch; emit `BlogPosting.author` as Person id-reference array; emit `<meta property="article:author">` once per author
- `src/content.config.ts` — `authors` field (optional) on the posts collection schema, shared per post id via `meta.json` (with `role` resolved per locale — see the posts spec's Data Model)
- `src/layouts/PostLayout.astro` — auto-rendered co-author byline after `<slot />` when `authors.length > 1`
- About-page frontmatter: `type: 'Person'` → `'ProfilePage'` in fi/en/sv
- Visible Wikipedia link sentence on all three About pages
- Migrate hand-written `_Authors:…_` lines to `authors` frontmatter on 5 co-authored posts (× 3 locales = 15 files):
  - post 22 — Johanna Fleming, Lauri Lavanti, Paula Oittinen
  - post 27 — Johanna Fleming, Lauri Lavanti, Paula Oittinen
  - post 41 — Ronja Karkinen, Lauri Lavanti
  - post 48 — Atte Harjanne, Lauri Lavanti
  - post 56 — Miisa Jeremejew, Lauri Lavanti
- Tests: `Head.spec.ts`, `jsonld.spec.ts`

### Out of scope
- Editing Wikipedia (adding citations or sameAs links from Wikipedia to this site)
- `Organization` schema for the site itself
- `disambiguatingDescription` (no known namesakes)
- Backfilling `authors` on posts beyond the five listed above

---

## Contract

```gherkin
Feature: Canonical Person JSON-LD entity

  # ── Person source of truth ──────────────────────────────────────────────────

  Scenario: person.ts exports canonical Person data
    Given src/content/person.ts exists
    Then it exports PERSON_ID = 'https://lavanti.fi/fi/laurista/#person'
    And it exports personGivenName = 'Lauri', personFamilyName = 'Lavanti'
    And it exports personBirthDate = '1991-10-01'
    And it exports personBirthPlace as a Place with name 'Jyväskylä'
    And it exports personNationality as a Country with name 'FI'
    And it exports personWorksFor as Organization { name: 'OP', url: 'https://www.op.fi/' }
    And it exports personAlumniOf as an array of 3 educational orgs (Aalto-yliopisto, Omnia, Masalan lukio)
    And it exports personSameAs containing 'https://fi.wikipedia.org/wiki/Lauri_Lavanti'
    And it exports personSameAs containing 'https://www.wikidata.org/wiki/Q139711658'
    And it exports personSameAs containing 'https://markkinavihreat.fi/ketka/lauri-lavanti/'
    And socialUrls does NOT contain 'https://markkinavihreat.fi/ketka/lauri-lavanti/' (it drives the footer's rel="me" links)
    And personSameAs does NOT contain 'https://digitaalinenitsenaisyys.fi/'
    And it exports personMemberOf as an array: PoliticalParty { name: 'Vihreä liitto', url: 'https://www.vihreat.fi' } and Organization { '@id': 'https://markkinavihreat.fi/#organization', name: 'Markkinavihreät', url: 'https://markkinavihreat.fi/' }
    And it exports personAffiliation containing { '@type': 'Organization', name: 'Digitaalinen itsenäisyys -kansalaisaloite', url: 'https://digitaalinenitsenaisyys.fi/' }
    And it exports personKnowsAbout as a Record<Lang, string[]> with distinct values per locale
    And it exports personHasOccupation as a Record<Lang, array> with two Occupation entries (politician, lead developer)
    And personImage is a Cloudinary URL built with c_fill, g_north (top-anchored), 1200×1200 from 'Lauri-Lavanti-seisoo-suorassa-sinisella-taustalla'

  # ── ProfilePage on About pages ───────────────────────────────────────────────

  Scenario: About page emits ProfilePage with canonical Person
    Given an About page (fi/en/sv) with frontmatter type: 'ProfilePage'
    When the page is rendered
    Then the JSON-LD contains @type: 'ProfilePage'
    And the JSON-LD contains mainEntity with @type: 'Person'
    And mainEntity['@id'] = 'https://lavanti.fi/fi/laurista/#person'
    And mainEntity contains name, givenName, familyName, birthDate, birthPlace, nationality
    And mainEntity contains worksFor, alumniOf (3 entries), memberOf (2 entries: Vihreä liitto, Markkinavihreät), affiliation
    And mainEntity contains knowsAbout localised to the page's lang
    And mainEntity contains hasOccupation localised to the page's lang
    And mainEntity contains knowsLanguage: ['fi', 'en', 'sv']
    And mainEntity.sameAs includes Wikipedia, Wikidata and Markkinavihreät person page URLs
    And mainEntity.sameAs does NOT include 'https://digitaalinenitsenaisyys.fi/'
    And mainEntity.image is a Cloudinary URL with g_north crop, 1200×1200

  Scenario: PERSON_ID fragment resolves on FI About page
    Given the FI About page at /fi/laurista/
    When the HTML is rendered
    Then an element with id="person" exists in the page (wrapping the bio/hero section)
    And navigating to /fi/laurista/#person anchors to that element

  # ── BlogPosting author ────────────────────────────────────────────────────────

  Scenario: Solo-authored post references Person by id
    Given a BlogPosting with no authors frontmatter field
    When the page is rendered
    Then BlogPosting.author is an array with one entry
    And that entry is { '@type': 'Person', '@id': 'https://lavanti.fi/fi/laurista/#person' }
    And there is exactly one <meta property="article:author"> in the HTML
    And that meta content attribute is 'Lauri Lavanti'

  Scenario: Co-authored post references multiple Persons
    Given a BlogPosting with authors: [{ name: 'Miisa Jeremejew', role: 'municipal councillor' }, 'lauri']
    When the page is rendered
    Then BlogPosting.author is an array with two entries
    And the first entry is { '@type': 'Person', name: 'Miisa Jeremejew' }
    And the second entry is { '@type': 'Person', '@id': 'https://lavanti.fi/fi/laurista/#person' }
    And there are exactly two <meta property="article:author"> tags in the HTML
    And the first meta content is 'Miisa Jeremejew'
    And the second meta content is 'Lauri Lavanti'

  # ── Co-author byline rendering ───────────────────────────────────────────────

  Scenario: No byline rendered for solo-authored post
    Given a BlogPosting with no authors frontmatter field (or authors: ['lauri'])
    When the page is rendered
    Then no author byline element appears after the post content

  Scenario: Per-author byline with role — role in parentheses after name
    Given a BlogPosting in lang 'en' with authors:
      | entry           | role                  |
      | Miisa Jeremejew | municipal councillor  |
      | lauri           | (sentinel)            |
    When the page is rendered
    Then the byline after the post content is:
      _Authors: Miisa Jeremejew (municipal councillor) and Lauri Lavanti (Municipal councillor & Lead Developer)._
    And the byline is rendered as an italic paragraph
    And render order follows frontmatter array order (first entry → first name)
    # Lauri sentinel gets personJobTitle[lang] injected because a co-author has a role

  Scenario: Byline localises prefix in Finnish
    Given a BlogPosting in lang 'fi' with two co-authors
    When the page is rendered
    Then the byline begins with "Tekijät:"

  Scenario: Byline localises prefix in Swedish
    Given a BlogPosting in lang 'sv' with two co-authors
    When the page is rendered
    Then the byline begins with "Författare:"

  Scenario: Lauri sentinel gets personJobTitle when co-author has role
    Given a BlogPosting in lang 'en' with authors:
      | name          | role                  |
      | Atte Harjanne | member of parliament  |
      | lauri         | (sentinel)            |
    When the page is rendered
    Then the byline is:
      _Authors: Atte Harjanne (member of parliament) and Lauri Lavanti (Municipal councillor & Lead Developer)._

  Scenario: Author with no role shows name only in byline
    Given a BlogPosting with a co-author entry that has no role field
    And no other co-authors have roles
    When the page is rendered
    Then that author appears in the byline as name only (no parenthetical)

  Scenario: Lauri sentinel resolves to name only when no co-author has a role
    Given a BlogPosting with authors: ['lauri', { name: 'Co-author' }] (no role on co-author)
    When the page is rendered
    Then Lauri appears as 'Lauri Lavanti' with no role parenthetical

  # ── knowsAbout localisation ──────────────────────────────────────────────────

  Scenario: knowsAbout uses correct locale
    Given an About page or BlogPosting in lang 'en'
    When the Person (or mainEntity) is emitted
    Then Person.knowsAbout contains English-language topic strings
    And does NOT contain Finnish-only strings (e.g. 'Talouspolitiikka')

  Scenario: knowsAbout uses Finnish for fi locale
    Given an About page or BlogPosting in lang 'fi'
    When the Person (or mainEntity) is emitted
    Then Person.knowsAbout contains Finnish-language topic strings

  Scenario: knowsAbout uses Swedish for sv locale
    Given an About page or BlogPosting in lang 'sv'
    When the Person (or mainEntity) is emitted
    Then Person.knowsAbout contains Swedish-language topic strings
    And does NOT contain Finnish-only strings (e.g. 'Talouspolitiikka')

  # ── Wikipedia link on About pages ────────────────────────────────────────────

  Scenario: Wikipedia link visible on all About pages
    Given any About page (fi/en/sv) after migration
    When the page is rendered
    Then the page body contains a visible hyperlink to 'https://fi.wikipedia.org/wiki/Lauri_Lavanti'

  # ── WebSite / default type regression ────────────────────────────────────────

  Scenario: WebSite type pages unaffected by refactor
    Given a page rendered with no explicit type (defaults to WebSite)
    When the page is rendered
    Then the JSON-LD contains @type: 'WebSite'
    And the JSON-LD contains name: 'Lauri Lavanti'
    And the JSON-LD contains sameAs with every socialProfiles URL plus Wikipedia, Wikidata and the Markkinavihreät person page

  # ── Co-authored posts migration ──────────────────────────────────────────────

  Scenario: All 5 co-authored posts have authors frontmatter in all 3 locales
    Given posts 22, 27, 41, 48, 56 in all three locales (fi/en/sv) after migration
    When each MDX frontmatter is read
    Then each post has an authors field listing the correct co-authors:
      | post | authors (in array order)                                      |
      | 22   | Johanna Fleming, Lauri Lavanti, Paula Oittinen                |
      | 27   | Johanna Fleming, Lauri Lavanti, Paula Oittinen                |
      | 41   | Ronja Karkinen, Lauri Lavanti                                 |
      | 48   | Atte Harjanne, Lauri Lavanti                                  |
      | 56   | Miisa Jeremejew, Lauri Lavanti                                |

  Scenario: Migrated en posts have no inline Authors line in MDX body
    Given posts 22, 27, 41, 48, 56 in lang 'en' after migration
    When the MDX content is read
    Then none contains a line matching _Authors:…_ in the body
    And publication-info lines (_Published in…_) remain unchanged

  Scenario: Migrated fi/sv posts had no inline Authors line to begin with
    Given posts 22, 27, 41, 48, 56 in lang 'fi' or 'sv' after migration
    When the MDX content is read
    Then none contains a line matching _Tekijät:…_ or _Författare:…_ in the body

  Scenario: Migrated post 56 (Lähteelä) renders per-author byline with role
    Given post 56 in lang 'en' after migration
    And authors frontmatter: [{ name: 'Miisa Jeremejew', role: 'municipal councillor' }, 'lauri']
    When the page is rendered
    Then the byline reads: _Authors: Miisa Jeremejew (municipal councillor) and Lauri Lavanti (Municipal councillor & Lead Developer)._
    And is rendered as an italic paragraph after the post body
    # Lauri sentinel gets personJobTitle['en'] because Miisa has a role

  Scenario: Migrated post 48 (biometrics) renders per-author byline — Harjanne with role, Lauri with personJobTitle
    Given post 48 in lang 'en' after migration
    And authors frontmatter: [{ name: 'Atte Harjanne', role: 'member of parliament' }, 'lauri']
    When the page is rendered
    Then the byline reads: _Authors: Atte Harjanne (member of parliament) and Lauri Lavanti (Municipal councillor & Lead Developer)._
    And is rendered as an italic paragraph after the post body

  Scenario: Migrated post 41 renders name-only byline (Ronja has no role, Lauri is sentinel)
    Given post 41 in lang 'en' after migration
    And authors frontmatter: [{ name: 'Ronja Karkinen' }, 'lauri']
    When the page is rendered
    Then the byline reads: _Authors: Ronja Karkinen and Lauri Lavanti._
    And is rendered as an italic paragraph after the post body

  Scenario: Migrated post 22 renders three-author name-only byline
    Given post 22 in lang 'en' after migration
    And authors frontmatter: [{ name: 'Johanna Fleming' }, 'lauri', { name: 'Paula Oittinen' }]
    When the page is rendered
    Then the byline reads: _Authors: Johanna Fleming, Lauri Lavanti, and Paula Oittinen._
    And is rendered as an italic paragraph after the post body
```

---

## Data Model

```typescript
// src/content/person.ts

export const PERSON_ID = 'https://lavanti.fi/fi/laurista/#person'

// Co-author entry in post frontmatter
// String shorthand 'lauri' resolves to the canonical PERSON_ID reference
export type AuthorEntry =
  | 'lauri'
  | {
      name: string
      url?: string
      sameAs?: string[]
      role?: string   // localized role/title string (e.g. 'kunnanvaltuutettu'); omit for name-only byline
    }

// Added to the posts collection schema in src/content.config.ts (shared per post id
// via meta.json — role is the one sub-field resolved per locale, see posts spec).
// When absent, implementation defaults to ['lauri']
interface Post {
  // … existing fields …
  authors?: AuthorEntry[]
}

// Resolved author for JSON-LD emission
type ResolvedAuthor =
  | { '@type': 'Person'; '@id': string }                   // Lauri → id ref
  | { '@type': 'Person'; name: string; url?: string; sameAs?: string[] }  // co-author

// Byline rendering rules:
// - Render order = frontmatter array order (first entry → first name).
// - String sentinel 'lauri' must always be used when Lauri is an author (never explicit name object).
// - 'lauri' sentinel resolves to name 'Lauri Lavanti'.
//   - If any co-author has a role → Lauri also gets personJobTitle[lang] as his role.
//   - If no co-author has a role → Lauri appears name-only (no parenthetical).
// - Per-author format: each author rendered as "Name (role)" if role present, "Name" if absent.
//   Joining: two authors → "A and B"; three+ → Oxford comma "A, B, and C".
// - Byline prefix per lang: 'en' → 'Authors:', 'fi' → 'Tekijät:', 'sv' → 'Författare:'
// - Byline is an italic paragraph (<p><em>…</em></p>), ends with period.

// <meta property="article:author"> content:
// - For 'lauri' sentinel → content = 'Lauri Lavanti'
// - For inline co-author object → content = the entry's name field
// - Emit one tag per author, in frontmatter array order.

// Person image: Cloudinary URL
// src: 'Lauri-Lavanti-seisoo-suorassa-sinisella-taustalla'
// crop: { type: 'fill', gravity: 'north' }  ← g_north, top-anchored
// width: 1200, height: 1200

// sameAs array (complete):
// 1. https://bsky.app/profile/lauri.lavanti.fi
// 2. https://www.facebook.com/laurilavanti
// 3. https://www.instagram.com/laurilavanti/
// 4. https://www.linkedin.com/in/lapanti
// 5. https://mastodon.social/@laurilavanti
// 6. https://www.threads.com/@laurilavanti
// 7. https://www.tiktok.com/@laurilavanti
// 8. https://fi.wikipedia.org/wiki/Lauri_Lavanti
// 9. https://www.wikidata.org/wiki/Q139711658
// 10. https://markkinavihreat.fi/ketka/lauri-lavanti/  ← not in socialUrls (no rel="me")

// memberOf array:
// 1. { '@type': 'PoliticalParty', name: 'Vihreä liitto', url: 'https://www.vihreat.fi' }
// 2. { '@type': 'Organization', '@id': 'https://markkinavihreat.fi/#organization',
//      name: 'Markkinavihreät', url: 'https://markkinavihreat.fi/' }
// Markkinavihreät's own Person node (https://markkinavihreat.fi/ketka/lauri-lavanti/#person)
// links back with sameAs → https://lavanti.fi/fi/laurista/ and Wikidata Q139711658.
```

---

## Dependencies

- [seo/spec.md](./spec.md) — overarching SEO strategy for lavanti.fi; this spec extends it with entity/E-E-A-T concerns

---

## Anti-patterns

- **Do not** put `digitaalinenitsenaisyys.fi` in `sameAs` — it is a multi-author citizen initiative, not a canonical URL for Lauri Lavanti. Use `affiliation` instead.
- **Do not** repeat the full Person object on every `BlogPosting` — emit a bare `{ '@type': 'Person', '@id': PERSON_ID }` reference. Duplicating the full object risks entity fragmentation across pages.
- **Do not** use `g_center` (default Cloudinary gravity) for the Person image — the face will be cropped on square format. Always specify `gravity: 'north'`.
- **Do not** hardcode person data in `Head.astro` — all Person constants must come from `src/content/person.ts` to keep a single source of truth.
- **Do not** compare role/place with case-insensitive or trimmed equality for the shared-suffix byline decision — use exact string equality. If strings differ by even whitespace, use per-author format; let the content author standardise.

---

## Open Questions

*(none — all decisions resolved in planning)*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-23 | Initial draft |
| 2026-05-23 | Fix Critic findings: name-order rule (array order), article:author content spec, migration scenarios for all 5 posts, Wikipedia link scenario, WebSite regression scenario, sv knowsAbout scenario, byline Oxford-comma + name-only rules |
| 2026-05-23 | Drop shared-suffix byline format; drop place field; Lauri sentinel = name-only; per-author role in parentheses only |
| 2026-05-23 | Fix stale Given example (remove place); clarify fi/sv posts also had inline bylines requiring removal |
| 2026-05-23 | Lauri sentinel always required; sentinel gets personJobTitle[lang] role injected when any co-author has a role |
| 2026-09-28 | memberOf becomes an array with Markkinavihreät (`https://markkinavihreat.fi/#organization`); sameAs adds the Markkinavihreät person page (JSON-LD only, not rel="me"); PERSON_ID and About path corrected from `/fi/about/` to `/fi/laurista/` |
