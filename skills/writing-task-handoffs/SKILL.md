---
name: writing-task-handoffs
description: Use when delegating or concluding substantial work so tasks, ownership, risks, and next steps are explicit and easy to inspect.
---

# Writing Task Handoffs

## Overview

Use this skill whenever work passes between lead, builder, reviewer, researcher, or the user.

The handoff should be good enough that a new teammate can continue without guessing.

## Handoff Template

Include:

- objective
- owner
- allowed scope
- forbidden scope
- deliverable
- evidence or changed files
- confidence level
- risks or open questions
- suggested next handoff

## Quality Bar

A good handoff is:

- bounded
- specific
- inspectable
- honest about uncertainty

## Bad Handoffs

Avoid:

- vague claims like "done" or "fixed"
- missing file or module boundaries
- no confidence statement
- no next step

## Artifact Location

When persisting a handoff, prefer:

- `.claude/artifacts/crew/handoffs/`

Preferred command:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
