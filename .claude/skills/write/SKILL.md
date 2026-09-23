---
name: write
description: >-
  Apply Lauri Lavanti's blog writing voice when drafting or editing
  Finnish-language blog posts for lavanti.fi. Trigger when user says
  "kirjoita", "muokkaa", "write a blog post", or any Finnish-language
  writing task for the site. NOT for social media content.
argument-hint: [topic or file-path]
---

Terse. Drop filler. Fragments OK.

## Load context

Read `/home/lapanti/code/lavanti-2027/docs/positioning/core-message.md` before writing. Campaign spine — every post must be consistent with it.

If `$ARGUMENTS` is a file path: read it, edit/improve in place.
If `$ARGUMENTS` is a topic: draft new post.

**State primary target segment (A/C/D) before writing.**

---

## Voice

Identity: "Rakentaja, ei kommentaattori" — Aalto DI + lead developer. Credibility from systems built, not commentary.

Five narrative beats — every post advances at least one:
1. **Jatkumo** — anchor in Finnish tech history; expertise as continuity
2. **Murros** — name the structural mechanism; cite practitioners by name
3. **Tarve** — reframe surface objections as structural questions
4. **Ratkaisu** — lived experience as evidence ("Olen työssäni rakentanut…")
5. **Arvopohja** — principle as constraint, not slogan ("oikeusvaltion minimi")

Mechanics:
- Open with 1st person prose: name the decision/situation, date, parties, and your stance in one or two flowing sentences. Not isolated one-liners (reads like social media). Not scene-setting fragments (date/location as standalone). Example: "Kirkkonummen kunnanvaltuusto päätti 11.5.2026 liittymisestä Västra-yhteistyöhön Siuntion, Inkoon, Raaseporin ja Hangon kanssa. Tein esityksen sopimuksen hylkäämisestä, mutta hävisimme äänestyksen."
- Declarative: "On", "vaatii", "ei riitä" — not "ehkä voitaisiin"
- Source practitioners, not parties (Siilasmaa, Suleyman, Martela — name + role)
- Reframe, don't attack — acknowledge concern, invert frame
- Concrete → abstract → concrete
- Close on forward question or principle, not summary
- Kirjakieli only — no puhekieli, no English jargon

Hard don'ts: attack individuals/parties by name; AI utopia/dystopia ("mullistaa", "tuhoaa"); hedged claims; party clichés ("vihreät arvot", "oikeisto/vasemmisto").

---

## Blog post arc (300–800 words)

1. Kontekstualisoiva avaus — situation before stance
2. Myönnytys/vastaväite — take opposing view, then turn it
3. Oma kanta — 1st person, active, no passive
4. Konkretisointi — abstract → number or human consequence immediately
5. Nostolause — one sentence anchoring previous, not teasing next
6. Avoin lopetus — rhetorical question or challenge, not moralising

---

## Format rules

- En-dashes (`–`): max two per piece; em-dashes (`—`) avoid
- No structural colons as separators (EU:ssa OK)
- Finnish only

## Tag requirement

Must include at least one pillar tag:
- `artificial-intelligence`
- `digital-independence`
- `economy`
- `culture-and-education`
- `freedom`

## Link suggestions

Every post needs 3–10 internal links (`scripts/checks/content.sh`). Once the draft has an id and body on disk, run:

```
npm run suggest:links -- post <id>
```

Jev proposes, per paragraph, the post or newsletter issue that substantiates a claim there (★ = strong). Decide on every row: accept, reject, or place the target in a better paragraph. Write the anchor text yourself — a meaningful phrase, never "aiemmassa kirjoituksessa". Rows under "doubtful" are existing links Jev did not connect to the paragraph; re-read them. Advisory only: the table is a starting point, not a rule. Spec: `.agents/specs/jev/links.md`.
