---
name: aeo-check
description: Audit AEO (Answer Engine Optimization) quality of an MDX page or blog post. Checks content structure, passage extractability, answer-first formatting, conversational headings, E-E-A-T signals, internal citation practices, freshness metadata, FAQ opportunities, and multilingual hreflang signals — all optimised for visibility in ChatGPT, Perplexity, Google AI Overviews, Gemini, and other AI answer engines.
argument-hint: [file-path or glob pattern]
---

Perform a comprehensive AEO audit on the MDX file(s) at `$ARGUMENTS`.
If no argument is given, check the file most recently mentioned or opened in the conversation.
If `$ARGUMENTS` is a directory or glob, use Glob to find all matching `.mdx` files and audit each one.

AEO (Answer Engine Optimization) ensures content is extracted and cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Gemini, etc.), not just ranked in traditional search. It complements the /seo-check skill — run both.

> **Pre-commit automation note:** The following checks from this skill are now
> enforced automatically at pre-commit via `scripts/mdx-validate.sh`.
> Focus your skill audit on **judgment-call checks**.
>
> *Automated:*
> - Conversational heading: at least one H2/H3 starts with a question word
> - Vague quantifiers: "affordable", "quickly", "recently" flagged (targeted list)
> - Passage length ≤150 words (see seo-check automation)
> - Freshness metadata: updatedDate required if >90 days old
> - AI-tagged posts: ≥3 question-form H2/H3s required (elevated pillar rule)
>
> *Judgment-call checks — still run these:*
> - Answer-first structure (opening 100 words)
> - Passage self-containment and cross-reference avoidance
> - Data specificity and source attribution
> - E-E-A-T signals (author credentials, expertise)
> - FAQ structure opportunities
> - List vs. prose balance
> - Conversational query coverage and follow-up anticipation
> - Multilingual quality consistency

---

## Data to collect before running checks

1. **Read the target MDX file(s).**
2. **Identify layout type** from the `layout` frontmatter field:
   - `PostLayout.astro` → blog post
   - `FrontPageLayout.astro` → home page
   - `PageLayout.astro` → regular page (about, contact, blog index, etc.)
3. **Detect the locale** from the file path (`/fi/`, `/en/`, `/sv/`).
4. **Scan the MDX body** (everything below the second `---` of the frontmatter).

---

## Checks

Run every applicable check. Mark each as **Error**, **Warning**, **Pass**, or **Info**.

---

### 1. Answer-first structure

AI engines extract the first passage of each section as the candidate answer. Content must lead with the answer, not build up to it.

| Check | Severity |
|---|---|
| The body opens with a clear, direct statement or answer within the first 100 words — not context-setting, hedging, or historical background | Warning if absent |
| Each major section (under an H2) opens with a 1–3 sentence direct answer before supporting detail | Warning if sections consistently bury the point |
| Body contains at least one passage of 40–60 words that stands alone as a complete answer to a likely query | Warning if absent — this is the optimal AI extraction window |
| No passage longer than 150 words without a heading break — long unbroken prose scores poorly for passage extraction | Warning |

---

### 2. Conversational headings

AI summary triggers increase significantly when headings are phrased as questions. 53% of 10+ word queries produce AI summaries; question-format searches generate them 60% of the time.

| Check | Severity |
|---|---|
| At least one H2 or H3 is phrased as a question (starts with How, What, Why, When, Who, Can, Is, Are, Does, Should, Which) | Warning if none present on a blog post — suggests content is not optimised for conversational queries |
| Headings are descriptive and specific — not vague labels like "Introduction", "More information", "Background" | Warning for each vague heading found |
| Headings avoid click-bait phrasing that obscures the topic (AI engines need to match the heading to a query) | Warning |

---

### 3. Passage self-containment

AI engines extract individual passages, not whole pages. Each passage must make sense without surrounding context.

| Check | Severity |
|---|---|
| Check 3 random passages: does each define any acronyms or jargon it uses, without relying on a definition given earlier in the text? | Warning if a passage would be incomprehensible in isolation |
| "This", "it", "they", "the above", "as mentioned" used to refer to something defined only in a different section | Warning — breaks passage self-containment |
| Each section covers one main idea | Warning if a section mixes two distinct topics under one heading |

---

### 4. Data specificity

Specific numbers, costs, timeframes, and measurements dramatically increase citation likelihood. Vague quantifiers are filtered out.

| Check | Severity |
|---|---|
| Presence of at least one specific data point (number, percentage, cost, timeframe, measurement) in posts making factual claims | Warning if absent — vague claims ("many", "affordable", "quickly") reduce Certainty Score |
| Vague quantifiers used where a specific figure could be given: "many", "some", "a lot", "various", "several", "affordable", "quickly", "recently" | Warning for each avoidable instance |
| Data points include their source context: "according to X" or "as of YYYY" | Warning if statistics appear without attribution |

---

### 5. Source attribution and E-E-A-T signals

Pages with author credentials see +40% citation boost. Content citing named sources is 2–3x more likely to be cited by AI engines.

| Check | Severity |
|---|---|
| Any statistics, studies, or factual claims cite a named source ("According to Gartner's 2025 forecast…" not "Studies show…") | Warning for each uncited statistic |
| External links to authoritative sources present (academic, government, established media, official reports) | Warning if absent on factual/data-heavy posts |
| Author credentials are visible in the post (byline, bio, or frontmatter `author` field if present) — licenses, degrees, professional roles | Warning if absent on a blog post — critical E-E-A-T signal |
| Content on specialist topics (digital security, legal, financial, medical) demonstrates subject-matter expertise explicitly | Error if specialist claims are made with no expertise signals |

---

### 6. Freshness metadata

Pages not updated in 3+ months see citation drop rates of 3x. AI engines weight `dateModified` heavily.

| Check | Severity |
|---|---|
| `publishDate` or `createdAt` present | Error if absent on blog post (already caught by seo-check, flagged here for AEO significance) |
| `updatedDate` or `updatedAt` present on posts older than 90 days from today (2026-03-06) | Warning if absent — `dateModified` won't be emitted; AI engines will treat content as stale |
| If content references statistics, studies, or current events: check whether dates cited are within the last 18 months | Warning if referencing data older than 2024 without noting it |
| Body contains a temporal anchor ("As of [year]", "Updated [month year]", "In [year]") on time-sensitive claims | Warning if absent on posts making factual claims that may date |

---

### 7. FAQ and structured answer opportunities

FAQPage schema has the highest citation rates in AI-generated answers. Even without schema, FAQ-formatted sections improve extraction.

| Check | Severity |
|---|---|
| Post contains 2+ sections that could be reformatted as explicit Q&A pairs (question heading + direct answer paragraph) | Info — flag as an opportunity to add FAQ structure |
| If the page is already structured as a FAQ (multiple question headings with answers), note that FAQPage JSON-LD schema should be added at the layout level | Info — this project generates schema in Head.astro; flag for the developer to add FAQPage support |
| Post answers a "What is X?", "How to X", or "Why X?" — core patterns that trigger AI summaries most reliably | Pass if present; Info if absent |
| Run `npm run suggest:faq -- <post\|newsletter> <id>` (skips with a notice without a Jev key): list the "candidates" rows as FAQ questions to add, "doubtful" rows as entries to rewrite, and the "faq entries" count against the two-entry `FAQPage` threshold. Answers are the author's. Spec `.agents/specs/jev/faq.md` | Info — opportunities |

---

### 8. List vs. prose balance

40–61% of AI Overviews use lists. Numbered lists rank 28% higher in featured snippets than plain paragraphs for instructional content.

| Check | Severity |
|---|---|
| Instructional content (steps, procedures, requirements, comparisons) uses lists rather than prose | Warning if instructional content is buried in long paragraphs |
| Lists are not over-used: narrative, contextual, or explanatory content should remain as prose | Info if the entire post is lists with no prose — signals thin content |
| No list item is longer than 2 sentences — longer items should be sub-sections with their own headings | Warning |

---

### 9. Conversational query coverage

Long-tail conversational queries (8+ words) produce AI summaries 53% of the time. Content should anticipate these.

| Check | Severity |
|---|---|
| Post topic maps to at least one common conversational query pattern: "How to…", "What is…", "Why does…", "Best way to…", "Can you…" | Warning if post topic doesn't naturally fit any of these — may indicate abstract content that won't surface in AI answers |
| Post's `title` or `description` includes or implies a conversational query | Info if neither does — the title is the primary query-match signal |
| Post addresses at least one likely follow-up question beyond its main topic | Info if absent — depth signals topical authority |

---

### 10. Multilingual AEO consistency

For this project's three locales (fi, sv, en): AI engines traverse hreflang to serve the right version. Weak translations degrade signal across all versions.

| Check | Severity |
|---|---|
| `lang` matches the file path locale (already caught by seo-check, noted here for AEO significance: mismatched hreflang confuses AI about authoritative version) | Error if mismatch |
| If the post exists in all three locales (`fi/`, `sv/`, `en/`): content quality should be consistent — not machine-translated | Info — flag if the post appears to be a direct translation without cultural adaptation |
| Finnish-language posts: check that any Finnish-specific context (local references, Finnish statistics, Finnish institutions) is present for Finnish queries | Info if Finnish post reads as if translated from another language with no local anchoring |

---

## Output format

Produce a structured report for each file:

```
## AEO Report: src/pages/en/blog/51/digital-independence-is-a-necessity/index.mdx

### Errors (1)
- [E-E-A-T] Specialist claims about digital security made with no author expertise signals

### Warnings (4)
- [Answer-first] Opening 100 words provide context but no direct answer — lead with the core claim
- [Data specificity] "Many countries" used 3 times — replace with specific figures where available
- [Freshness] Post is from 2025-01-10 with no updatedDate — over 90 days old; add updatedDate or refresh content
- [Source attribution] Statistic "62% of meta descriptions are overridden" has no named source

### Opportunities (2)
- [FAQ structure] 3 sections could be reformatted as Q&A pairs for FAQPage schema eligibility
- [Conversational headings] None of the 4 headings are question-format — consider converting at least 1-2

### Passed (6)
- answer-first structure ✓ (direct answer in first 50 words)
- passage length ✓ (no unbroken prose over 150 words)
- data points present ✓ (3 specific statistics)
- lists used for instructional content ✓
- lang matches file path ✓ (en)
- publishDate present ✓ (2025-01-10)

---
Score: 6/13 checks passed (1 error, 4 warnings, 2 opportunities)
```

Use **Opportunities** (not warnings) for structural improvements like FAQ reformatting and heading rewrites — these are enhancements, not problems.

If all checks pass: print "All AEO checks passed." followed by the pass list.

**Do NOT auto-fix any issues** unless the user explicitly asks you to fix them after seeing the report.
