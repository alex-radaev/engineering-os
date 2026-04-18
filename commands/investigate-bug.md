---
description: Investigate and fix broken behavior.
---

# Investigate Bug In Crew Mode

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
6. Restate the bug, expected behavior, known symptoms, and current scope boundary.
7. Choose the likely pace: `slow`, `medium`, or `fast`.
8. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded investigation and fix tasks.
9. Choose mode (`single-session`, `assisted single-session`, or `team run`) per the workflow Mode Guidance. For substantial bug work, prefer `assisted single-session` or `team run`.
10. If the investigation is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
11. If using `single-session` and you will write code directly, first read builder guidance per the protocol's Custom Instructions Lookup section (role name: `builder`).
12. For substantial bug work, decompose into bounded tasks. Researcher owns tracing; builder owns fix tasks and tests for the bug path per the constitution's test-as-default rule.
    - Before dispatching a specialist on a substantive task, pre-scope: use Explore or Plan subagents as needed to identify relevant files and call sites. Pass these plus design notes explicitly in the specialist's handoff (`files`, `call_sites`, `design_notes`). Thin handoffs (missing files or call_sites) force specialists to freelance exploration in their own context window, which the platform does not let them offload.
13. If the affected feature was built from a design doc (check run memory, not `designs/`), pass the design doc path to the builder and reviewer in their handoffs so the fix aligns with the original spec. If there is no relevant design doc, say "no design doc" explicitly — stale docs under `designs/` would mislead a specialist if it went looking.
14. Typical `team run` split:
   - researcher traces code paths and prior behavior
   - builder attempts the smallest credible fix once the problem is clear
   - reviewer validates regression risk and test coverage
   - validator reruns the bug path and confirms the expected behavior
15. If using multiple builders, ensure write scopes are disjoint before running them in parallel. Use claims only when multiple people may touch overlapping files, and approvals only for destructive or scope-expanding decisions.
16. Apply gate defaults (see workflow Gate Defaults). If a gate is skipped, say so explicitly and justify it before the final synthesis.
17. If the work is blocked on a deployment boundary or environment-specific evidence, recommend or enter `/crew:ship`.
18. When a helper or teammate returns meaningful evidence or ownership changes, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
19. When review materially validates the bug fix, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
20. When validator evidence materially validates the fix, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
21. End with:
   - likely root cause
   - evidence
   - fix status
   - what tests were added, or the exact reason they were deferred plus what regression coverage is still missing
   - residual risk
   - exact local repro and verification steps if the bug can be exercised locally
22. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --run-steps "<repro step,verification step>"`
