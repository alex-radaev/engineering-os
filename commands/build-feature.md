---
description: Build or extend a capability.
---

# Build Feature In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. Read custom lead guidance in this order, if present:
   - `~/.claude/crew/lead.md`
   - `.claude/crew/lead.md`
2. If a repo-local `.claude/crew/lead.md` exists and conflicts with global guidance, prefer it for this run.
3. First verify the current workspace path:
   - `pwd`
4. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
6. Restate the feature goal plus what is in scope and out of scope.
7. Choose the likely pace: `slow`, `medium`, or `fast`.
8. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded implementation tasks.
9. Choose mode (`single-session`, `assisted single-session`, or `team run`) per the workflow Mode Guidance. For substantial implementation, prefer `assisted single-session` with a builder or `team run` with multiple builders.
10. If the task is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
11. If using `single-session` and you will write code directly, first read builder guidance per the protocol's Custom Instructions Lookup section (role name: `builder`).
12. For substantial implementation work, decompose the run into bounded tasks with one owner each. Builder owns code-bearing tasks per the constitution's test-as-default rule.
13. If this run was driven by a design doc (from `/crew:design` or user-referenced), pass the design doc path to both the builder and the reviewer in their handoffs so they work from the same spec. If there is no design doc, say "no design doc" explicitly — stale docs under `designs/` would mislead the specialist if it went looking.
14. If using multiple builders, ensure write scopes are disjoint before running them in parallel.
15. If using a `team run`, claim files only when parallel work might collide, and open approvals only when scope or ownership boundaries must be crossed. Assign bounded work to:
   - builder for implementation
   - reviewer for review
   - validator for behavior validation when the result can be exercised meaningfully
   - researcher for uncertainty reduction if needed
16. Keep ownership explicit and avoid same-file parallel editing.
17. Apply gate defaults (see workflow Gate Defaults). If a gate is skipped, say so explicitly and justify it before the final synthesis.
18. If the work is already moving through a deployment boundary, recommend or enter `/crew:ship` instead of treating local implementation as the whole workflow.
19. When a helper or teammate hands work back, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
20. When a reviewer materially validates the work, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
21. When a validator materially validates the behavior, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
22. End with a clear synthesis for the user:
   - what changed
   - what was reviewed
   - what was validated
   - what tests were added, or the exact reason they were deferred plus what coverage is still missing
   - risks or open questions
   - what happens next
   - exact local run and test instructions if the result is runnable
23. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --run-steps "<step one,step two>"`
