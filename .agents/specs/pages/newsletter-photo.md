# Spec: Newsletter page photo

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-07

---

## Intent

The newsletter landing page (`/uutiskirje`, `/nyhetsbrev`, `/newsletter`) describes what the
newsletter covers in two short text blocks, then lists recent issues and a subscribe form. Apart from
the hero, nothing on the page shows the person who writes it.

This feature adds one credited photo of Lauri under the "I believe that technology…" paragraph, so the
reader sees the author before the issue list and the form. The photo is a portrait taken at
Kirkkonummi town hall; a photo of Lauri actually writing or working waits for a future shoot.

---

## Scope

### In scope
- `ImageWithCaption` inside the offWhite `Prose`, after its paragraph, in all three locales
- One Cloudflare Images asset (4:3 crop; original gitignored)
- `updatedDate` bump on the three pages
- Explicit assertions in `tests/e2e/pages/newsletter{,Swe,En}Page.ts`

### Out of scope
- The newsletter archive and issue pages
- Any component change

---

## Contract

```gherkin
Feature: Newsletter page photo

  Scenario: Credited photo in the text column
    Given the newsletter page in any of fi, sv, en
    When the page is built
    Then <main> contains exactly one <figure>, inside the offWhite Prose
    And the <figure> is a sibling of the paragraph, not nested inside a <p>
    And its accessible name is "Kirkkonummen kunnantalolla" / "I Kyrkslätts kommunhus" / "At Kirkkonummi town hall"
    And its figcaption ends with "<prefix>: Juha Jantunen"

  Scenario: Photo does not compete with the hero
    Given the page is built
    Then the <img> has loading="lazy", no fetchpriority, and no preload

  Scenario: Accessibility
    When the axe e2e test runs on each locale
    Then it reports no violations

  Scenario: Caption claims only what is known
    Given the caption and alt in any locale
    Then they name the place (Kirkkonummi town hall) and describe the scene
    And they do not claim Lauri is writing, reading or working
```

---

## Data Model

| Slug | Source px | Widths | Photographer |
|---|---|---|---|
| `Lauri-Lavanti-kunnantalolla-poydan-aaressa-vaaka` | 1536 | `[400, 800, 1200]` (ImageWithCaption fixed) | Juha Jantunen |

---

## Dependencies

- [Join thank-you photo](./join-thanks-photo.md) — `ImageWithCaption` credit props
- [Elections page photos](./elections-photos.md) — placement inside `Prose`
- [Images](../images/spec.md) — `body` variant, upload flow

---

## Anti-patterns

- **Do not** place the component directly under the bare markdown line without a blank line — MDX can
  parse it inline and nest the `<figure>` inside the `<p>`.
- **Do not** use the laptop-on-steps photo — it is already the about hero and the WhoBio portrait.
- **Do not** caption the photo as writing or a library — the frame shows neither, and it was taken at
  the town hall.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-07 | Initial (issue #1574) |
