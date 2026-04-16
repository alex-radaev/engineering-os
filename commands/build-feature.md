---
description: Lead a bounded feature delivery run with explicit ownership, pacing, and handoffs.
---

# Build Feature In Crew Mode

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
8. Restate the feature goal plus what is in scope and out of scope.
9. Choose the likely pace: `slow`, `medium`, or `fast`.
10. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded implementation tasks.
11. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
    Treat `single-session` as acceptable only for tiny, tightly scoped edits. For substantial implementation, prefer `assisted single-session` with a builder or `team run` with multiple builders.
12. If the task is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
13. If using `single-session` and you will write code directly, first read builder guidance in this order, if present:
   - `~/.claude/crew/builder.md`
   - `.claude/crew/builder.md`
14. Use `assisted single-session` when one builder or a small number of bounded specialists can reduce uncertainty or produce independently reviewable tasks without becoming a coordinating team.
15. Only use a `team run` when ownership can be split cleanly across disjoint workstreams.
16. For substantial implementation work, decompose the run into bounded tasks with one owner each. Builder should own code-bearing tasks, including tests for changed behavior when practical.
17. If using multiple builders, ensure write scopes are disjoint before running them in parallel.
18. If using a `team run`, claim files only when parallel work might collide, and open approvals only when scope or ownership boundaries must be crossed.
19. If using a `team run`, assign bounded work to:
   - builder for implementation
   - reviewer for review
   - validator for behavior validation when the result can be exercised meaningfully
   - researcher for uncertainty reduction if needed
20. Keep ownership explicit and avoid same-file parallel editing.
21. Completed implementation tasks should go through reviewer review before they are treated as done. If review is skipped, say so explicitly and justify it before the final synthesis.
22. If the result has user-visible, system-visible, or externally observable behavior that can be exercised meaningfully, validator validation is the default at meaningful milestones or after integration.
23. If the work is already moving through a deployment boundary, recommend or enter `/crew:ship` instead of treating local implementation as the whole workflow.
24. When a helper or teammate hands work back, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
25. When a reviewer materially validates the work, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
26. When a validator materially validates the behavior, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
27. End with a clear synthesis for the user:
   - what changed
   - what was reviewed
   - what was validated
   - what tests were added or why they were omitted
   - risks or open questions
   - what happens next
   - exact local run and test instructions if the result is runnable
28. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
