#!/usr/bin/env bash
# PostToolUse hook (Bash matcher): nudges the lead at the natural review
# moment — when `crew.mjs write-final-synthesis` is invoked. Fires exactly
# once per synthesis. Asks: anything durable for lessons.md before closing?
#
# Companion to check_synthesis_review.sh which covers constitution rule #9.
# This is the lessons.md side of the same nudge moment.
#
# Exits 0 always. Silent unless the synthesis CLI is the command that just
# ran. Failures in detection bail quietly — this is a nudge, not a gate.

set -u

input="$(cat)"
[ -n "$input" ] || exit 0

tool_name="$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null || true)"
[ "$tool_name" = "Bash" ] || exit 0

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || true)"

case "$cmd" in
  *crew.mjs*write-final-synthesis*) ;;
  *) exit 0 ;;
esac

cat >&2 <<'EOF'
[crew] lessons probe — synthesis just written.

Anything from this run that future-you (or the user, on another repo
checkout in two weeks) should know? If yes, append to
.claude/artifacts/crew/lessons.md with a `last_verified:` date. If
adding it pushes the file over ~200 lines / 25KB, demote one
specific existing entry to lessons-archive.md FIRST, then write.

If nothing durable came up, ignore this and move on.
EOF
exit 0
