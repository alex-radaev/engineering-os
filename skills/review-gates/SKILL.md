---
name: review-gates
description: Use before declaring implementation work done to separate task-compliance review from code-quality review and make approval criteria explicit.
---

# Review Gates

## Overview

The user trusts the "done" signal to mean work has been independently checked. Skipping from "code changed" to "done" without review means the user inherits unchecked risk.

Apply two gates whenever the task is substantial.

Default rule:

- substantial feature work should be reviewed — unreviewed code is a quality risk the user cannot easily undo
- non-trivial bug fixes should usually be reviewed
- if review is skipped, the lead should state that explicitly and explain why — silent skips erode the user's trust in the workflow

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

## Standards Checking

The user relies on the review result to know what was actually checked. Leaving standards checking implicit means the user cannot tell whether their configured review program was applied. The reviewer should say which standards and skills were actually applied.

## Escalation Rule

If the reviewer finds scope drift or a missing spec boundary, send the task back to the lead rather than silently repairing the assignment — silent repair removes the independent check the user depends on.
