#!/usr/bin/env bash
# SessionStart hook: surfaces the Crew wake-up brief at the start of every
# Claude Code session in this repo. Lets the lead see lessons.md, recent
# artifacts, claims, and template-sync status BEFORE the user's first
# message — so even non-Crew chats benefit from repo context.
#
# Failures bail quietly. Exits 0 always. Output goes to stderr, which Claude
# Code injects into the model context.
#
# Implementation note: we deliberately re-use crew.mjs wake-up rather than
# adding a separate "lite" path. The cost of one extra wake-up per session
# is small; complexity of two paths is not. If duplication with a /crew:*
# command's own wake-up turns out to bite, optimize then.

set -u

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$repo_root" 2>/dev/null || exit 0

# Only run if this looks like a Crew-aware repo. The presence of CLAUDE.md
# is a weak signal but better than nothing; a stronger signal is the crew
# artifacts directory.
[ -d ".claude/artifacts/crew" ] || [ -f ".claude/state/crew/claims.json" ] || exit 0

plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ]; then
  exit 0
fi

crew_cli="$plugin_root/scripts/crew.mjs"
[ -f "$crew_cli" ] || exit 0

# Run wake-up; capture JSON. Bail quietly on any non-zero exit.
brief="$(node "$crew_cli" wake-up --repo "$repo_root" 2>/dev/null)" || exit 0
[ -n "$brief" ] || exit 0

# Print a compact stderr summary. The full JSON is too noisy for a
# session-start nudge; pull the bits the lead actually needs to orient.
printf '%s\n' "$brief" | jq -r '
  def kv(k; v): "  " + k + ": " + (v // "—" | tostring);

  "[crew] wake-up brief at session start",
  kv("repo"; .repoPath),
  kv("branch"; .git.branch),
  kv("ahead/behind"; ((.git.ahead // 0 | tostring) + " / " + (.git.behind // 0 | tostring))),
  kv("active claims"; (.claims | length | tostring)),
  kv("open approvals"; (.openApprovals | length | tostring)),
  (if .latestArtifacts.runBrief then kv("latest run brief"; .latestArtifacts.runBrief.title) else empty end),
  (if .latestArtifacts.finalSynthesis then kv("latest synthesis"; .latestArtifacts.finalSynthesis.title) else empty end),
  (if .lessons then kv("lessons.md"; (.lessons.rawLineCount | tostring) + " lines, " + (if .lessons.truncated then "truncated" else "fits" end)) else kv("lessons.md"; "(none yet)") end),
  (if .lessonsArchive then kv("archive"; (.lessonsArchive.entries | tostring) + " entries, last demoted " + (.lessonsArchive.lastDemoted // "—")) else empty end),
  (if (.staleLessons | length) > 0 then "  stale lessons (>30d, verify or demote):" else empty end),
  (.staleLessons[]? | "    - " + .title + " (last_verified: " + .lastVerified + ", " + (.ageDays | tostring) + "d ago)"),
  "",
  "  full brief: node \"$CLAUDE_PLUGIN_ROOT/scripts/crew.mjs\" wake-up --repo \"$PWD\""
' 1>&2 || exit 0

# Also surface the body of lessons.md if it exists — the lead reads this
# directly into context. Bounded by the wake-up reader (200 lines / 25KB).
lessons_body="$(printf '%s\n' "$brief" | jq -r '.lessons.content // ""' 2>/dev/null)"
if [ -n "$lessons_body" ]; then
  printf '\n[crew] lessons.md (auto-loaded):\n---\n%s\n---\n' "$lessons_body" >&2
fi

exit 0
