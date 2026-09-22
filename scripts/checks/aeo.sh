#!/usr/bin/env bash
# AEO bash checks for a single MDX file.
# Usage: aeo.sh FILE
# Exit 0 = all pass. Exit 1 = at least one error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/bash-helpers.sh
source "$SCRIPT_DIR/../lib/bash-helpers.sh"

file="$1"
failed=0

# A collection entry is src/content/{posts,newsletters}/{id}/{fi,sv,en}.mdx — meta.json
# lives alongside it and holds tags (used by the AI-pillar-post check below; newsletters
# carry none, so that rule is inert for them and only the one-question rule applies).
is_post=0
meta_file=""
if [[ "$file" =~ content/(posts|newsletters)/([0-9]+)/(fi|sv|en)\.mdx$ ]]; then
    is_post=1
    meta_file="$(dirname "$file")/meta.json"
fi

# ── at least one conversational heading ──────────────────────────────────────
# AI engines generate summaries 60% more often when a heading is a question.
# Covers EN, FI, and SV question-opening words, Finnish -ko/-kö verb forms,
# and any heading ending with a question mark.
#
# Headings aren't always literal `##`/`###` markdown — section components
# (Pillar, IntroPlate, WhoBio, ...) take their heading as a `heading="..."`
# prop and render it through a real <h2>/<h3>, so the same question-format
# patterns are also checked against that prop's quoted value.
question_words_en="How|What|Why|When|Who|Can|Is|Are|Does|Should|Which|Will|Has|Have"
question_words_fi="Miten|Mitä|Miksi|Milloin|Kuka|Voiko|Onko|Pitäisikö|Mikä|Mikäli|Kuinka|Ketkä|Missä"
question_words_sv="Hur|Vad|Varför|När|Vem|Kan|Är|Ska|Vilken|Vilket|Vilka|Bör|Har"

if ! fm_body "$file" | grep -qP "^#{2,3} (${question_words_en}|${question_words_fi}|${question_words_sv})\b" \
   && ! fm_body "$file" | grep -qP "^#{2,3} \S.*\?$" \
   && ! fm_body "$file" | grep -qP "^#{2,3} \w+ko\b" \
   && ! fm_body "$file" | grep -qP "^#{2,3} \w+kö\b" \
   && ! fm_body "$file" | grep -qP "heading=[\"'](${question_words_en}|${question_words_fi}|${question_words_sv})\b" \
   && ! fm_body "$file" | grep -qP "heading=[\"'][^\"']*\?[\"']" \
   && ! fm_body "$file" | grep -qP "heading=[\"']\w+ko\b" \
   && ! fm_body "$file" | grep -qP "heading=[\"']\w+kö\b"; then
    error "$file" "no conversational (question-format) H2/H3 heading found — at least one required for AEO"
    failed=1
fi

# ── no vague quantifiers ──────────────────────────────────────────────────────
# Vague quantifiers reduce AI citation likelihood. Check body only.
# Kept narrow: only words that are almost always replaceable with specific data.
# Common words like "some", "many", "several" are excluded — too many legitimate uses.
vague_en="affordable|quickly|recently|a lot of|various kinds|very quickly|quite quickly"
vague_fi="nopeasti|edullinen|edulliset|edullista|äskettäin|viime aikoina"
vague_sv="snabbt|prisvärd|prisvärda|prisvärt|nyligen"

hits="$(fm_body "$file" | grep -niwE "(${vague_en}|${vague_fi}|${vague_sv})" || true)"
if [[ -n "$hits" ]]; then
    error "$file" "vague quantifier(s) found — replace with specific data or figures:"
    echo "$hits" | while IFS= read -r line; do
        printf '  line %s\n' "$line" >&2
    done
    failed=1
fi

# ── AI pillar posts: ≥3 question-form H2s ────────────────────────────────────
# Posts tagged artificial-intelligence are pillar content; one question heading
# is not enough to surface in conversational AI queries.
if [[ "$is_post" -eq 1 ]]; then
    has_ai_tag="$(node "$SCRIPT_DIR/../lib/read-json-field.mjs" "$meta_file" tags | grep -qx "artificial-intelligence" && echo 1 || echo 0)"
else
    has_ai_tag="$(awk '/^---$/ { c++; if (c == 2) exit; next } c == 1' "$file" | grep -q "artificial-intelligence" && grep -qP "PostLayout" "$file" && echo 1 || echo 0)"
fi
if [[ "$has_ai_tag" -eq 1 ]]; then
    q_count=0
    while IFS= read -r line; do
        if echo "$line" | grep -qP "^#{2,3} (${question_words_en}|${question_words_fi}|${question_words_sv})\b" \
           || echo "$line" | grep -qP "^#{2,3} \S.*\?$" \
           || echo "$line" | grep -qP "^#{2,3} \w+ko\b" \
           || echo "$line" | grep -qP "^#{2,3} \w+kö\b" \
           || echo "$line" | grep -qP "heading=[\"'](${question_words_en}|${question_words_fi}|${question_words_sv})\b" \
           || echo "$line" | grep -qP "heading=[\"'][^\"']*\?[\"']" \
           || echo "$line" | grep -qP "heading=[\"']\w+ko\b" \
           || echo "$line" | grep -qP "heading=[\"']\w+kö\b"; then
            q_count=$((q_count + 1))
        fi
    done < <(fm_body "$file")
    if [[ "$q_count" -lt 3 ]]; then
        error "$file" "artificial-intelligence posts require ≥3 question-form H2/H3s; found $q_count"
        failed=1
    fi
fi

exit "$failed"
