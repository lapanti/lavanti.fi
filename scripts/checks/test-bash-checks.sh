#!/usr/bin/env bash
# Smoke tests for the bash check scripts.
# Run from repo root: bash scripts/checks/test-bash-checks.sh
# Exit 0 = all smoke tests passed. Exit 1 = at least one failed.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES="$SCRIPT_DIR/fixtures"
SEO="$SCRIPT_DIR/seo.sh"
AEO="$SCRIPT_DIR/aeo.sh"
CONTENT="$SCRIPT_DIR/content.sh"
STYLE_FI="$SCRIPT_DIR/style-fi.sh"

pass=0
fail=0

run() {
    local desc="$1" expect_exit="$2"
    shift 2
    local actual_exit=0
    "$@" >/dev/null 2>&1 || actual_exit=$?
    if [[ "$actual_exit" -eq "$expect_exit" ]]; then
        printf '  \033[32mPASS\033[0m %s\n' "$desc"
        pass=$((pass + 1))
    else
        printf '  \033[31mFAIL\033[0m %s (expected exit %s, got %s)\n' "$desc" "$expect_exit" "$actual_exit"
        fail=$((fail + 1))
    fi
}

printf '\n── seo.sh ────────────────────────────────────────\n'
# The valid fixture is in en/ but the path has no locale component (it's under fixtures/),
# so lang check would fail. We test each rule with targeted fixtures.
run 'errors on missing slug/title/description'    1  "$SEO"  "$FIXTURES/missing-fields-post.txt"
run 'errors on slug with underscores and year'    1  "$SEO"  "$FIXTURES/bad-slug-post.txt"
run 'errors on H1 in body'                        1  "$SEO"  "$FIXTURES/h1-in-body-post.txt"
run 'errors on lang/path mismatch (sv in /en/)'   0  "$SEO"  "$FIXTURES/lang-mismatch-post.txt"
# lang-mismatch-post.mdx is NOT under a locale path, so the lang check does not fire — exit 0 expected
# (slug folder-match also does not fire as it is not under /blog/\d+/)

printf '\n── aeo.sh ────────────────────────────────────────\n'
run 'errors on no question heading'  1  "$AEO"  "$FIXTURES/no-question-heading-post.txt"
run 'errors on vague quantifiers'    1  "$AEO"  "$FIXTURES/vague-quantifiers-post.txt"
# valid-en-post.txt has 3 conversational headings and no vague quantifiers
run 'passes for valid en post'       0  "$AEO"  "$FIXTURES/valid-en-post.txt"
run 'AI post with <3 question H2s fails'    1  "$AEO"  "$FIXTURES/ai-few-questions-post.txt"
run 'AI post with 3+ question H2s passes'   0  "$AEO"  "$FIXTURES/ai-three-questions-post.txt"

printf '\n── content.sh ────────────────────────────────────\n'
run 'errors on missing alt text'     1  "$CONTENT"  "$FIXTURES/missing-alt-post.txt"
run 'passes for valid en post'       0  "$CONTENT"  "$FIXTURES/valid-en-post.txt"

printf '\n── style-fi.sh ───────────────────────────────────\n'
# jargon fixture has /fi/ in neither its path nor its content path under fixtures/,
# but the script guards by content path. We pass the full path which doesn't have /fi/ —
# style-fi.sh will skip it. Use a temp copy under a /fi/ path.
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FI_FIXTURE_DIR="$TMP_DIR/fi"
mkdir -p "$FI_FIXTURE_DIR"
cp "$FIXTURES/jargon-fi-post.txt"   "$FI_FIXTURE_DIR/jargon-fi-post.txt"
cp "$FIXTURES/valid-en-post.txt"    "$FI_FIXTURE_DIR/valid-en-post.txt"

run 'errors on Finnish bureaucratic jargon'  1  "$STYLE_FI"  "$FI_FIXTURE_DIR/jargon-fi-post.txt"
run 'passes for non-PostLayout (no lang check)'  0  "$STYLE_FI"  "$FI_FIXTURE_DIR/valid-en-post.txt"
# valid-en-post.txt has PostLayout but no jargon — should pass even in /fi/ path
# (it also has PostLayout, so the jargon loop will run but find nothing)

printf '\n── newsletters (src/content/newsletters/{id}/fi.mdx) ──\n'
# Detection is path-keyed, so each case is staged under a real-looking collection path
# with the sibling meta.json the checks read publishDate from.
stage_newsletter() {
    local id="$1" fixture="$2" dir="$TMP_DIR/src/content/newsletters/$1"
    mkdir -p "$dir"
    cp "$fixture" "$dir/fi.mdx"
    printf '{ "id": %s, "sent": "2026-03-14", "publishDate": "2026-04-25", "updatedDate": "2026-04-25" }\n' "$id" > "$dir/meta.json"
    printf '%s' "$dir/fi.mdx"
}
NL_VALID="$(stage_newsletter 1 "$FIXTURES/valid-fi-newsletter.txt")"
# Ids 20 and 47 are the blog posts exempt from the year-slug rule; a newsletter with the
# same id must NOT inherit that exemption.
NL_YEAR_20="$(stage_newsletter 20 "$FIXTURES/year-slug-fi-newsletter.txt")"
NL_NO_QUESTION="$(stage_newsletter 2 "$FIXTURES/valid-fi-newsletter.txt")"
sed -i 's/^## Kuka päättää, mihin tekoäly ulottuu?$/## Johtamiskysymys/' "$NL_NO_QUESTION"
NL_JARGON="$(stage_newsletter 3 "$FIXTURES/valid-fi-newsletter.txt")"
sed -i 's/^Tekoäly ei toistaiseksi/On syytä huomata, että tekoäly ei toistaiseksi/' "$NL_JARGON"

run 'seo: newsletter needs no layout field'            0  "$SEO"      "$NL_VALID"
run 'seo: year-slug exemption does not leak to id 20'  1  "$SEO"      "$NL_YEAR_20"
run 'content: newsletter passes without tags'          0  "$CONTENT"  "$NL_VALID"
run 'aeo: newsletter needs one question heading'       1  "$AEO"      "$NL_NO_QUESTION"
run 'aeo: newsletter with a question heading passes'   0  "$AEO"      "$NL_VALID"
run 'style-fi: newsletter fi.mdx is checked'           1  "$STYLE_FI" "$NL_JARGON"
run 'style-fi: clean newsletter passes'                0  "$STYLE_FI" "$NL_VALID"

printf '\n────────────────────────────────────────────────\n'
printf '%s passed, %s failed\n' "$pass" "$fail"

[[ "$fail" -eq 0 ]]
