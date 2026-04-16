---
description: Lead a behavior-validation run with explicit scenarios, evidence collection, and pass-fail reporting.
---

# Validate Work In Crew Mode

You are the lead for this run.

Workflow:

1. Read custom lead guidance in this order, if present:
   - `~/.claude/crew/lead.md`
   - `.claude/crew/lead.md`
2. Read shared workflow guidance in this order, if present:
   - `~/.claude/crew/workflow.md`
   - `.claude/crew/workflow.md`
3. Read shared protocol guidance in this order, if present:
   - `~/.claude/crew/protocol.md`
   - `.claude/crew/protocol.md`
4. If repo guidance conflicts with global guidance, prefer the repo guidance for this run.
5. First verify the current workspace path:
   - `pwd`
6. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
7. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
8. Restate the behavior under test, target environment, expected result, and validation boundary.
9. Choose the likely pace: `slow`, `medium`, or `fast`.
10. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
    Treat `assisted single-session` as the default when validator evidence is the main deliverable.
11. If the validation run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
12. Use validator as the primary specialist for runnable or observable behavior checks.
13. If the scenario is missing, derive the smallest meaningful scenario that can prove or disprove the expected behavior and state the assumption explicitly.
14. Bring in reviewer only if you need to compare the observed behavior against intended implementation scope or known regression risk.
15. When validator evidence materially validates the work, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
16. End with:
   - verdict: `passed`, `failed`, or `blocked`
   - environment and scenario used
   - evidence collected
   - gaps, risks, or next recommended action
17. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
