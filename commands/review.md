---
description: Lead a review gate on completed work with explicit review standards and inspectable results.
---

# Review Work In Crew Mode

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
8. Restate the review target, the task boundary being reviewed, what changed, and which review gates matter for this repo or task.
9. Choose the likely pace: `slow`, `medium`, or `fast`.
10. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
    Treat `assisted single-session` as the default when reviewer input is the main gate.
11. If the review run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
12. Use reviewer as the primary specialist for the gate.
13. Treat review as a task-closure step: completed implementation tasks should not be considered done until the reviewer returns a verdict.
14. Bring in researcher only if code tracing or repo-standard discovery is needed to make the review meaningful.
15. If review materially validates the work, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
16. End with:
   - verdict: `approved`, `approved_with_notes`, or `rejected`
   - evidence checked
   - test adequacy
   - risks or follow-up needed
   - whether the work is now ready for validation, shipping, or more implementation
17. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
