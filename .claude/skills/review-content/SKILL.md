---
name: review-content
description: >-
  Unified content review: SEO + AEO judgment-call checks + writing style +
  voter persona alignment in one pass. Trigger when user says "review this
  post", "check this before committing", "tarkista tämä", or any request to
  audit an MDX blog file. Runs only judgment-call checks — automated checks
  (frontmatter, slug, headings) are enforced by pre-commit hooks.
argument-hint: <file-path>
---

Terse. Drop filler. Fragments OK.

Read `$ARGUMENTS` (required — stop and ask if missing).

Run these checks in order. Single combined report at the end.

---

## 1. SEO judgment calls

From `seo-check` skill — judgment section only (skip anything enforced by pre-commit):
- Title and description: unique? CTR-optimised? Primary keyword near front?
- OG image present and rich? JSON-LD `dateModified` emitted?
- E-E-A-T signals: author credentials visible?
- External links: authoritative sources? Any broken or low-quality?
- Body word count: thin (<300) or bloated (>4000)?

## 2. AEO judgment calls

From `aeo-check` skill — judgment section only:
- Answer-first: does opening 100 words lead with a direct answer or claim?
- Passage self-containment: 3 random passages — comprehensible in isolation?
- Data specificity: at least one specific number/stat/date? Sources named?
- FAQ opportunities: 2+ sections rewritable as Q&A pairs?
- List vs. prose: instructional content in lists? No over-listing of narrative?
- Conversational query coverage: maps to "How to…", "What is…", "Why…"?
- Multilingual consistency: `lang` matches path? Content not machine-translated?

## 3. Style check

Read `/home/lapanti/code/lavanti-2027/docs/positioning/tone-of-voice.md` for reference.

Flag:
- Hallintokieli or bureaucratic phrases
- Passive voice in opinion statements
- Moralising tone ("meidän täytyy", "on velvollisuus")
- AI utopia/dystopia language ("mullistaa", "tuhoaa kaiken")
- Party clichés ("vihreät arvot", ideological labels)
- Hedging that dilutes claims ("ehkä voitaisiin")
- Off-voice opening (abstraction instead of concrete scene)
- En-dash overuse (>2 per piece) or em-dashes present

## 4. Persona check

- Who is this content actually speaking to? State explicitly.
- Map to segment (A/C/D/E) — is that the right primary target?
- Any segment blockers triggered? (see write skill for blocker lists)
- Any Tier 3 assumptions (IT/privacy as a voting issue stated as fact)?
- Does post connect to AI/digitaalinen itsenäisyys? If not, does it include one of the pillar tags (`artificial-intelligence`, `digital-independence`, `economy`, `culture-and-education`, `freedom`)? Flag if neither.

## 5. Link suggestions

Run `npm run suggest:links -- <post|newsletter> <id>` for the file's document (skips with a notice when no Jev key is set). Go through every row: report ★ rows the post does not act on as suggestions, weaker rows as options worth a look, every "doubtful" row as a question, and the "links now" line against the 3–10 budget. Do not propose anchor text. Advisory only. Spec: `.agents/specs/jev/links.md`.

---

## Output format

```
## Content Review: [file path]

### Errors
- [SEO/AEO/Style/Persona] description

### Warnings
- [SEO/AEO/Style/Persona] description

### Style notes
- description

### Persona notes
- Primary segment: X — [on-target / off-target / unclear]
- description

### Passed
- check ✓

---
Score: X/Y checks passed (E errors, W warnings)
```

Do NOT auto-fix. Report only unless user explicitly asks for fixes.
