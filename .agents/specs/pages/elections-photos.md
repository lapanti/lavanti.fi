# Spec: Elections page photos

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-07

---

## Intent

The elections page (`/eduskuntavaalit`, `/riksdagsvalet`, `/elections`) explains why Lauri is
running, the three campaign themes, how to vote and when the campaign events are, entirely in text.
Two places would read better with a photo: the "Why" section's paragraph on the Digital Independence
citizens' initiative, and the event calendar, where a reader sees a list of events but not what one
looks like.

This feature adds one credited photo of the initiative's street advert to the "Why" text, and a
three-photo "campaign life" strip directly above the calendar. The Pillars stay text-only: they
have no image slot and the economy theme has no fitting photo yet.

---

## Scope

### In scope
- `ImageWithCaption` inside the "Why" `Prose`, after the initiative paragraph
- A `Plate` with a three-photo `PhotoStrip` (grid layout) immediately before `EventCalendar`
- `src/content/electionPhotos.ts` and its unit test
- Four new Cloudflare Images assets (4:3 crops; originals gitignored)
- `updatedDate` bump on the three pages
- Explicit e2e assertion in `tests/e2e/pages/electionPage.ts`
- `jpegWidth` moved from the two content specs into `tests/jpegWidth.ts` (not `tests/helpers.ts`:
  every component spec imports helpers, so `vitest related` would run them all on each commit)

### Out of scope
- Photos inside the Talous / Sivistys / Vapaus Pillars
- The campaign finance subpage
- Any component change

---

## Contract

```gherkin
Feature: Elections page photos

  Scenario: Initiative photo in the Why section
    Given the elections page in any of fi, sv, en
    When the page is built
    Then the Why section's Prose contains exactly one <figure> after its last paragraph
    And the figure's figcaption ends with "<prefix>: Julia Kiljander"
    And the figure is no wider than the text column

  Scenario: Initiative caption does not ask readers to sign
    Given the initiative photo's caption and alt in any locale
    When the text is read
    Then it does not ask the reader to sign the initiative
    And the image crop does not show the advert's "sign now" line

  Scenario: Campaign-life strip above the calendar
    Given the elections page in any of fi, sv, en
    When the page is built
    Then a Plate headed "Kampanjan arkea" / "Kampanjens vardag" / "On the campaign trail"
      comes immediately before the event calendar
    And it contains a PhotoStrip <ul> with class "grid" and exactly three <figure> elements
    And only the kick-off photo carries a credit ("<prefix>: Erkki Laine")

  Scenario: Images do not compete with the hero
    Given the page is built
    Then every new <img> has loading="lazy", no fetchpriority, and no preload

  Scenario: Captions on sand pass contrast
    Given the Why section uses the sand ground
    When the axe e2e test runs
    Then it reports no violations

  Scenario: Consent and naming
    Given any new caption or alt
    Then it names no private individual other than Lauri Lavanti
    And it names no party background of anyone pictured other than Lauri's own party's tent
```

---

## Data Model

```typescript
// src/content/electionPhotos.ts
export const electionPhotos: StripPhoto[]   // three entries, see table
```

| Slug | Source px | Widths | Photographer |
|---|---|---|---|
| `Lauri-Lavanti-vihreiden-teltalla-markkinoilla-vaaka` | 1080 | `[400, 800]` | — |
| `Lauri-Lavanti-sateenkaariliput-kunnantalolla-vaaka` | 1880 | `[400, 800, 1200]` | — |
| `Kampanjatiimi-kokous-2026-vaaka` | 2311 | `[400, 800, 1200]` | Erkki Laine |
| `Lauri-Lavanti-digitaalinen-itsenaisyys-mainoksen-edessa-vaaka` (ImageWithCaption) | 4014 | fixed `[400, 800, 1200]` | Julia Kiljander |

---

## Dependencies

- [About page photo strips](./about-photo-timeline.md) — `PhotoStrip` grid/scroll rule
- [Join thank-you photo](./join-thanks-photo.md) — `ImageWithCaption` credit props
- [Images](../images/spec.md) — `body` variant, upload flow

---

## Anti-patterns

- **Do not** place the `ImageWithCaption` after `</Prose>` — outside the text column it spans the
  full plate and dwarfs the text.
- **Do not** caption the initiative photo as a call to sign — the 50,000 signatures were collected
  in July 2026.
- **Do not** name the kick-off participants — one must stay unnamed under the consent terms.
- **Do not** rely on `gravity=auto` for portrait sources — pre-crop to 4:3 (`-vaaka`).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-07 | Initial (issue #1572) |
