# Spec: About page photo strips

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-06

---

## Intent

The about page (`/laurista`, `/om-lauri`, `/about`) tells Lauri's story in ~850 words of prose,
a facts list, three Pillars and a CV, with one portrait in the "at home" section. A reader gets the
résumé but not the person: nothing shows where he comes from or what the years between school and
candidacy looked like.

This feature adds twelve captioned photos as three short thematic strips at the seams of the page
where the prose already covers the theme: roots after the Background, politics after the Pillars,
off-duty after the "at home" section. Each strip is one horizontally scrollable, scroll-snapped row,
so the page grows by a few hundred pixels per strip instead of a four-row block, and the reader
reaches the substantive sections sooner. Captions carry the year and one activity.

The scroll layout is a general `PhotoStrip` capability: a strip with more photos than fit one
desktop row (3) renders as a scroll row; three or fewer keep the grid. The join page is unchanged.

---

## Scope

### In scope
- `PhotoStrip` `layout` prop: `'grid' | 'scroll'`, defaulting to `scroll` when `photos.length > 3`
- Scroll layout: one row, `overflow-x: auto`, `scroll-snap-type: x mandatory`, cell width
  `min((100% - gap) / 1.2, 20rem)` below 769 px and `(100% - 2·gap) / 3.3` from 769 px, so the
  next cell always peeks
- Three `Plate` sections (eyebrow + heading per locale) each wrapping a `PhotoStrip` of four photos
- `src/content/aboutPhotos.ts` with slug, trilingual alt + caption, `widths`, optional photographer,
  `section`, `year`; `aboutPhotosBySection` derived from it
- `StripPhoto` type moved to `src/content/photoStrips.ts`; `joinPhotos.ts` and `PhotoStrip.astro`
  import it from there
- Ten new Cloudflare Images assets (originals in `src/images/originals/`, gitignored); two
  existing slugs reused
- `updatedDate` bump on the three pages
- Unit tests for `aboutPhotos` and the `PhotoStrip` layout rule
- About-page aria baselines (fi/sv/en × Chrome/Mobile Chrome) regenerated through the Update
  baselines workflow

### Out of scope
- A photo beside the technology Pillar (waits for a shoot with real working context)
- The hero, the `WhoBio` portrait, the CV, any prose
- Any JavaScript carousel behaviour (arrows, autoplay, dots)
- Any other page; the join strip content

---

## Contract

```gherkin
Feature: About page photo strips

  Scenario: Three strips of four photos
    Given the about page in any of fi, sv, en
    When the page is built
    Then <main> contains three sections headed, in order, by the locale words for
      "Roots", "In politics" and "Off duty"
    And each section contains exactly four <figure> elements
    And each <figure> has an <img> with non-empty alt in the page locale
    And each <figcaption> starts with a four-digit year followed by " – " and an activity

  Scenario: Strips sit at the thematic seams
    Given the about page in any of fi, sv, en
    When the page is built
    Then "Roots" comes after the Background Plate and before the first Pillar
    And "In politics" comes after the third Pillar and before the Education Plate
    And "Off duty" comes after the WhoBio section and before the CurriculumVitae

  Scenario: Each strip is chronological
    Given the four figcaptions of any strip in DOM order
    When their leading years are read
    Then the years are non-decreasing

  Scenario: Layout follows the photo count
    Given a PhotoStrip with three photos
    Then its <ul> has class "grid" and wraps cells into rows
    Given a PhotoStrip with four or more photos
    Then its <ul> has class "scroll" and is a single horizontally scrollable row
    Given a PhotoStrip with an explicit layout prop
    Then the prop wins over the count rule

  Scenario: Scroll row shows a partial next cell
    Given a scroll-layout strip rendered at 375, 768 and 1280 px
    When the row is at its start
    Then the last visible cell is cut by the right edge (≈1.2, ≈2.2 and ≈3.3 cells visible)
    And the document itself has no horizontal overflow

  Scenario: Credit only where required
    Given the twelve figures
    When their figcaptions are read
    Then exactly one carries a credit line "<prefix>: Jari Turunen" (the 2015 Finland–Japan photo)
    And no other figure has a .credit element

  Scenario: Images do not compete with the hero
    Given the about page is built
    When the strip <img> elements are inspected
    Then every one has loading="lazy"
    And none has fetchpriority
    And none is preloaded in <head>

  Scenario: Every cell is 4:3 with the subject in frame
    Given any strip rendered at 375, 768 and 1280 px
    When each image is viewed
    Then each renders at 4:3
    And no face is cut by the crop (portrait sources were pre-cropped before upload)

  Scenario: Srcset widths never exceed the source
    Given a strip photo with source width S and widths W
    When its <img> is built
    Then max(W) <= S
    # 599 px source → [400]; 1600 px source → [400, 800]; others [400, 800, 1200]

  Scenario: Caption and alt copy respect provenance and consent
    Given any caption or alt in any locale
    When the text is read
    Then it names no party affiliation of any pictured person other than Lauri's own candidacy
    And it names no private individual other than Lauri Lavanti
    And the Helsingin yliopisto photo is not used (it is from a relative's dissertation)

  Scenario: Content file is complete
    Given src/content/aboutPhotos.ts
    When the unit test runs
    Then there are exactly twelve entries with unique slugs, four per section
    And every entry has alt and caption for fi, sv and en
    And every caption in every locale starts with the entry's year
    And years are non-decreasing in array order and within each section
    And, where src/images/originals/ exists, every slug has a matching file and max(widths) <= its pixel width

  Scenario: Join strip unaffected
    Given StripPhoto now lives in src/content/photoStrips.ts and PhotoStrip has a layout prop
    When joinPhotos.spec.ts and the join page build run
    Then the join strip still renders as a three-cell grid
```

---

## Data Model

```typescript
// src/content/photoStrips.ts
export interface StripPhoto {
    alt: Record<Lang, string>
    caption: Record<Lang, string>
    photographer?: string
    slug: string
    widths: number[]
}

// src/content/aboutPhotos.ts
export type AboutPhotoSection = 'leisure' | 'politics' | 'roots'
export type TimelinePhoto = StripPhoto & { section: AboutPhotoSection; year: number }
export const aboutPhotos: TimelinePhoto[]                                  // chronological
export const aboutPhotosBySection: Record<AboutPhotoSection, TimelinePhoto[]>

// src/components/body/PhotoStrip.astro
interface Props {
    lang: Lang
    layout?: 'grid' | 'scroll'   // default: photos.length > 3 ? 'scroll' : 'grid'
    photos: StripPhoto[]
}
```

| Section | # | Year | Slug | Source px | Widths | Photographer |
|---|---|---|---|---|---|---|
| roots | 1 | 2005 | `Lauri-Lavanti-veneessa-2005` | 1600 | `[400, 800]` | — |
| roots | 2 | 2007 | `Lauri-Lavanti-basisti-2007-vaaka` | 1536 | `[400, 800, 1200]` | — |
| roots | 3 | 2011 | `Lauri-Lavanti-ylioppilas-2011` | 3264 | `[400, 800, 1200]` | — |
| roots | 4 | 2011 | `Lauri-Lavanti-varusmies-2011-vaaka` | 1832 | `[400, 800, 1200]` | — |
| leisure | 5 | 2015 | `Lauri-Lavanti-athenen-hallituksessa-2015-vaaka` | 2272 | `[400, 800, 1200]` | — |
| leisure | 6 | 2015 | `Lauri-Lavanti-jenkkifutis-2015-vaaka` | 2832 | `[400, 800, 1200]` | — |
| leisure | 7 | 2015 | `Lauri-Lavanti-maajoukkue-Suomi-Japani-2015-vaaka` | 599 | `[400]` | Jari Turunen |
| leisure | 8 | 2020 | `Lauri-Lavanti-ja-esikoinen-potkupyoralla-2020-vaaka` | 3024 | `[400, 800, 1200]` | — |
| politics | 9 | 2021 | `Lauri-Lavanti-metsassa-2021` | 4032 | `[400, 800, 1200]` | — |
| politics | 10 | 2021 | `lauri-lavanti-perusturvajaosto-vaaka` | 1865 | `[400, 800, 1200]` | — |
| politics | 11 | 2022 | `Lauri-Lavanti-aluevaaliehdokas-pellolla` (existing) | 2683 | `[400, 800, 1200]` | — |
| politics | 12 | 2026 | `vihreiden-puoluekokous-Turussa-2026` (existing) | 4000 | `[400, 800, 1200]` | — |

`-vaaka` slugs are 4:3 crops made locally with the subject in frame, because the `body` variant's
`gravity=auto` centres portrait sources and cuts heads off. `lauri-lavanti-perusturvajaosto-vaaka`
is a left-aligned crop of the existing 2.33:1 original for the same reason.

Section wrappers (eyebrow / heading):

| | fi | sv | en |
|---|---|---|---|
| roots | Kuvat / Juuret | Bilder / Rötter | Photos / Roots |
| politics | Kuvat / Politiikassa | Bilder / I politiken | Photos / In politics |
| leisure | Kuvat / Vapaalla | Bilder / På fritiden | Photos / Off duty |

---

## Dependencies

- [Join page photo strip](./join-photo-strip.md) — `PhotoStrip`, credit convention, consent rule
- [Images](../images/spec.md) — `body` variant, alt rules, upload flow
- [About page bio narrative](../about-bio-narrative.md) — section order; this spec inserts three
  sections and rewrites no prose
- [Pages](./spec.md) — `updatedDate`

---

## Anti-patterns

- **Do not** use `Lauri-Lavanti-Helsingin-yliopistolla` — it is from a relative's dissertation;
  Lauri studied at Aalto.
- **Do not** rely on `gravity=auto` for portrait sources — pre-crop to 4:3 and upload as `-vaaka`.
- **Do not** run the bulk upload script — POST each new file alone.
- **Do not** add JavaScript to the scroll row — CSS scroll-snap is the whole mechanism; arrows or
  dots would need a11y work the page does not need.
- **Do not** let the scroll row overflow the document — `overflow-x: auto` stays on the `<ul>`;
  the "E2E horizontal scroll" job fails on document-level overflow.
- **Do not** regenerate aria baselines locally — they are CI-canonical; use the Update baselines
  workflow (memory: ci-baseline-regen).
- **Do not** add a `fetchpriority` or preload — the hero stays LCP.
- **Do not** put archive file paths, Dropbox paths or the campaign repo's name in code, data,
  comments or the PR — the repo is public.
- **Do not** rewrite any about-page prose (about-bio-narrative anti-pattern).

---

## Open Questions

None.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-06 | Initial draft (issue #1564): one 12-photo grid between Background and Pillars |
| 2026-10-06 | Rewritten after visual review: three thematic scroll-snap strips at the page seams; `PhotoStrip` gains the count-based `layout` rule; captions revised by Lauri; Wappu photo recaptioned as the 2015 Athene board photo |
