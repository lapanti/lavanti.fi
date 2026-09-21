# Architecture Decision Records

Empty by design so far. `/review-implementation` reads this directory and its checklist asks
whether the code is consistent with the ADRs here; with no records, that check passes vacuously.
That is the correct outcome, not a missing step — this repo has recorded its decisions in
`AGENTS.md` and in `.agents/specs/` instead.

Add a record here when a decision is architectural, costly to reverse, and not already implied by
a spec: the framework or hosting choice, the URL and redirect scheme, the content model, the
i18n strategy. Use `.asdlc/templates/adr.md.template`, name the file `YYYY-MM-DD-<kebab>.md`, and
state the context, the decision and the consequences the next person will have to live with.

A decision that only affects one page or one component belongs in the spec for that work, not here.
