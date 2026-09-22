#!/usr/bin/env bash
# Finnish writing-style checks for a single MDX file.
# Only runs on /fi/ locale paths.
# Usage: style-fi.sh FILE
# Exit 0 = all pass. Exit 1 = at least one error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/bash-helpers.sh
source "$SCRIPT_DIR/../lib/bash-helpers.sh"

file="$1"
failed=0

# Collection entries (posts and newsletters) are checked by path; static pages by layout.
is_post=0
if [[ "$file" =~ content/(posts|newsletters)/[0-9]+/fi\.mdx$ ]]; then
    is_post=1
fi

# Caller already limits to /fi/ paths, but guard anyway.
if [[ "$is_post" -eq 0 ]] && [[ ! "$file" =~ /fi/ ]]; then
    exit 0
fi

# Only run on blog posts.
if [[ "$is_post" -eq 0 ]] && ! grep -qP "PostLayout" "$file"; then
    exit 0
fi

# ── bureaucratic / hallintokieli phrases ─────────────────────────────────────
# These are stock bureaucratic Finnish phrases that clash with Lauri's direct
# personal style. Extend this list as new patterns are identified.
# Use grep -iF (case-insensitive fixed-string) for speed and simplicity.
JARGON_PATTERNS=(
    "on syytä huomata"
    "on tärkeää korostaa"
    "tulee ottaa huomioon"
    "toimenpiteisiin ryhtyminen"
    "asian käsittelyn yhteydessä"
    "mainittu seikka"
    "asianmukainen"
    "tarkoituksenmukaisella tavalla"
    "siten kuin"
    "edellä mainittu"
    "jäljempänä mainittu"
    "ao. asiassa"
)

for phrase in "${JARGON_PATTERNS[@]}"; do
    hits="$(fm_body "$file" | grep -niF "$phrase" || true)"
    if [[ -n "$hits" ]]; then
        error "$file" "hallintokieli phrase detected: '${phrase}' — rewrite in plain Finnish"
        echo "$hits" | while IFS= read -r line; do
            printf '  line %s\n' "$line" >&2
        done
        failed=1
    fi
done

exit "$failed"
