---
name: using-engineering-os
description: Use at the start of real software work to choose the right mode, define pace, enforce ownership boundaries, and keep handoffs inspectable.
---

# Using Engineering OS

## Overview

Use this skill when the user wants help building, debugging, reviewing, or coordinating real code work.

The goal is not maximum autonomy. The goal is legible teamwork the human can actually follow.

## Core Rules

1. Decide whether the task should stay `single-session`, become `assisted single-session`, or become a `team run`.
2. `single-session` means one agent does the work directly.
3. `assisted single-session` means the lead remains primary and may spin up bounded helpers, but they do not operate as a communicating team.
4. `team run` means ownership is split across multiple coordinated agents.
5. Keep one owner per task.
6. Require explicit deliverables and completion reports.
7. Match the pace to the user's desired level of oversight.

## Modes

### Single-session

Use when:

- the task is small
- the next step is obvious
- parallelism would add coordination overhead

### Assisted Single-Session

Use when:

- the lead should stay primary
- a bounded helper can reduce uncertainty or validate work
- helper output matters more than helper-to-helper coordination

### Team run

Use when:

- implementation, review, and research can proceed in parallel
- ownership can stay bounded
- the user benefits from stronger observability

## Required Framing

Before substantial work:

1. Verify the current workspace path:
   - `pwd`
2. Read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
3. Explicitly confirm the returned `repoPath` matches the current working directory.
4. If the paths do not match, stop and call out the repo-context problem before using the brief.
5. Then state:

- active objective
- chosen mode
- pace: slow, medium, or fast
- what is in scope
- what is out of scope

## Team Protocol

Every teammate must start with:

- what I own
- what I will not change
- what I need from others, if anything
- what I will deliver

Every teammate must end with:

- what changed or what was found
- confidence level
- risks or open questions
- suggested next handoff

For `assisted single-session`, make it explicit that:

- the lead remains the only primary owner of the run
- helpers are bounded and subordinate
- no helper-to-helper coordination is expected

## Artifact Habit

When the work is substantial, create or update inspectable artifacts under:

- `.claude/artifacts/engineering-os/`

Good artifact types:

- run brief
- task handoff
- review result
- final synthesis

Use the Engineering OS CLI for this instead of inventing ad hoc files:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-run-brief --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-handoff --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-review-result --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-final-synthesis --repo "$PWD" ...`

Default behavior:

- write a run brief for substantial feature or bug runs
- write a handoff when ownership changes or a teammate completes bounded work
- write a review result when a reviewer materially validates the work
- write a final synthesis at the end of substantial work

## Red Flags

Stop and re-scope if:

- two agents need the same file
- the task boundary becomes fuzzy
- the work needs a broader refactor than assigned
- a teammate cannot explain ownership clearly
