#!/usr/bin/env bash
# PostToolUse hook (Bash matcher): nudges toward Crew constitution rule #9
# (coder ≠ reviewer) at the natural completion boundary — when the lead calls
# `crew.mjs write-final-synthesis`. Only fires on that one CLI invocation, so
# it is silent during normal work and impossible to mistake for a per-turn
# nag.
#
# Stop-hook predecessor (`check_reviewer_gate.sh`) fired on every assistant
# yield and had to grow dedupe machinery to stay quiet. This is the right
# layer: one signal, one moment, no heuristics about "is the lead really
# done."
#
# Exits:
#   0 — always. Prints reminder to stderr when synthesis is invoked without a
#       fresh review artifact under .claude/artifacts/crew/reviews/. Otherwise
#       silent.
#
# Note: the CLI itself enforces rule #9 server-side for envelope-driven runs
# (`scripts/lib/artifacts.mjs assertReviewGate`). This hook covers vanilla
# (no-envelope) runs and serves as a visible breadcrumb in both cases.

set -u

# Read PostToolUse JSON from stdin and pull the bash command. Bail quietly on
# any parse trouble — this is a nudge, not a gate.
input="$(cat)"
[ -n "$input" ] || exit 0

tool_name="$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null || true)"
[ "$tool_name" = "Bash" ] || exit 0

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || true)"

# Match only the synthesis CLI. Be permissive about paths and quoting.
case "$cmd" in
  *crew.mjs*write-final-synthesis*) ;;
  *) exit 0 ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$repo_root" 2>/dev/null || exit 0

[ -d ".claude/artifacts/crew" ] || exit 0

base=""
for candidate in main master; do
  if git rev-parse --verify --quiet "$candidate" >/dev/null 2>&1; then
    base="$candidate"
    break
  fi
done
[ -n "$base" ] || exit 0

current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$current" = "$base" ] && exit 0
[ "$current" = "HEAD" ] && exit 0

committed="$(git diff --name-only "$base"...HEAD 2>/dev/null | grep -v '^\.claude/' || true)"
uncommitted="$(git status --porcelain 2>/dev/null | awk '{print $NF}' | grep -v '^\.claude/' || true)"
if [ -z "$committed" ] && [ -z "$uncommitted" ]; then
  exit 0
fi

mtime_of() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0
}

newest_code_ts=0
all_code_files="$(printf '%s\n%s\n' "$committed" "$uncommitted" | grep -v '^$' | sort -u || true)"
if [ -n "$all_code_files" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$f" ] || continue
    ts="$(mtime_of "$f")"
    if [ "$ts" -gt "$newest_code_ts" ] 2>/dev/null; then
      newest_code_ts="$ts"
    fi
  done <<EOF
$all_code_files
EOF
fi
[ "$newest_code_ts" -gt 0 ] || exit 0

newest_review_ts=0
if [ -d ".claude/artifacts/crew/reviews" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    ts="$(mtime_of "$f")"
    if [ "$ts" -gt "$newest_review_ts" ] 2>/dev/null; then
      newest_review_ts="$ts"
    fi
  done <<EOF
$(find .claude/artifacts/crew/reviews -type f -name '*.md' 2>/dev/null)
EOF
fi

if [ "$newest_review_ts" -ge "$newest_code_ts" ] 2>/dev/null; then
  exit 0
fi

total=0
[ -n "$committed" ] && total=$(( total + $(printf '%s\n' "$committed" | wc -l | tr -d ' ') ))
[ -n "$uncommitted" ] && total=$(( total + $(printf '%s\n' "$uncommitted" | wc -l | tr -d ' ') ))
sample="$(printf '%s\n%s\n' "$committed" "$uncommitted" | grep -v '^$' | head -3 | tr '\n' ' ')"

cat >&2 <<EOF
[crew] reminder — coder ≠ reviewer (constitution rule #9)

write-final-synthesis was just invoked. Branch '$current' has $total changed
code file(s) outside .claude/ since '$base':
  $sample

No review artifact in .claude/artifacts/crew/reviews/ is newer than the most
recent code change. If this synthesis is for an envelope-driven run, the CLI
itself will refuse with rule #9 (exit 2). For vanilla runs, consider spawning
a 'crew:reviewer' subagent before treating this as done.
EOF
exit 0
