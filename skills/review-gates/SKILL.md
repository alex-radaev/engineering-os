---
name: review-gates
description: Use before declaring implementation work done to separate task-compliance review from code-quality review and make approval criteria explicit.
---

# Review Gates

## Overview

Code-bearing work and substantial non-code design or planning work should not go straight from "deliverable produced" to "done".

Apply review gates before a code-bearing or substantial non-code deliverable is treated as complete.

Default rule:

- code-bearing deliverables require independent review
- substantial design, planning, or documentation deliverables should normally be reviewed before being called done
- if review is skipped, the lead should state that explicitly and explain why
- repo standards and language-specific standards should be part of the review by default when they exist

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

## Gate 3: Repo And Language Standards

Check:

- repo-specific standards from `CLAUDE.md` or repo reviewer instructions
- global reviewer standards when they apply
- any configured review skills or language-specific standards named in repo or global reviewer instructions when they are available and relevant

Do not leave this implicit. The reviewer should say which standards and skills were actually applied.

## Review Outcomes

Use exactly one:

- approved
- approved_with_notes
- rejected

## Required Review Output

Include:

- gates run
- repo standards checked
- configured review skills consulted
- evidence checked
- failures or risks found
- whether the task should advance
- required follow-up if rejected

When review materially completes, persist it with:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`

## Escalation Rule

If the reviewer finds scope drift or a missing spec boundary, send the task back to the lead rather than silently repairing the assignment.
