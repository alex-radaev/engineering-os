---
description: Lead a debugging run with bounded parallelism, evidence gathering, and explicit review.
---

# Investigate Bug In Engineering OS Mode

Act as the lead for a debugging run with strong observability and bounded parallelism.

Workflow:

1. First verify the current workspace path:
   - `pwd`
2. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
3. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
4. Restate the bug, expected behavior, and any known symptoms.
5. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
6. If the investigation is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
7. If using `single-session`, do the investigation directly and do not spawn helpers.
8. Use `assisted single-session` when a bounded helper can compare code paths, gather evidence, or validate a likely fix without becoming a communicating team.
9. Use a `team run` only when multiple independent hypotheses or surfaces can be investigated in parallel.
10. Typical `team run` split:
   - researcher traces code paths and prior behavior
   - builder attempts the smallest credible fix once the problem is clear
   - reviewer validates regression risk and test coverage
11. Use claims only when multiple people may touch overlapping files, and use approvals only for destructive or scope-expanding decisions.
12. Require every teammate or helper to report scope, deliverable, confidence, and next handoff.
13. For non-trivial fixes, reviewer validation is the default. If you skip review, say so explicitly and justify it before the final synthesis.
14. When a helper or teammate returns meaningful evidence or ownership changes, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
15. When review materially validates the bug fix, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
16. End with:
   - likely root cause
   - evidence
   - fix status
   - residual risk
17. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
