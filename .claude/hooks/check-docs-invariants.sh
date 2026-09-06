#!/usr/bin/env bash
# PostToolUse / Write|Edit documentation guard.
#
# Checks the three structural invariants of the docs layout described in the root
# CLAUDE.md. They are cheap, always true, and each one has already caught a real
# drift: a CLAUDE.md kept referencing @backend/nats and @backend/redis for weeks
# after those packages were renamed to @backend/event-bus-*.
#
#   1. every docs/adr/*.md linked from a CLAUDE.md exists
#   2. every ADR file appears in the docs/adr/README.md index
#   3. every @backend/* | @packages/* | @frontend/* name in a CLAUDE.md is a real workspace
#
# Deliberately NOT checked: duplicated wording. That needs a bespoke marker list
# which goes stale faster than the docs do — dedup is an audit, not an invariant.
#
# Reads the hook JSON on stdin; on a violation prints a PostToolUse "block"
# decision so the model is told what to fix. Always exits 0.
content=$(cat)
path=$(printf '%s' "$content" | jq -r '.tool_input.file_path // ""')

# Only react to documentation edits.
case "$path" in
  */CLAUDE.md | CLAUDE.md | */docs/adr/*.md) ;;
  *) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -d "$root" ] || exit 0
cd "$root" || exit 0

grep_docs() {
  grep -rhoE "$1" --include=CLAUDE.md \
    --exclude-dir=.claude --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | sort -u
}

problems=""

# 1. ADR links resolve.
while IFS= read -r link; do
  [ -n "$link" ] || continue
  [ -f "$link" ] || problems="${problems}  - dangling ADR link: ${link}"$'\n'
done < <(grep_docs 'docs/adr/[0-9a-z-]+\.md')

# 2. Every ADR is listed in the index.
if [ -f docs/adr/README.md ]; then
  for adr in docs/adr/[0-9]*.md; do
    [ -e "$adr" ] || continue
    grep -q "$(basename "$adr")" docs/adr/README.md ||
      problems="${problems}  - ADR not in the docs/adr/README.md index: ${adr}"$'\n'
  done
fi

# 3. Referenced workspaces exist. A match ending in "/" is a path fragment
#    (@packages/configs/eslint/…), not a package reference — skipped.
while IFS= read -r name; do
  [ -n "$name" ] || continue
  case "$name" in */) continue ;; esac
  short=${name#*/}
  if [ ! -d "backend/packages/$short" ] &&
    [ ! -d "packages/$short" ] &&
    [ ! -d "frontend/packages/$short" ]; then
    problems="${problems}  - unknown workspace referenced: ${name}"$'\n'
  fi
done < <(grep_docs '@(backend|packages|frontend)/[a-z][a-z0-9-]*/?')

if [ -n "$problems" ]; then
  jq -n --arg r "Documentation invariants broken (project hook):"$'\n'"${problems}
Fix the reference, or create the missing ADR/index row. See docs/adr/README.md." \
    '{decision: "block", reason: $r}'
fi
exit 0
