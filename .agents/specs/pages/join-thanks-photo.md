# Spec: Join thank-you page photo

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-06

---

## Intent

After a visitor submits the volunteer form they land on the thank-you page (`/liity/kiitos`,
`/bli-med/tack`, `/join/thanks`). The page confirms receipt in two sentences and nothing else, so
the "you're in" moment reads as a receipt rather than a welcome.

This feature adds one captioned photo of the campaign team under the confirmation text, so the new
volunteer sees who they just joined. The photo already exists in Cloudflare Images; the only new
capability is that the inline image component can show a photographer credit, which this photo
requires.

---

## Scope

### In scope
- One `ImageWithCaption` figure on the three thank-you pages, after the `<Prose>` block, inside the
  existing `<Plate>`
- Optional photographer credit in `ImageWithCaption`, rendered the same way as in `PhotoStrip`
- Trilingual alt and caption
- `updatedDate` bump on the three pages

### Out of scope
- Any other page, including the join page itself
- `PhotoStrip.astro`
- New image assets or uploads
- Changes to the existing `ImageWithCaption` call sites in post 64
- Sharing `creditPrefix` between components

---

## Contract

```gherkin
Feature: Join thank-you page photo

  Scenario: Thank-you page shows the team photo
    Given the thank-you page in any of fi, sv, en
    When the page is built
    Then <main> contains exactly one <figure>, inside the Plate
    And its <img> alt is non-empty and in the page locale
    And its <figcaption> shows the caption in the page locale
    And the figcaption ends with "<prefix>: Erkki Laine"
      where <prefix> is "Kuva" (fi), "Foto" (sv), "Photo" (en)

  Scenario: Figure follows the confirmation text
    Given the thank-you page in any of fi, sv, en
    When the page is built
    Then the <figure> comes after the Prose paragraph in DOM order
    And before the Plate closes

  Scenario: Photo does not compete with the hero
    Given the thank-you page is built
    When the figure's <img> is inspected
    Then it has loading="lazy"
    And it has no fetchpriority
    And it is not preloaded in <head>

  Scenario: Credit is optional
    Given an ImageWithCaption rendered without a photographer prop
    When the markup is inspected
    Then the figcaption contains only the caption
    And no element with class "credit" exists

  Scenario: Credit renders when given
    Given an ImageWithCaption rendered with photographer "Erkki Laine" and lang "sv"
    When the markup is inspected
    Then the figcaption contains a <span class="credit"> with text "Foto: Erkki Laine"
    And the figure's aria-label is still the caption alone

  Scenario: Caption copy respects consent terms
    Given the caption or alt in any locale
    When the text is read
    Then it names no party affiliation or political background of any pictured person
    And it names no private individual other than Lauri Lavanti
```

---

## Data Model

```typescript
// src/components/body/ImageWithCaption.astro
interface Props {
    alt?: string
    caption: string
    image?: string
    /** Selects the credit prefix; defaults to 'fi'. Ignored when photographer is omitted. */
    lang?: Lang
    /** Omit when no credit applies. */
    photographer?: string
}
```

Credit prefix: `{ en: 'Photo', fi: 'Kuva', sv: 'Foto' }`, rendered as
`<span class="credit">{prefix}: {photographer}</span>` inside the `<figcaption>` after the caption
text, `display: block`. `aria-label` on the figure stays the caption only.

Photo: slug `Kampanjatiimi-ryhmakuva-2026`, `body` variant, widths `[400, 800, 1200]`
(source 2600 px wide), photographer Erkki Laine.

---

## Dependencies

- [Join page photo strip](./join-photo-strip.md) — credit convention, caption consent rule
- [Images](../images/spec.md) — `ImageWithCaption` contract, `body` variant

---

## Anti-patterns

- **Do not** append the credit to the caption string — it would leak into the figure's
  `aria-label` and break the locale prefix convention.
- **Do not** make `lang` required — post 64 passes neither `lang` nor `photographer` and must keep
  rendering unchanged.
- **Do not** name people's party background in captions or alt — a consent condition of the photo set.
- **Do not** add `fetchpriority` or a preload — the hero is the LCP element.

---

## Open Questions

None.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-06 | Initial draft (issue #1562) |
| 2026-10-06 | Critic review: figure counted within `<main>`; `lang` defaults to `fi` |
