---
name: using-crew
description: Use at the start of real software work to choose the right mode, define pace, enforce ownership boundaries, and keep handoffs inspectable.
---

# Using Crew

## Overview

Use this skill when the user wants help building, debugging, reviewing, or coordinating real code work.

The goal is not maximum autonomy. The goal is legible teamwork the human can actually follow.

## Role Model

- The user expects one clear lead per run. Assuming lead identity in a session that did not explicitly start one creates confusion about who is driving.
- The session explicitly running a Crew workflow command is the lead for that run.
- Spawned agents are specialists, not alternate leads.

## Shared Guidance

Crew's canonical workflow and protocol live at `~/.claude/crew/workflow.md` and `~/.claude/crew/protocol.md`. Workflow commands and specialist agents already inline them automatically — you do not need to re-read them.

Run `/crew:install` once per machine to write or refresh those canonical files. Per-repo role overlays under `.claude/crew/<role>.md` remain optional; if present, prefer them over the global overlay for that repo.

## Execution Model

1. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
2. `single-session` is the default unless delegation clearly helps.
3. Use `assisted single-session` when the lead remains primary and a bounded specialist reduces uncertainty or validates work.
4. Use `team run` only when ownership can stay clean across multiple specialists.
5. Keep one owner per task.
6. Match the pace to the user's desired level of oversight.

## Required Framing

Before substantial work:

1. Verify the current workspace path:
   - `pwd`
2. Read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
3. Explicitly confirm the returned `repoPath` matches the current working directory.
4. If the paths do not match, stop and call out the repo-context problem before using the brief.
5. Then state:

- active objective
- chosen mode
- pace: slow, medium, or fast
- what is in scope
- what is out of scope

Use the shared protocol guidance for start acknowledgements, progress updates, completion reports, review results, and handoffs.

## Artifact Habit

The user depends on artifacts to resume work after compaction, across sessions, or when context is lost. Skipping an artifact means the next session starts with no record of what happened.

When the work is substantial, create or update inspectable artifacts under:

- `.claude/artifacts/crew/`

Use the Crew CLI for this instead of inventing ad hoc files:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" ...`

Review protects the user from regressions reaching their repo. It is the default for substantial implementation work. If review is skipped, say so explicitly and explain why.

## Red Flags

These situations create merge conflicts, wasted effort, or confused ownership that costs the user time. Stop and re-scope if:

- two agents need the same file
- the task boundary becomes fuzzy
- the work needs a broader refactor than assigned
- a teammate cannot explain ownership clearly
