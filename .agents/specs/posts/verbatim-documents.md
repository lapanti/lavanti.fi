# Spec: Motion and Speech Posts

> **Pattern**: [The Spec](https://asdlc.io/patterns/the-spec) — Living document, permanent source of truth.
> **Status**: `Active`
> **Last updated**: 2026-10-21

---

## Intent

Some posts publish a document Lauri filed or delivered: a council motion (valtuustoaloite / fullmäktigemotion / council motion), a motion to any other body, or a speech held anywhere (council, party congress, conference). The document is a public record. Readers, journalists and opponents compare the post against the filed motion or the minutes, so the post must reproduce it as filed or delivered, signature included.

The content checks still apply to the whole body: question headings (`aeo.sh`), passage length (`mdx-deep.ts`), internal links (`content.sh`). Earlier posts met them by inserting H2s and a lead into the document itself (posts 39, 59, 89, 90), which made the published text differ from the record. This spec moves every SEO/AEO element into an intro block before the document and leaves the document untouched.

---

## Scope

### In scope
- Body structure of posts whose main content is a motion or a speech
- Translation of the document into the non-original locales
- Tagging: `council-motion` for motions, `speech` for speeches

### Out of scope
- Posts that only discuss or link to a motion (e.g. 55, 80) — ordinary posts
- Citizens' initiatives (kansalaisaloite) Lauri did not author as a document
- Check-script changes. No check skips the document; see Anti-patterns for what to do when the document trips one

---

## Contract

### Body structure

A motion or speech post body has four parts, in this order:

1. **Intro** — written in the post's normal voice (`/write`).
   - Opening paragraph, answer-first: what the document is, when and where it was filed or delivered, what it proposes or argues. The answer falls within the first 100 words.
   - One or more question-form H2s that summarise the document in Lauri's own words and say why it matters. Typical: `Mitä aloitteessa esitetään?`, `Miksi …?`.
   - Status: for a motion, the filing date, the board preparing the response and, once known, the outcome; for a speech, the agenda item and the decision or vote. Update this part when the status changes and bump `updatedDate`.
   - Carries the post's internal links (3–10, `content.sh`).
2. **Boundary H2** — a fixed heading that opens the document:

   | Type | fi | sv | en |
   |---|---|---|---|
   | Motion | `Aloite kokonaisuudessaan` | `Motionen i sin helhet` | `The motion in full` |
   | Speech | `Puhe kokonaisuudessaan` | `Talet i sin helhet` | `The speech in full` |

   One italic source line follows it and replaces any older dateline such as `*Vihreä valtuustoryhmä ja Lauri Lavanti, 16.6.2025*`, e.g. `*Jätetty Kirkkonummen kunnanvaltuustolle 20.10.2026.*` / `*Pidetty Kirkkonummen kunnanvaltuustossa 19.10.2026.*`. In a translated locale the line also says it is a translation, e.g. `*Lämnad till Kyrkslätts kommunfullmäktige 20.10.2026. Översättning av den finska originaltexten.*`
3. **Document** — the text as filed or delivered:
   - Paragraph breaks as in the original. A line break inside a paragraph in a PDF copy is a wrap, not a break.
   - No inserted headings, blockquotes, pull quotes, emphasis, links or list markup. The document's own headings, if it had any, stay as H3.
   - The closing signature stays, in its original order, one line each, joined with a trailing `\`.
   - Corrections never go into the text. A factual correction goes in the afterword as an editorial note.
   - Exception, a corrected speech: when a speech is published with factual errors fixed in the text (post 85), the boundary H2 says so (`Puhe korjattuna` / `Talet i korrigerad form` / `The talk, corrected`) and the afterword's editorial note lists every change. Use only when the delivered text would spread errors; the default is the text as delivered.
4. **Afterword** (optional) — opens with its own H2 so a reader cannot mistake it for part of the document. Further reading, related posts, editorial notes.

The signature is the only name at the end of a post. The no-byline rule still applies to everything Lauri writes around the document.

### Source of truth

- Motion: the text as filed (Lauri's file, or the council minutes where they quote it).
- Speech: the text as delivered. For speeches published before this spec, the site text with inserted headings, pull quotes and emphasis removed.

### Translations

The locale of the original language carries the document verbatim. The other two locales carry a full, faithful translation: same paragraph count, same order, signature translated (`Vihreä valtuustoryhmä` → sv `Den gröna fullmäktigegruppen`, en `The Green Council Group`), labelled in the source line. Post 85 was delivered in English, so its `en.mdx` is the verbatim locale.

```gherkin
Feature: Motion and speech posts

  Scenario: New motion post
    Given a council motion filed on a known date
    When its post is written
    Then the body opens with an answer-first paragraph and at least one question H2
    And the document follows the "Aloite kokonaisuudessaan" boundary H2 unchanged, signature included
    And meta.json carries the council-motion tag

  Scenario: Document trips a content check
    Given a document paragraph over 150 words, or a phrase in style-fi.sh or aeo.sh word lists
    When the pre-commit hook rejects the post
    Then the document is not reworded
    And the author decides whether the checks get a verbatim-region skip

  Scenario: Translated locale
    Given the motion was filed in Finnish
    When sv.mdx and en.mdx are written
    Then each document section has the same paragraph count as fi.mdx
    And the source line says the text is a translation
```

---

## Dependencies

- [Blog posts](./spec.md) — file layout, `meta.json`, FAQ plate
- [Tags](../tags/spec.md) — `council-motion` and `speech` are editorial tags, assigned from the occasion
- `/write` and `/review-content` skills — voice rules apply to the intro and afterword only

---

## Anti-patterns

- **Do not** insert headings, a lead paragraph or a pull quote into the document to satisfy a check. Put the H2 in the intro.
- **Do not** reword a document sentence that trips `style-fi.sh` or `aeo.sh`. Stop and ask; the fix is a check exemption, not an edit.
- **Do not** split or merge document paragraphs, in any locale.
- **Do not** drop the signature, or move it into the dateline.
- **Do not** apply the `/write` "close on a forward question" rule to the document ending.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-10-21 | Created: intro block + boundary H2 + verbatim document format for motions and speeches |
| 2026-10-21 | Added the corrected-speech exception (post 85) |
