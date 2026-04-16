---
name: review-gates
description: Use before declaring implementation work done to separate task-compliance review from code-quality review and make approval criteria explicit.
---

# Review Gates

## Overview

Implementation work should not go straight from "code changed" to "done".

Apply two gates whenever the task is substantial.

Default rule:

- substantial feature work should be reviewed
- non-trivial bug fixes should usually be reviewed
- if review is skipped, the lead should state that explicitly and explain why

## Gate 1: Task Compliance

Check:

- was the assigned objective actually completed
- did the work stay inside scope
- were required files or deliverables produced
- are open questions clearly called out

## Gate 2: Code Quality And Regression Risk

Check:

- correctness
- regression risk
- test coverage or verification quality
- obvious maintainability problems introduced by the change

## Review Outcomes

Use exactly one:

- approved
- approved_with_notes
- rejected

## Required Review Output

Include:

- evidence checked
- failures or risks found
- whether the task should advance
- required follow-up if rejected

When the review is substantial, persist it with:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`

## Escalation Rule

If the reviewer finds scope drift or a missing spec boundary, send the task back to the lead rather than silently repairing the assignment.
