#!/usr/bin/env bash
# Stop hook: nudges toward Crew constitution rule #9 (coder ≠ reviewer).
#
# Philosophy: this is a nudge, not a punishment. When a session ends with
# unreviewed code changes, we surface a one-time reminder so the lead notices
# and (in our experience) chooses to spawn a reviewer — that's enough. We
# deliberately do NOT exit 2 (which Claude Code's Stop-hook contract treats as
# "block this stop and re-prompt the model with stderr as a user message"),
# because a hard block burns tokens in a loop on every text-only turn while a
# reviewer subagent is still running, and turns review into a chore the lead
# resents rather than an action they want to take. Visibility > coercion.
#
# Exits:
#   0 — always. Prints the reminder to stderr when a review is missing; stays
#       silent otherwise. The user and the model both see the message; neither
#       is forced into another turn by it.
#
# Detection rules:
#   - Crew context  = .claude/artifacts/crew/ exists in the repo
#   - Code changes  = files outside .claude/ either uncommitted OR present in
#                     `git diff <base>...HEAD` (base = main or master)
#   - Fresh review  = newest file mtime in .claude/artifacts/crew/reviews/ is
#                     ≥ newest mtime of any code file (committed or uncommitted)
#                     differing from the base branch.
#                     We deliberately do NOT use commit timestamps: a `git
#                     commit` of an already-reviewed working tree must not
#                     re-trigger the gate. Only actual file content changes
#                     (which update file mtime) count as "new code".

set -u

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

# Collect code-change file lists (newline-separated). Filter out .claude/.
committed="$(git diff --name-only "$base"...HEAD 2>/dev/null | grep -v '^\.claude/' || true)"
uncommitted="$(git status --porcelain 2>/dev/null | awk '{print $NF}' | grep -v '^\.claude/' || true)"

if [ -z "$committed" ] && [ -z "$uncommitted" ]; then
  exit 0
fi

mtime_of() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0
}

newest_code_ts=0

# Newest mtime across both committed and uncommitted code files. We use file
# mtime — not commit timestamp — so that committing an already-reviewed working
# tree does not bump the "newest code" signal past the review artifact.
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

# Newest review artifact mtime.
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

# Emit reminder (non-blocking).
total=0
[ -n "$committed" ] && total=$(( total + $(printf '%s\n' "$committed" | wc -l | tr -d ' ') ))
[ -n "$uncommitted" ] && total=$(( total + $(printf '%s\n' "$uncommitted" | wc -l | tr -d ' ') ))
sample="$(printf '%s\n%s\n' "$committed" "$uncommitted" | grep -v '^$' | head -3 | tr '\n' ' ')"

cat >&2 <<EOF
[crew] reminder — coder ≠ reviewer (constitution rule #9)

Branch '$current' has $total changed code file(s) outside .claude/ since '$base':
  $sample

No review artifact in .claude/artifacts/crew/reviews/ is newer than the most
recent code change. Consider spawning a 'crew:reviewer' subagent before
shipping — auto mode and small bounded fixes qualify too.

This is a nudge, not a block. Continue if the review is genuinely not needed
(e.g. doc-only fix), or run the reviewer and re-check.
EOF
exit 0
