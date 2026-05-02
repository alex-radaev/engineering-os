#!/usr/bin/env bash
# Stop hook: catches long multi-specialist runs that haven't synthesized yet
# and nudges toward updating lessons.md. Gated on two conditions; only fires
# if BOTH hold. This keeps the hook quiet during ordinary turns.
#
# Conditions:
#   1. >=3 subagent_stop events in .claude/logs/events.jsonl since the most
#      recent session_start.
#   2. lessons.md mtime is older than that same session_start (i.e. lessons
#      hasn't been touched yet this session).
#
# Failures in detection bail quietly. Exits 0 always.

set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$repo_root" 2>/dev/null || exit 0

events_file=".claude/logs/events.jsonl"
[ -f "$events_file" ] || exit 0

# Find timestamp of the most recent session_start. Falls back silently if jq
# or grep can't find one — most likely a brand-new repo.
last_session_ts="$(grep -E '"event":\s*"session_start"' "$events_file" 2>/dev/null \
  | tail -n 1 \
  | jq -r '.timestamp // ""' 2>/dev/null || true)"
[ -n "$last_session_ts" ] || exit 0

# Convert ISO 8601 timestamp to epoch seconds. Both BSD (macOS) and GNU
# (Linux) date are tried.
to_epoch() {
  local ts="$1"
  date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s 2>/dev/null \
    || date -u -d "$ts" +%s 2>/dev/null \
    || echo ""
}

session_epoch="$(to_epoch "$last_session_ts")"
[ -n "$session_epoch" ] || exit 0

# Count subagent_stop events with timestamp >= session_epoch.
subagent_count="$(jq -c \
  --arg session_ts "$last_session_ts" \
  'select(.event == "subagent_stop" and .timestamp >= $session_ts)' \
  "$events_file" 2>/dev/null | wc -l | tr -d ' ')"
[ "${subagent_count:-0}" -ge 3 ] 2>/dev/null || exit 0

# Check lessons.md mtime; bail if file is missing (can't be "untouched" if
# it doesn't exist — first-run case).
lessons_file=".claude/artifacts/crew/lessons.md"
[ -f "$lessons_file" ] || exit 0

mtime_of() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0
}

lessons_mtime="$(mtime_of "$lessons_file")"
[ "$lessons_mtime" -ge "$session_epoch" ] 2>/dev/null && exit 0

cat >&2 <<EOF
[crew] lessons probe — long run, lessons.md untouched.

This session has had ${subagent_count} subagent_stop event(s) since session
start, and .claude/artifacts/crew/lessons.md hasn't been modified.

If any specialist returned a correction, walk-back, recovery, or surprising
finding worth carrying across sessions, consider appending to lessons.md
before context grows further. Otherwise ignore.
EOF
exit 0
