#!/usr/bin/env bash
# Stop hook: enforces Crew constitution rule #9 (coder ≠ reviewer).
#
# Fires on Stop. If the current repo has Crew artifacts and the branch has
# uncommitted or unmerged code changes outside .claude/ that aren't covered
# by a fresh review artifact, blocks the stop with a reminder to spawn a
# reviewer subagent before declaring done.
#
# Exits:
#   0 — pass (no Crew context, no code changes, or review artifact is fresh)
#   2 — block (stderr is fed back to the model as feedback)
#
# Detection rules:
#   - Crew context  = .claude/artifacts/crew/ exists in the repo
#   - Code changes  = files outside .claude/ either uncommitted OR present in
#                     `git diff <base>...HEAD` (base = main or master)
#   - Fresh review  = newest file mtime in .claude/artifacts/crew/reviews/ is
#                     ≥ newest code-change timestamp (newest commit time on
#                     branch, or newest mtime of uncommitted code files)

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

# Newest commit on branch (since base) touching non-.claude files.
last_commit_ts="$(git log -1 --format=%ct "$base"..HEAD -- . ':(exclude).claude' ':(exclude).claude/**' 2>/dev/null || true)"
if [ -n "$last_commit_ts" ]; then
  if [ "$last_commit_ts" -gt "$newest_code_ts" ] 2>/dev/null; then
    newest_code_ts="$last_commit_ts"
  fi
fi

# Newest uncommitted code-file mtime.
if [ -n "$uncommitted" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$f" ] || continue
    ts="$(mtime_of "$f")"
    if [ "$ts" -gt "$newest_code_ts" ] 2>/dev/null; then
      newest_code_ts="$ts"
    fi
  done <<EOF
$uncommitted
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

# Block.
total=0
[ -n "$committed" ] && total=$(( total + $(printf '%s\n' "$committed" | wc -l | tr -d ' ') ))
[ -n "$uncommitted" ] && total=$(( total + $(printf '%s\n' "$uncommitted" | wc -l | tr -d ' ') ))
sample="$(printf '%s\n%s\n' "$committed" "$uncommitted" | grep -v '^$' | head -3 | tr '\n' ' ')"

cat >&2 <<EOF
[crew] BLOCK — coder ≠ reviewer (constitution rule #9)

Branch '$current' has $total changed code file(s) outside .claude/ since '$base':
  $sample

No review artifact in .claude/artifacts/crew/reviews/ is newer than the most
recent code change. Spawn a 'crew:reviewer' subagent to review the diff and
write its verdict before stopping. Single-session is a scope call, not a
license to skip the review gate — auto mode and small bounded fixes both
qualify.

If review is genuinely not needed (e.g. doc-only fix that landed under a
non-.claude path by accident, or you intend to ship without review), say so
explicitly and re-stop.
EOF
exit 2
