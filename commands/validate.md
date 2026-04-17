---
description: Validate runnable or observable behavior.
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
8. Restate the behavior under test, target environment, expected result, validation boundary, and whether this is a milestone check or end-of-run check.
9. Choose the likely pace: `slow`, `medium`, or `fast`.
10. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
    Treat `assisted single-session` as the default when validator evidence is the main deliverable.
11. If the validation run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
12. Use validator as the primary specialist for runnable or observable behavior checks.
13. Validation should normally run after task-level review has passed, unless you are intentionally checking a milestone before more implementation continues.
14. If the scenario is missing, derive the smallest meaningful scenario that can prove or disprove the expected behavior and state the assumption explicitly.
15. Distinguish executed evidence from inferred confidence in the returned result.
16. Instruct the validator to persist raw evidence — actual commands, responses, logs — under `.claude/artifacts/crew/validations/evidence/<slug>/`, one file per scenario or a single transcript file, so the user can inspect what was run without trusting the summary. The validation artifact should reference these evidence files by path.
17. Bring in reviewer only if you need to compare the observed behavior against intended implementation scope or known regression risk.
18. When validator evidence materially validates the work, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
19. End with:
   - verdict: `passed`, `failed`, or `blocked`
   - environment and scenario used
   - executed evidence collected (including path to persisted raw evidence)
   - inferred confidence, if any
   - gaps, risks, or next recommended action
20. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
