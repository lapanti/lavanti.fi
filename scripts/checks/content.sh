#!/usr/bin/env bash
# Per-file content quality checks: lengths, heading hierarchy, alt text,
# internal link count, and tag validity.
# Usage: content.sh FILE
# Exit 0 = all pass. Exit 1 = at least one error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/bash-helpers.sh
source "$SCRIPT_DIR/../lib/bash-helpers.sh"

file="$1"
failed=0

# A collection entry is src/content/{posts,newsletters}/{id}/{fi,sv,en}.mdx — meta.json
# lives alongside it and holds heroImage/tags/id (alt/pageTitle/description stay in this
# file). Newsletters follow the post rules except that they carry no tags, so the tag
# validity and pillar-tag blocks are skipped for them.
is_post=0
is_newsletter=0
meta_file=""
if [[ "$file" =~ content/(posts|newsletters)/([0-9]+)/(fi|sv|en)\.mdx$ ]]; then
    is_post=1
    meta_file="$(dirname "$file")/meta.json"
    [[ "${BASH_REMATCH[1]}" == "newsletters" ]] && is_newsletter=1
fi

is_blog_post() {
    [[ "$is_post" -eq 1 ]] && return 0
    grep -qP "PostLayout" "$file"
}

meta_field() { node "$SCRIPT_DIR/../lib/read-json-field.mjs" "$meta_file" "$1"; }

# ── pageTitle length ─────────────────────────────────────────────────────────
# Final <title> tag = raw pageTitle + " | Lauri Lavanti" (17 chars) unless the
# pageTitle already starts with "Lauri Lavanti". Soft hyphens (U+00AD) are
# stripped before counting. Valid range: 50–60 characters.
title_val="$(fm_field "$file" pageTitle)"
if [[ -n "$title_val" ]]; then
    # Strip soft hyphens via LC_ALL=C.UTF-8 printf + sed
    stripped="$(printf '%s' "$title_val" | sed 's/\xc2\xad//g')"
    if echo "$stripped" | grep -q '^Lauri Lavanti'; then
        final_title="$stripped"
    else
        final_title="${stripped} | Lauri Lavanti"
    fi
    title_len="$(printf '%s' "$final_title" | wc -m)"
    if [[ "$title_len" -lt 50 || "$title_len" -gt 60 ]]; then
        error "$file" "pageTitle length ${title_len} (expected 50–60): \"${final_title}\""
        failed=1
    fi
fi

# ── description length ───────────────────────────────────────────────────────
# All pages: 120–160 characters.
desc_val="$(fm_field "$file" description)"
if [[ -n "$desc_val" ]]; then
    desc_len="$(printf '%s' "$desc_val" | wc -m)"
    if [[ "$desc_len" -lt 120 || "$desc_len" -gt 160 ]]; then
        preview="${desc_val:0:80}"
        error "$file" "description length ${desc_len} (expected 120–160): \"${preview}\""
        failed=1
    fi
fi

# ── heading hierarchy: no H3 without preceding H2 ────────────────────────────
h_state="$(fm_body "$file" | awk '
    /^## [^#]/ { saw_h2 = 1 }
    /^### [^#]/ {
        if (!saw_h2) { print NR ": " $0; found = 1 }
        else saw_h2 = 1
    }
    END { exit !found }
' || true)"
if [[ -n "$h_state" ]]; then
    error "$file" "H3 without preceding H2:"
    echo "$h_state" | while IFS= read -r line; do
        printf '  line %s\n' "$line" >&2
    done
    failed=1
fi

# ── hero image alt text ──────────────────────────────────────────────────────
if [[ "$is_post" -eq 1 ]]; then
    hero_image="$(meta_field heroImage)"
else
    hero_image="$(fm_field "$file" heroImage)"
fi
hero_alt="$(fm_field "$file" alt)"
if [[ -n "$hero_image" ]]; then
    if [[ -z "$hero_alt" ]]; then
        error "$file" "heroImage set but alt is missing — required for og:image:alt and accessibility"
        failed=1
    elif echo "$hero_alt" | grep -qiP '^[\w\-]+\.(jpe?g|png|gif|webp|avif|svg)$'; then
        error "$file" "alt looks like a filename: \"${hero_alt}\" — use descriptive text"
        failed=1
    else
        word_count="$(printf '%s' "$hero_alt" | wc -w)"
        if [[ "$word_count" -lt 3 ]]; then
            error "$file" "alt is fewer than 3 words: \"${hero_alt}\" — not descriptive enough"
            failed=1
        fi
    fi
fi

# ── body image alt text ──────────────────────────────────────────────────────
# Extract all ![alt](src) pairs and check each alt.
while IFS= read -r line; do
    # Extract alt from ![alt](src)
    alt_text="$(echo "$line" | grep -oP '(?<=!\[)[^\]]*(?=\])')"
    src_text="$(echo "$line" | grep -oP '(?<=\()\S+(?=\))')"
    if [[ -z "$alt_text" ]]; then
        error "$file" "body image with empty alt: ![](${src_text})"
        failed=1
    elif echo "$alt_text" | grep -qiP '^[\w\-]+\.(jpe?g|png|gif|webp|avif|svg)$'; then
        error "$file" "body image alt looks like a filename: \"${alt_text}\""
        failed=1
    else
        word_count="$(printf '%s' "$alt_text" | wc -w)"
        if [[ "$word_count" -lt 3 ]]; then
            error "$file" "body image alt fewer than 3 words: \"${alt_text}\""
            failed=1
        fi
    fi
done < <(fm_body "$file" | grep -oP '!\[[^\]]*\]\([^)]*\)' || true)

if is_blog_post; then
    # ── internal link count ───────────────────────────────────────────────────
    # Counts [text](/path) links pointing to internal pages.
    link_count="$(fm_body "$file" | grep -oP '\[[^\]]*\]\(/[^)]*\)' | wc -l || true)"
    if [[ "$link_count" -lt 3 ]]; then
        error "$file" "internal links: ${link_count} (minimum 3) — add links to related content"
        failed=1
    elif [[ "$link_count" -gt 10 ]]; then
        error "$file" "internal links: ${link_count} (maximum 10) — excessive link density"
        failed=1
    fi

    # ── tag validity ──────────────────────────────────────────────────────────
    # Extract tags and verify each exists in src/content/tags/.
    # Newsletters are tagless by design (spec: .agents/specs/newsletter/archive.md).
    [[ "$is_newsletter" -eq 1 ]] && exit "$failed"
    REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    TAGS_DIR="$REPO_ROOT/src/content/tags"

    # Build set of valid tag IDs from *.ts files (excluding types.ts)
    declare -A valid_tags
    while IFS= read -r tag_id; do
        valid_tags["$tag_id"]=1
    done < <(grep -rh "id:" "$TAGS_DIR" --include="*.ts" --exclude="types.ts" | grep -oP "(?<=id:\s')[^']+|(?<=id:\s\")[^\"]+")

    if [[ "$is_post" -eq 1 ]]; then
        post_tags="$(meta_field tags)"
    else
        # Extract tags from frontmatter tags: YAML list
        post_tags="$(awk '
            /^---$/ { c++; if (c == 2) exit; next }
            c == 1 && /^tags:/ { in_tags = 1; next }
            c == 1 && in_tags && /^  - / { gsub(/^  - /, ""); print; next }
            c == 1 && in_tags { in_tags = 0 }
        ' "$file")"
    fi

    if [[ -z "$post_tags" ]]; then
        error "$file" "tags array is empty — add at least one tag"
        failed=1
    else
        while IFS= read -r tag; do
            tag="$(echo "$tag" | xargs)"  # trim whitespace
            if [[ -z "${valid_tags[$tag]+x}" ]]; then
                error "$file" "unknown tag: '${tag}' — not found in src/content/tags"
                failed=1
            fi
        done <<< "$post_tags"
    fi

    # ── pillar tag requirement (posts #43+) ──────────────────────────────────
    # Every post with id >= 43 must carry at least one pillar tag.
    pillar_tags=("artificial-intelligence" "digital-independence" "economy" "culture-and-education" "freedom")
    if [[ "$is_post" -eq 1 ]]; then
        post_id="$(meta_field id)"
    else
        post_id="$(fm_field "$file" id)"
    fi
    if [[ -n "$post_id" && "$post_id" -ge 43 ]] 2>/dev/null; then
        has_pillar=0
        while IFS= read -r tag; do
            tag="$(echo "$tag" | xargs)"
            for pt in "${pillar_tags[@]}"; do
                if [[ "$tag" == "$pt" ]]; then has_pillar=1; break 2; fi
            done
        done <<< "$post_tags"
        if [[ "$has_pillar" -eq 0 ]]; then
            error "$file" "missing pillar tag (post #${post_id} ≥ 43) — add one of: artificial-intelligence, digital-independence, economy, culture-and-education, freedom"
            failed=1
        fi
    fi
fi

exit "$failed"
