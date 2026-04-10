---
name: using-engineering-os
description: Use at the start of real software work to infer workflow intent, choose an execution shape, and enforce retrieval, gate, and artifact discipline.
---

# Using Engineering OS

## Overview

Use this skill when the user wants help building, debugging, reviewing, or coordinating real code work.

The goal is not maximum autonomy. The goal is legible teamwork the human can actually follow.

## Core Rules

1. Infer whether the work is primarily `build`, `fix`, `review`, `validate`, or `ship`, even if the user does not use a command directly.
2. Decide whether the task should stay `single-session`, become `assisted single-session`, or become a `team run`.
3. `single-session` means one agent does the work directly.
4. `assisted single-session` means the lead remains primary and may spin up bounded helpers, but they do not operate as a communicating team.
5. `team run` means ownership is split across multiple coordinated agents.
6. Keep one owner per task.
7. Use predefined base agents as internal tools: builder, researcher, reviewer, validator, and deployer when available. Do not invent new role definitions casually.
8. Require explicit deliverables and completion reports.
9. If code changes, independent review is required by policy unless explicitly and unusually skipped with a recorded reason.
10. If behavior can be exercised meaningfully, validation is expected by policy after review unless explicitly and unusually skipped with a recorded reason.
11. For substantial work, retrieve bounded context before planning and write the expected artifacts as the run progresses.

## Default Gate Policy

- code changed -> independent review required
- runnable, observable, or user-visible behavior changed -> validation expected after review
- deployment or promotion work -> deployment checks and environment evidence required
- production promotion -> explicit user approval required
- skipped gates -> explicit reason plus workflow-state record

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
- what is in scope
- what is out of scope
- what the likely first bounded work chunk is

## Team Protocol

Every teammate must start with:

- what I own
- what I will not change
- what I need from others, if anything
- what I will deliver

Every teammate must end with:

- what changed or what was found
- evidence
- confidence level
- risks or open questions
- suggested next handoff

For `assisted single-session`, make it explicit that:

- the lead remains the only primary owner of the run
- helpers are bounded and subordinate
- no helper-to-helper coordination is expected

For code-bearing sub-tasks:

- they should be independently reviewable
- review should happen at the sub-task level where practical
- completion should not be treated as final until review is addressed

## Artifact Habit

When the work is substantial, create or update inspectable artifacts under:

- `.claude/artifacts/engineering-os/`

Good artifact types:

- run brief
- task handoff
- review result
- validation plan
- validation result
- deployment check
- final synthesis

Use the Engineering OS CLI for this instead of inventing ad hoc files:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-run-brief --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-handoff --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-review-result --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-deployment-check --repo "$PWD" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-final-synthesis --repo "$PWD" ...`

Default behavior:

- write a run brief for substantial feature or bug runs
- write a handoff when ownership changes or a teammate completes bounded work
- write a review result when a reviewer materially reviews the change
- write a validation plan when a substantial validation scenario should be preserved
- write a validation result when a validator materially exercises behavior
- write a deployment check when deployer evidence materially confirms a dev or prod transition
- write a final synthesis at the end of substantial work

Treat these writes as expected workflow steps, not optional note-taking.

When code-bearing work completes before review, record that gate in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge review_required`

When behavior should be validated after review, record that gate in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge validation_expected`

When deployment evidence is expected, record that gate in workflow state:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge dev_deploy_expected`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge prod_deploy_expected`

If review or validation is intentionally skipped, mark that explicitly with a note:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge review_skipped --note "<reason>"`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge validation_skipped --note "<reason>"`

If deployment evidence is intentionally skipped, mark that explicitly with a note:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge dev_skipped --note "<reason>"`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge prod_skipped --note "<reason>"`

Use workflow state to keep pending gates visible during the run and at wake-up.

## Red Flags

Stop and re-scope if:

- two agents need the same file
- the task boundary becomes fuzzy
- the work needs a broader refactor than assigned
- a teammate cannot explain ownership clearly
