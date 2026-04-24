---
description: Validate runnable or observable behavior.
---

# Validate Work In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. If the prompt begins with `ORCHESTRATOR_MISSION`, parse it per `workflow.md § Mission Envelope` before restating goal/scope. Record `mission_id` and reporting paths in the run brief.
1a. If the envelope is present, call the mission writers (see `workflow.md § Mission Reporting`):
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" record-mission --repo "$PWD" --prompt-file <path-to-envelope-dump>` (or `--envelope-json`).
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" append-mission-event --repo "$PWD" --mission-id <id> --event started --phase validation --summary "<goal>"`.
    Skip both calls when no envelope is present.
2. Read custom lead guidance per the protocol's Custom Instructions Lookup section (role name: `lead`).
3. First verify the current workspace path:
   - `pwd`
4. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
6. Restate the behavior under test, target environment, expected result, validation boundary, and whether this is a milestone check or end-of-run check.
7. Choose the likely pace: `slow`, `medium`, or `fast`.
8. Choose mode per the workflow Mode Guidance. Treat `assisted single-session` as the default when validator evidence is the main deliverable.
9. If the validation run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
10. Use validator as the primary specialist for runnable or observable behavior checks.
11. Validation should normally run after task-level review has passed, unless you are intentionally checking a milestone before more implementation continues.
12. If the scenario is missing, derive the smallest meaningful scenario that can prove or disprove the expected behavior and state the assumption explicitly.
13. Distinguish executed evidence from inferred confidence in the returned result.
14. Instruct the validator to persist raw evidence — actual commands, responses, logs — under `.claude/artifacts/crew/validations/evidence/<slug>/`, one file per scenario or a single transcript file, so the user can inspect what was run without trusting the summary. The validation artifact should reference these evidence files by path.
15. Bring in reviewer only if you need to compare the observed behavior against intended implementation scope or known regression risk.
16. When validator evidence materially validates the work, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
   - If an envelope is active, fire `append-mission-event --event gate --phase validation --summary "<verdict>"` after the validation verdict lands.
17. End with:
   - verdict: `passed`, `failed`, or `blocked`
   - environment and scenario used
   - executed evidence collected (including path to persisted raw evidence)
   - inferred confidence, if any
   - gaps, risks, or next recommended action
18. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --external-deltas "<off-repo changes required, or 'none'>"`
   - When an envelope is active, also pass `--mission-terminal-status <done|partial|needs_user|blocked|abandoned> --proposed-task-status <candidate|ready|active|blocked|needs_review|done|parked|cancelled> --phase validation` and optionally `--next-action "<text>"`. The CLI writes mission status, appends a terminal event, and copies the synthesis to `reporting.handoff_file` in one call. See `crew/workflow.md` § Terminal Synthesis.
   - Vanilla runs (no envelope) skip the mission flags — behavior is unchanged.
