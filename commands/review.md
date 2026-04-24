---
description: Run the review phase on completed work.
---

# Review Work In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. If the prompt begins with `ORCHESTRATOR_MISSION`, parse it per `workflow.md § Mission Envelope` before restating goal/scope. Record `mission_id` and reporting paths in the run brief.
2. Read custom lead guidance per the protocol's Custom Instructions Lookup section (role name: `lead`).
3. First verify the current workspace path:
   - `pwd`
4. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
6. Restate the review target, the task boundary being reviewed, what changed, and which review gates matter for this repo or task.
7. Choose the likely pace: `slow`, `medium`, or `fast`.
8. Choose mode per the workflow Mode Guidance. Treat `assisted single-session` as the default when reviewer input is the main gate.
9. If the review run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
10. Use reviewer as the primary specialist for the gate.
11. If the reviewed work was built from a specific design doc, pass its path to the reviewer in the handoff so review can assess conformance, not just generic correctness — the explicit path is how the reviewer links work to a design. If there is no design doc, say "no design doc" explicitly so the reviewer skips conformance checking rather than guessing.
12. Treat review as a task-closure step: completed implementation tasks should not be considered done until the reviewer returns a verdict.
13. Bring in researcher only if code tracing or repo-standard discovery is needed to make the review meaningful.
14. If review materially validates the work, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
15. End with:
   - verdict: `approved`, `approved_with_notes`, or `rejected`
   - evidence checked
   - test adequacy
   - risks or follow-up needed
   - whether the work is now ready for validation, shipping, or more implementation
16. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
