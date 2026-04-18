---
name: writing-task-handoffs
description: Use when delegating or concluding substantial work so tasks, ownership, risks, and next steps are explicit and easy to inspect.
---

# Writing Task Handoffs

## Overview

Use this skill whenever work passes between lead, builder, reviewer, researcher, or the user.

Without a clean handoff, the next agent (or the user) starts blind — they waste time rediscovering context that was already known. The handoff should be good enough that a new teammate can continue without guessing.

## Handoff Template

Include:

- objective
- owner
- allowed scope
- forbidden scope
- deliverable
- files — paths the specialist should read or modify (required for substantive tasks)
- call_sites — where affected logic is invoked, if applicable
- design_notes — decisions, edge cases, and constraints the lead has already identified
- evidence or changed files
- confidence level
- risks or open questions
- suggested next handoff

The lead is responsible for populating `files`, `call_sites`, and `design_notes` via its own built-in exploration (Explore/Plan subagents). Specialists cannot delegate exploration, so a thin handoff forces them to grep from scratch inside their own context budget.

## Quality Bar

A good handoff is:

- bounded
- specific
- inspectable
- honest about uncertainty

## Bad Handoffs

These waste the user's time by forcing the next agent to re-discover what should have been recorded:

- vague claims like "done" or "fixed"
- missing file or module boundaries
- missing `files` — specialist is forced to grep from scratch, wasting their context budget
- missing `call_sites` when the change is cross-cutting — specialist cannot see where the affected logic is invoked
- missing `design_notes` — specialist has to rediscover decisions, edge cases, and constraints the lead already knew
- no confidence statement
- no next step

## Artifact Location

When persisting a handoff, prefer:

- `.claude/artifacts/crew/handoffs/`

Preferred command:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
