#!/bin/bash
# Advisory only: when a `git commit` has MDX files staged, this approves the
# call and attaches a reminder to run /review-content first. It does NOT block —
# it returns permissionDecision "approve" with a reason, so the commit proceeds.
# (The header previously claimed it blocks, which it never did.)

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only trigger on git commit commands
if ! echo "$COMMAND" | grep -qE "^git commit"; then
    exit 0
fi

# Check if any MDX files are staged
MDX_FILES=$(git diff --cached --name-only | grep '\.mdx$')
if [ -z "$MDX_FILES" ]; then
    exit 0
fi

FILE_LIST=$(echo "$MDX_FILES" | tr '\n' ' ')

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "approve",
    "permissionDecisionReason": "MDX files are staged: ${FILE_LIST}— consider running /review-content on content changes before committing."
  }
}
EOF

exit 0
