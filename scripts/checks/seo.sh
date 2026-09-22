#!/usr/bin/env bash
# SEO bash checks for a single MDX file.
# Usage: seo.sh FILE
# Exit 0 = all pass. Exit 1 = at least one error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/bash-helpers.sh
source "$SCRIPT_DIR/../lib/bash-helpers.sh"

file="$1"
failed=0

# A collection entry is src/content/{posts,newsletters}/{id}/{fi,sv,en}.mdx — meta.json
# lives alongside it. Both collections share the post rules below; is_newsletter marks
# the differences (no blog id, so the year-slug exemption for posts 20/47 never applies).
is_post=0
is_newsletter=0
post_id=""
post_lang=""
if [[ "$file" =~ content/(posts|newsletters)/([0-9]+)/(fi|sv|en)\.mdx$ ]]; then
    is_post=1
    post_lang="${BASH_REMATCH[3]}"
    meta_file="$(dirname "$file")/meta.json"
    if [[ "${BASH_REMATCH[1]}" == "newsletters" ]]; then
        is_newsletter=1
    else
        post_id="${BASH_REMATCH[2]}"
    fi
fi

# ── required frontmatter fields ─────────────────────────────────────────────
if [[ "$is_post" -eq 1 ]]; then
    required_fields=(pageTitle title description lang slug)
else
    required_fields=(pageTitle title description lang slug layout)
fi
for field in "${required_fields[@]}"; do
    if ! grep -qP "^${field}:" "$file"; then
        error "$file" "missing required frontmatter field: ${field}"
        failed=1
    fi
done

# publishDate required for blog posts
if [[ "$is_post" -eq 1 ]]; then
    publish_date="$(node "$SCRIPT_DIR/../lib/read-json-field.mjs" "$meta_file" publishDate)"
    if [[ -z "$publish_date" ]]; then
        error "$file" "missing required field in meta.json: publishDate (required for blog posts)"
        failed=1
    fi
elif grep -qP '^layout:' "$file" && grep -qP "PostLayout" "$file"; then
    if ! grep -qP '^publishDate:' "$file"; then
        error "$file" "missing required frontmatter field: publishDate (required for blog posts)"
        failed=1
    fi
fi

# ── lang must match path locale ──────────────────────────────────────────────
lang_val="$(fm_field "$file" lang)"
if [[ "$is_post" -eq 1 ]]; then
    path_locale="$post_lang"
elif [[ "$file" =~ /fi/ ]]; then   path_locale=fi
elif [[ "$file" =~ /sv/ ]]; then path_locale=sv
elif [[ "$file" =~ /en/ ]]; then path_locale=en
else path_locale=""
fi

if [[ -n "$path_locale" && "$lang_val" != "$path_locale" ]]; then
    error "$file" "lang '${lang_val}' does not match path locale '${path_locale}' — hreflang will be wrong"
    failed=1
fi

# ── slug format ──────────────────────────────────────────────────────────────
slug_val="$(fm_field "$file" slug)"
if [[ -n "$slug_val" ]]; then
    # No uppercase letters
    if echo "$slug_val" | grep -qP '[A-Z]'; then
        error "$file" "slug contains uppercase letters: '${slug_val}'"
        failed=1
    fi
    # No underscores
    if echo "$slug_val" | grep -qP '_'; then
        error "$file" "slug contains underscores (use hyphens): '${slug_val}'"
        failed=1
    fi
    # No soft hyphens (U+00AD)
    if echo "$slug_val" | grep -qP '\x{00AD}'; then
        error "$file" "slug contains a soft hyphen (U+00AD): '${slug_val}'"
        failed=1
    fi
    # No 4-digit years — except posts 20 and 47 where the year is part of the proper name
    # (election cycle posts and year-in-review posts with established URLs must not be renamed).
    # Newsletters never get the exemption: post_id stays empty for them, so blog_id is "".
    if [[ "$is_post" -eq 1 ]]; then
        blog_id="$post_id"
    else
        blog_id="$(echo "$file" | grep -oP '/blog/\K\d+' || true)"
    fi
    if [[ "$blog_id" != "20" && "$blog_id" != "47" ]]; then
        if echo "$slug_val" | grep -qP '(19|20)\d{2}'; then
            error "$file" "slug contains a 4-digit year (makes content appear stale): '${slug_val}'"
            failed=1
        fi
    fi
fi

# ── slug must equal folder name for legacy page-routed blog posts ───────────
# Not applicable to content-collection posts: the folder is the numeric id, not
# the slug. Slug uniqueness per locale is enforced instead by cross-file.mjs.
if [[ "$is_post" -eq 0 ]] && echo "$file" | grep -qP '/blog/\d+/'; then
    folder_name="$(basename "$(dirname "$file")")"
    if [[ -n "$slug_val" && "$folder_name" != "$slug_val" ]]; then
        error "$file" "slug '${slug_val}' does not match folder name '${folder_name}'"
        failed=1
    fi
fi

# ── no bare H1 in body ───────────────────────────────────────────────────────
# Layout renders the <h1>; a second one in the body creates a duplicate H1.
h1_lines="$(fm_body "$file" | grep -nP '^# [^#]' | head -1 || true)"
if [[ -n "$h1_lines" ]]; then
    error "$file" "H1 (# heading) found in body — layout already renders the title as H1"
    failed=1
fi

exit "$failed"
