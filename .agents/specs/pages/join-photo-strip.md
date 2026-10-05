# Spec: Join page photo strip

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-05

---

## Intent

The join page (`/liity`, `/bli-med`, `/join`) asks a visitor to volunteer for the campaign, but below the hero it shows only a heading and a form. Nothing on the page shows that a team already exists or what volunteering looks like, so the page reads as an administrative form rather than an invitation to join people.

This feature adds a strip of three captioned photographs above the volunteer form: the campaign team together, the team planning, and the candidate handing out flyers at a market. The photos answer "who will I be working with?" and "what would I be doing?" before the visitor reaches the form.

The strip is content, not navigation: it links nowhere and offers no download. Photographer credit is rendered where the photographer requires it.

---

## Scope

### In scope
- A `PhotoStrip` body component that renders a list of photos as captioned `<figure>` elements in a responsive grid
- Photo data (slugs, localised alt, localised caption, optional photographer) in a dedicated content file
- Three new Cloudflare Images assets with originals in `src/images/originals/`
- The strip placed before `<VolunteerForm>` on all three locale join pages
- `updatedDate` bump on the three join pages
- Unit test for the content file

### Out of scope
- Photos on the about page or any other page
- A timeline or lightbox component
- Changes to `Gallery.astro`, `ImageWithCaption.astro`, `WhoBio.astro`, the hero, or `VolunteerForm`
- The `/join/thanks` page
- Reordering or rewording the existing join page copy

---

## Contract

```gherkin
Feature: Join page photo strip

  Scenario: Strip renders three captioned photos
    Given the join page in any of fi, sv, en
    When the page is built
    Then the main content contains exactly three <figure> elements inside the photo strip
    And each <figure> has an <img> with a non-empty alt in the page locale
    And each <figure> has a visible <figcaption> with the caption in the page locale

  Scenario: Strip precedes the form
    Given the join page in any of fi, sv, en
    When the page is built
    Then the photo strip appears before the volunteer form in DOM order
    And after the hero

  Scenario: Photographer credit only where required
    Given the join page in any of fi, sv, en
    When the page is built
    Then the first two figures show a credit line "<prefix>: Erkki Laine"
      where <prefix> is "Kuva" (fi), "Foto" (sv), "Photo" (en)
    And the third figure shows no credit line

  Scenario: Images are lazy and do not compete with the hero
    Given the join page is built
    When the photo strip markup is inspected
    Then every strip <img> has loading="lazy"
    And no strip <img> has fetchpriority
    And no strip image is preloaded in <head>

  Scenario: Responsive grid
    Given the join page is rendered
    When the viewport is narrower than 640 px (e.g. 375 px)
    Then the three figures stack in one column
    When the viewport is 640 px wide or wider (e.g. 640, 768, 1280 px)
    Then the three figures sit in one row of three equal columns

  Scenario: Uniform aspect ratio
    Given the strip is rendered at any viewport
    When the three images are measured
    Then each rendered image has a 4:3 aspect ratio
    And the portrait source is cropped, not letterboxed
    # Holds without CSS: getImageSrcset derives h from the variant ratio per width,
    # and fit=crop never upscales, so the 835 px source yields at most 835x626.

  Scenario: Srcset from the body variant
    Given a strip photo with slug S and srcset widths W from the content file
    When its <img> is built
    Then src and srcset use getImageSrcset(S, 'body', W) from src/lib/images.ts
    And no width in W exceeds the source's pixel width

  Scenario: Caption copy respects consent terms
    Given any strip caption or alt in any locale
    When the text is read
    Then it names no party affiliation or political background of any pictured person
    And it does not name private individuals other than Lauri Lavanti

  Scenario: Content file is complete
    Given the strip content file
    When the unit test runs
    Then every entry has alt and caption for fi, sv and en
    And every slug has a matching file in src/images/originals/
    And every entry's srcset widths are all <= the original's pixel width
```

---

## Data Model

```typescript
import type { Lang } from './nav'

export interface StripPhoto {
    /** Localised alt text; describes the scene. */
    alt: Record<Lang, string>
    /** Localised visible caption. Activity-first, no party backgrounds. */
    caption: Record<Lang, string>
    /** Cloudflare Images slug. Original lives in src/images/originals/{slug}.jpg */
    slug: string
    /** Omit when no credit applies (team member's own photo). */
    photographer?: string
    /** Srcset widths; none may exceed the original's pixel width. */
    widths: number[]
}

export const joinPhotos: StripPhoto[]
```

Photos:

| Slug | Source width | Widths | Photographer |
|------|--------------|--------|--------------|
| `Kampanjatiimi-ryhmakuva-2026` | 2600 | `[400, 800, 1200]` | Erkki Laine |
| `Kampanjatiimi-suunnittelee-2026` | 2600 | `[400, 800, 1200]` | Erkki Laine |
| `Lauri-Lavanti-jakaa-esitteita-torilla` | 835 | `[400, 800]` | — |

Component props:

```typescript
interface Props {
    lang: Lang
    photos: StripPhoto[]
}
```

Image delivery: `body` variant from `src/lib/images.ts` (`w=2400,h=1800,fit=crop,gravity=auto`). Srcset widths come from each photo's `widths`; `sizes` is `(max-width: 639px) 100vw, 33vw`.

Credit rendering follows `Gallery.astro`: `creditPrefix[lang]: photographer`, inside the `<figcaption>` after the caption.

---

## Dependencies

- [Images](../images/spec.md) — `body` variant, alt rules, upload flow
- [Pages](./spec.md) — page frontmatter, `updatedDate` rule

---

## Anti-patterns

- **Do not** run `scripts/upload-to-cf-images.mts` for the three new files — it re-POSTs all originals and times out. POST each new file alone.
- **Do not** set `alt=""` — the photos are content, not decoration.
- **Do not** name people's party background in captions or alt — a consent condition of the photo set.
- **Do not** reuse `Gallery.astro` — it is a download gallery with licence copy and crop pickers; the strip has neither.
- **Do not** add `fetchpriority` or a preload — the hero is the LCP element and must stay so.
- **Do not** letterbox the portrait photo — crop to 4:3 with `fit=crop` so the row aligns.
- **Do not** mention the campaign's private repository in code, data or comments.
- **Do not** merge before all three slugs are uploaded to Cloudflare Images — the build cannot detect a missing CF asset; the `<img>` 404s in production. The unit test checks `src/images/originals/`, not CF.
- **Do not** add CSS `aspect-ratio` to force 4:3 — the srcset already yields 4:3 crops at every width.

---

## Open Questions

None.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-05 | Initial draft (issue #1560) |
| 2026-10-05 | Critic review: 640 px breakpoint in Contract; per-photo `widths` replaces open question; missing-CF-asset moved to Anti-patterns |
