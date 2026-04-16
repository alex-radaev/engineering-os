---
description: Lead a debugging run with bounded parallelism, evidence gathering, and explicit review.
---

# Investigate Bug In Crew Mode

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
8. Restate the bug, expected behavior, known symptoms, and current scope boundary.
9. Choose the likely pace: `slow`, `medium`, or `fast`.
10. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded investigation and fix tasks.
11. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
    Treat `single-session` as acceptable only for tiny, tightly scoped fixes. For substantial bug work, prefer `assisted single-session` or `team run`.
12. If the investigation is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
13. If using `single-session` and you will write code directly, first read builder guidance in this order, if present:
   - `~/.claude/crew/builder.md`
   - `.claude/crew/builder.md`
14. Use `assisted single-session` when a bounded helper can compare code paths, gather evidence, implement a fix, or validate a likely result without becoming a coordinating team.
15. Use a `team run` only when multiple independent hypotheses or implementation slices can be investigated in parallel.
16. For substantial bug work, decompose into bounded tasks. Researcher should own tracing tasks, builder should own fix tasks, and builder should add or update tests for changed behavior when practical.
17. Typical `team run` split:
   - researcher traces code paths and prior behavior
   - builder attempts the smallest credible fix once the problem is clear
   - reviewer validates regression risk and test coverage
   - validator reruns the bug path and confirms the expected behavior
18. If using multiple builders, ensure write scopes are disjoint before running them in parallel.
19. Use claims only when multiple people may touch overlapping files, and use approvals only for destructive or scope-expanding decisions.
20. Completed fix tasks should go through independent review before they are treated as done. If review is skipped, say so explicitly and justify it before the final synthesis.
21. If the bug has a reproducible path or behavior that can be checked meaningfully, validator validation is the default at meaningful milestones or after integration.
22. If the work is blocked on a deployment boundary or environment-specific evidence, recommend or enter `/crew:ship`.
23. When a helper or teammate returns meaningful evidence or ownership changes, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
24. When review materially validates the bug fix, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
25. When validator evidence materially validates the fix, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
26. End with:
   - likely root cause
   - evidence
   - fix status
   - what tests were added or why they were omitted
   - residual risk
   - exact local repro and verification steps if the bug can be exercised locally
27. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
