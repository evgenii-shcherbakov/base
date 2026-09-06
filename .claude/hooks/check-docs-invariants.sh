#!/usr/bin/env bash
# PostToolUse / Write|Edit documentation guard.
#
# Checks the invariants of the docs layout described in the root CLAUDE.md. They are
# cheap, always true, and each one has already caught a real drift: a CLAUDE.md kept
# referencing @backend/nats and @backend/redis for weeks after those packages were
# renamed to @backend/event-bus-*.
#
# On a documentation edit:
#   1. every docs/ page linked from a CLAUDE.md exists (ADRs, the generated env page)
#   2. every ADR file appears in the docs/adr/README.md index
#   3. every @backend/* | @packages/* | @frontend/* name in a CLAUDE.md is a real workspace
#
# On an edit to a zod env schema, a manifest, or a document carrying an env table:
#   4. the generated env tables still match the schemas (@packages/env-docs --check),
#      which also rejects a `zod.number()` that forgot `zod.coerce` and a config file
#      no marker documents. A manifest counts because the service/package map in
#      docs/env.md is read off the workspace dependencies.
#
# Deliberately NOT checked: duplicated wording. That needs a bespoke marker list
# which goes stale faster than the docs do — dedup is an audit, not an invariant.
#
# Reads the hook JSON on stdin; on a violation prints a PostToolUse "block"
# decision so the model is told what to fix. Always exits 0.
content=$(cat)
path=$(printf '%s' "$content" | jq -r '.tool_input.file_path // ""')

is_doc=false
is_schema=false

case "$path" in
  */CLAUDE.md | CLAUDE.md | */docs/adr/*.md) is_doc=true ;;
  */docs/env.md | */common.validation.ts) is_schema=true ;;
  */package.json | */pnpm-workspace.yaml) is_schema=true ;;
  # Content, not filename: `*.config.ts` used to miss backend/apps/auth/src/config.ts, and a
  # source that does not validate env leaves without paying for a tsx start-up.
  *.ts) grep -q 'validateEnv' "$path" 2>/dev/null && is_schema=true || exit 0 ;;
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

if [ "$is_doc" = true ]; then
  # 1. Links into docs/ resolve (ADRs and the generated env page).
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    [ -f "$link" ] || problems="${problems}  - dangling docs link: ${link}"$'\n'
  done < <(grep_docs 'docs/(adr/[0-9a-z-]+|env)\.md')

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
fi

# 4. Generated env tables still match the schemas they are projected from. Runs the
#    generator's own --check rather than reimplementing it (~0.5 s).
if [ "$is_schema" = true ]; then
  tsx="packages/env-docs/node_modules/.bin/tsx"

  if [ -x "$tsx" ]; then
    if ! env_report=$("$tsx" packages/env-docs/compiler/main.ts --check 2>&1); then
      problems="${problems}${env_report}"$'\n'
    fi
  fi
fi

if [ -n "$problems" ]; then
  jq -n --arg r "Documentation invariants broken (project hook):"$'\n'"${problems}
Fix the reference, add the missing ADR/index row, or regenerate. See docs/adr/README.md." \
    '{decision: "block", reason: $r}'
fi
exit 0
