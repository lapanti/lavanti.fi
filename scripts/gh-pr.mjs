#!/usr/bin/env node
// gh-pr — update a pull request's body or title over the GitHub REST API and
// read the result back. `gh pr edit` fails on this repo with a Projects-classic
// GraphQL deprecation error and leaves the PR unchanged while exiting quietly
// (.agents/rules/feedback_gh_pr_edit_graphql_broken.md; 29 such calls in two
// weeks of transcripts). This script PATCHes and then verifies.
//
//   node scripts/gh-pr.mjs body  <n> --file <markdown>
//   node scripts/gh-pr.mjs title <n> "<title>"
//
// Exit 0 = the read-back matches what was sent; 1 = it does not; 2 = usage/API.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

function ghExec(args, { input } = {}) {
  return execFileSync("gh", args, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

export function repoSlug({ gh = ghExec } = {}) {
  return gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
}

/**
 * updatePr(n, fields, { gh }) -> { ok, mismatches }
 * fields: { body?, title? }. PATCHes and reads back each field.
 */
export function updatePr(n, fields, { gh = ghExec, slug } = {}) {
  const repo = slug ?? repoSlug({ gh });
  const dir = mkdtempSync(join(tmpdir(), "gh-pr-"));
  const file = join(dir, "patch.json");
  writeFileSync(file, JSON.stringify(fields));
  gh(["api", "-X", "PATCH", `repos/${repo}/pulls/${n}`, "--input", file, "--jq", ".number"]);
  const back = JSON.parse(gh(["api", `repos/${repo}/pulls/${n}`, "--jq", "{body: .body, title: .title}"]));
  const mismatches = Object.keys(fields).filter((k) => (back[k] ?? "").replace(/\r\n/g, "\n").trim() !== String(fields[k]).replace(/\r\n/g, "\n").trim());
  return { ok: mismatches.length === 0, mismatches, back };
}

const USAGE = "usage: gh-pr.mjs body <n> --file <md> | gh-pr.mjs title <n> \"<title>\"";

export function run(argv = process.argv.slice(2), deps = {}) {
  const out = deps.out ?? console.log;
  const err = deps.err ?? console.error;
  const [cmd, n, ...rest] = argv;
  if (!["body", "title"].includes(cmd) || !/^\d+$/.test(n ?? "")) { err(USAGE); return 2; }
  let fields;
  if (cmd === "body") {
    const i = rest.indexOf("--file");
    if (i === -1 || !rest[i + 1]) { err(USAGE); return 2; }
    fields = { body: readFileSync(rest[i + 1], "utf8") };
  } else {
    if (!rest[0]) { err(USAGE); return 2; }
    fields = { title: rest[0] };
  }
  try {
    const r = updatePr(n, fields, { gh: deps.gh, slug: deps.slug });
    if (r.ok) { out(`gh-pr: PR #${n} ${cmd} updated and read back`); return 0; }
    err(`gh-pr: PR #${n} ${cmd} did NOT land — read-back differs (${r.mismatches.join(", ")})`);
    return 1;
  } catch (e) {
    err(`gh-pr: ${e.message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(run());
}
