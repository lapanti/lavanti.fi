# AGENTS.md

> **ASDLC**: This file is the Agent Constitution for this project.
> It follows the [AGENTS.md Specification](https://asdlc.io/practices/agents-md-spec).
> Keep it minimal and precise — unnecessary content actively harms agent performance.
> If a constraint can be enforced by a linter or tool, it must NOT live here.

---

## Mission

Personal homepage of Lauri Lavanti (https://lavanti.fi). Built with Astro + TypeScript + MDX — all content is local MDX files, no CMS or external content API.
Core constraint: all-content-local; hosted on Cloudflare Pages (static output only, no SSR).

---

## Toolchain

| Intent | Command | Notes |
|--------|---------|-------|
| **Build** | `npm run build` | |
| **Dev server** | `npm run dev` | |
| **Preview** | `npm run preview` | Preview production build locally |
| **Test (unit)** | `npm run test` | Vitest |
| **Test (E2E)** | `npm run test:e2e` | Playwright — builds + previews automatically |
| **Lint** | `npm run lint` | ESLint + Prettier |
| **Type check** | `npm run check` | Astro TypeScript check |
| **Edit a PR body/title** | `node scripts/gh-pr.mjs body <n> --file <md>` | `gh pr edit` fails on the Projects-classic GraphQL deprecation and leaves the PR unchanged while exiting quietly. This PATCHes over the REST API and reads the result back; exit 1 means the read-back did not match. |
| **Wait for CI** | `gh pr checks <n> --watch` | Never `sleep N; gh pr checks`: polling costs a turn per check. |

### Agent tooling

A `PreToolUse` guard hook runs at user scope (`~/.claude/hooks/tool-guard/`) in every repo on this
machine. It denies the tool calls that two weeks of transcripts showed to be wasted or broken, and
names the replacement in the denial. The ones that bite here: reading a single file with
`cat`/`sed -n`/`head`/`tail` instead of `Read`; writing repo files from `python3 -`, `node -e`,
`sed -i` or `cat > file <<EOF`, none of which the harness file tracker can see; `gh pr edit`; a
`pkill -f` pattern that matches its own command line. `grep` is fine here — the main thread has no
`Grep` tool on Linux, since the harness embeds `ugrep` in Bash. One-off escape: append
`# guard:allow <rule-id>` to the command; every use is logged.

---

## Git Workflow

All agents and workflows shall follow these rules for every change:

1. **Feature branch** — All changes shall be made on a feature branch created from an up-to-date `main`. Never commit directly to `main`.
2. **Micro-commits** — Each commit shall represent one logical, independently reversible change. Follow [Conventional Commits](https://www.conventionalcommits.org/).
3. **Push immediately** — Every commit shall be pushed to remote immediately after committing.
4. **Co-authored-by trailer** — Every commit made by an AI agent shall include a `Co-authored-by` trailer identifying the agent (e.g. `Co-authored-by: Claude Sonnet <claude-sonnet@anthropic.com>`).
5. **Draft PR on first commit** — After the first commit on a new feature branch is pushed, open a draft PR using `gh pr create --draft`. Suggest the PR title and body to the user for approval before creating.
6. **AI usage note in PR** — Every PR containing AI-generated code shall include the following note as the **first line** of the PR description: `> This PR containes AI-generated code. The author has reviewed and is responsible for all AI-generated content.`
7. **Mark ready after human review** — After all work on a feature branch is complete and the human author has reviewed all AI-generated changes, mark the draft PR as ready for review using `gh pr ready`. Human review is a prerequisite — never mark a PR ready immediately after the final commit without it.

---

## Judgment Boundaries

### NEVER — Hard limits (no exceptions)
- Never commit secrets, tokens, or `.env` files
- Never add external dependencies without explicit discussion
- Never use `_` to ignore errors
- Never guess on ambiguous specs — stop and ask

### ASK — Human-in-the-loop triggers
- Ask before adding external dependencies
- Ask before issue comments or any other shared-state action not covered by the issue workflow below

### PREFER — Architectural defaults
- Prefer local MDX content over external data sources
- Prefer static output; never introduce SSR without discussion

---

## Response Tone

Chat replies and Claude-authored internal docs (PR bodies, commit messages, specs, ADRs): fact first, technical audience, concrete over abstract, short. Middle register — Google developer documentation style. Never applies to site content, which follows `.agents/specs/` and the content skills. Enforced via `.claude/output-styles/technical-concise.md` (set as `outputStyle` in `.claude/settings.json`).

---

## Personas

Invoke on-demand (do not load all at once):

| Persona | File | Skill | Purpose |
|---------|------|-------|---------|
| `@Builder` | `.asdlc/personas/builder.md` | `/implement` | Feature implementation |
| `@Critic` | `.asdlc/personas/critic.md` | `/review-spec`, `/review-implementation` | Adversarial review |
| `@Architect` | `.asdlc/personas/architect.md` | `/create-issue` | Design & planning |
| `@SpecWriter` | `.asdlc/personas/spec-writer.md` | `/write-spec` | Spec authoring |

---

## Context Map

```yaml
project:
  # Living specs — permanent source of truth per feature:
  specs: .agents/specs/
  # Architecture decisions:
  adrs: .agents/adrs/
  # ASDLC base scaffolding (templates, personas, workflows):
  asdlc_base: .asdlc/
  # Global architecture reference:
  architecture: ARCHITECTURE.md

src:
  components: src/components/   # Astro UI components
  layouts: src/layouts/         # Page layouts (BaseLayout, PostLayout, PageLayout, FrontPageLayout)
  lib: src/lib/                 # Build-time helpers (posts.ts, etc.)
  content: src/content/         # Tags, nav, and other content definitions
  pages: src/pages/             # MDX content and Astro route files (locale-structured)

skills:
  # Content work:
  write: /write                             # Write/edit Finnish blog posts
  review_content: /review-content           # SEO+AEO+style+persona review before commit
  # Feature work (in order):
  create_issue: /create-issue               # Plan PBI as GitHub issue
  write_spec: /write-spec                   # Author Spec document
  review_spec: /review-spec                 # Critic review of Spec vs issue
  implement: /implement                     # Build against Spec
  review_implementation: /review-implementation  # Adversarial review before PR ready
```

---

<!-- PROJECT-SPECIFIC SECTIONS -->

## Issue workflow

GitHub issues serve as PBIs. Preferred path uses skills — invoke manually or let each skill suggest the next step:

```
/create-issue → /write-spec → /review-spec → /implement → /review-implementation
```

Manual steps:

1. **Assign the issue** — `gh issue edit {number} --add-assignee @me`
2. **Create a branch** — `git checkout -b type/{short-kebab-description}` (no issue number prefix; include type e.g. `fix` or `feat`)
3. **First commit** — after the first commit on the branch:
   - Commit with conventional format: `type(scope): description` — the pre-commit hook runs lint, content validation, and related unit tests automatically
   - Push — `git push -u origin HEAD`
   - Open a **draft PR** — `gh pr create --draft` referencing the issue (`Closes #N`)
4. **Subsequent commits** — for every further commit:
   - Commit with conventional format: `type(scope): description`
   - Push — `git push`
5. **Finalise** — after the last commit and push:
   - Run `/review-implementation {number}` — adversarial review before marking ready
   - **Always** mark PR ready: `gh pr ready` — do this even if you think you may have already done it
   - Update PR description if needed: `gh pr edit`
   - Wait for the PR checks to complete in CI; if the e2e check fails, inspect the Playwright report, identify what broke, and fix it in a follow-up commit
6. **Sign all commits with GPG** — if the key is locked, ask the user to unlock it before committing

---

## Content Freshness Policy

Posts are considered stale under two rules: **Case A** — `publishDate` is more than 90 days ago and the post has no `updatedDate` (this is also a hard CI error enforced by `scripts/checks/mdx-deep.ts`); **Case B** — `updatedDate` is more than 180 days ago. Run `npm run check:freshness` to audit locally. A weekly GitHub Actions workflow (`freshness.yml`) runs the same audit and opens or updates a single tracking issue ("Freshness audit: stale posts") listing posts that need a refresh.

Separately, **changing a page or post requires bumping its `updatedDate`** — the field feeds schema.org `dateModified` and the sitemap `lastmod`, so a stale value misreports when the content was last revised. `scripts/checks/updated-date.ts` enforces this from the `commit-msg` hook and again in CI against the PR's merge base. The unit is the page, or the whole post directory (the fi/sv/en siblings share one `meta.json`). For an edit that changes nothing a reader or crawler would notice, put `[skip-updated-date]` in the commit message. Run `npm run check:updated-date` to check staged changes by hand.

---

## Scheduled Publishing

To publish a post on a future date, merge it to `main` normally with `publishDate` (and `updatedDate` — schema requires it) set to the target date. Behavior:

- **Builds exclude future-dated posts** (routes, RSS, sitemap, `llms.txt`, OG cards, `_redirects`) except under `npm run dev`, where they stay visible for preview. The post's content is visible in the public repo before publish — this is accepted; do not schedule content that must stay non-public.
- **Nightly automation** (`scheduled-publish.yml`, 22:00 UTC = Helsinki midnight) diffs due posts against the live sitemap (self-healing; `npm run check:publish-due` runs the same check locally). When a post is due it regenerates snapshot baselines, commits them API-signed to `chore/scheduled-publish-{date}`, and opens an **auto-merge PR** — merging it is the production deploy.
- **Exemption to Git Workflow rule 7**: these automated baseline PRs merge without human review. They contain only mechanically regenerated goldens; the post content itself was human-reviewed in its own PR.
