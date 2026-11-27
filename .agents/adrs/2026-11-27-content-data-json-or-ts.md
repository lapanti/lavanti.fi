# ADR-001: JSON for appended records, TypeScript for everything else in `src/content/`

> **Pattern**: [The ADR](https://asdlc.io/patterns/the-adr) — Immutable record of an architectural decision.
> **Status**: `Accepted`
> **Date**: 2026-11-27
> **Deciders**: Lauri Lavanti

---

## Context

`src/content/` holds the site's structured data in two formats. Most modules are TypeScript (`events.ts`,
`nav.ts`, `fi-cv.ts`); a few keep their data in JSON behind a TypeScript wrapper (`recommendations.json`,
`campaignFinanceFigures.json`). The choice was made per module, with no rule, so each new data list
reopens it. The election campaign adds several lists that grow by one entry at a time — events,
petitions and candidate pledges — some of which a script may append to.

---

## Decision

We keep a list in `src/content/<name>.json` behind a `src/content/<name>.ts` wrapper when entries are
appended over time (by hand or by a script), every entry has the same shape, and the data carries no
logic. Every other module stays TypeScript.

The wrapper owns the types and is the only import site; components and pages never import the JSON
directly. A `<name>.spec.ts` asserts what the type system cannot check on JSON: literal-union values,
required locales, unique ids and valid dates.

---

## Rationale

- Adding an entry means copying the previous one. No imports, types or code to edit.
- A script can append to JSON safely; rewriting TypeScript source from a script is fragile
  (`npm run recommendations -- approve` already relies on this).
- The diff of a content change shows data only.

---

## Alternatives Considered

| Alternative | Reason rejected |
|-------------|-----------------|
| Everything in TypeScript | Hand-appended lists stay code; scripted appends need a TS rewriter. |
| Everything in JSON | Modules with functions, computed values or asset imports (`tags.ts`, `footer.ts`, `campaignFinance.ts`) cannot move; moving static ones like the CVs is churn with no reader- or editor-facing gain. |
| Astro content collection with `file()` loader and a zod schema | Validates at build time, but the repo has no `file()` collections yet and the wrapper plus spec test already fails the pre-commit hook on a bad entry. Revisit if a list needs `getCollection` querying. |

---

## Consequences

**Positive:**
- One rule decides the format of the next list.
- Pre-commit catches bad entries through the spec test.

**Negative / Trade-offs:**
- JSON infers `string` for literal unions, so the wrapper casts and the spec test must check those
  values. The editor does not flag a typo while typing.
- JSON allows no comments; field documentation lives on the interface in the wrapper.

---

## Compliance

- New appended-record lists: `<name>.json` + `<name>.ts` wrapper + `<name>.spec.ts`.
- Lists in this category today: `recommendations`, `campaignFinanceFigures`, `pledges`, `events`
  (`events.ts` migrates in its own PR).
- Static or logic-bearing modules (`nav`, `footer`, `tags`, `person`, `social`, CVs, post datasets) stay
  TypeScript; do not migrate them for uniformity.
