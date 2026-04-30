---
description: Design a feature or service before build.
---

# Design Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this design run.

Use this when the user wants to plan a feature or service — before code is written, before `/crew:build` starts. The output is a short, human-readable design doc artifact that the builder can implement from and the reviewer can review against.

Workflow:

1. If the prompt begins with `ORCHESTRATOR_MISSION`, parse it per `workflow.md § Mission Envelope` before restating goal/scope. Record `mission_id` and reporting paths in the run brief.
1a. If the envelope is present, capture `mission_id`, `reporting.status_file`, `reporting.event_log`, and `reporting.handoff_file` from the parsed envelope. Pass them explicitly on every mission writer call below — there is no pointer-file fallback (see `workflow.md § Mission Reporting`). Then fire the start event:
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" append-mission-event --repo "$PWD" --mission-id <envelope.mission_id> --event-log <envelope.reporting.event_log> --event started --phase design --summary "<goal>"`.
    Skip when no envelope is present.
2. Read custom lead guidance per the protocol's Custom Instructions Lookup section (role name: `lead`).
3. Apply the `writing-design-docs` skill for the design structure and quality bar.
4. First verify the current workspace path:
   - `pwd`
5. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
6. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
7. If a recent design doc already exists under `.claude/artifacts/crew/designs/`, read it — decide whether this session is extending it or starting a fresh one.
8. Frame the design task with the user:
   - what the user wants built
   - rough scope tag: `greenfield`, `existing-feature`, or `small-change`
   - what is in and out of scope
   - who will use it and how
9. Design top-down, in conversation with the user:
    - start from the main thing the feature or service does
    - break it into components, then sub-components
    - describe how they work together — prefer a small visual (ASCII or mermaid block) over paragraphs of prose
    - list main technical decisions with one-line justifications
    - list edge cases the feature must handle
    - list fail modes and what happens when each fails
    - define what "working properly" means — observable signals
    - define what "done" means — a checklist the user can confirm against
    - collect any open questions that still need answers
10. Keep the detail proportional to the change:
    - `greenfield` → lighter, broader strokes, fewer decisions locked down
    - `existing-feature` → more detail on how it fits the current system
    - `small-change` → more specific, often a single component or contract
11. Take the user's perspective: give them what they need to know to trust the design, no more.

When the design is agreed, persist it:

Note: `/crew:design` terminates via `write-mission-status --phase design` (not `write-final-synthesis`), so the rule #9 review-gate enforcement at synthesis does not apply to a pure design run. If a design run is later promoted into implementation through `/crew:build-feature` or `/crew:fix`, the gate applies there.


0. If an envelope is active, before writing the final design artifacts:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-mission-status --repo "$PWD" --mission-id <envelope.mission_id> --status-file <envelope.reporting.status_file> --status <done|partial|needs_user|abandoned> --phase design --summary "<synthesis summary>" --proposed-task-status <task-status> [--next-action <text>] [--artifact-handoff <path>]`
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" append-mission-event --repo "$PWD" --mission-id <envelope.mission_id> --event-log <envelope.reporting.event_log> --event <done|partial|abandoned> --phase design --summary "<synthesis summary>"`.
   Skip both when no envelope is present.
1. Write the full design body to `.claude/artifacts/crew/designs/<short-slug>.md` using the template from the `writing-design-docs` skill.
2. Record a run brief so the design surfaces in the next wake-up:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "design: <short title>" --goal "<one-paragraph summary>" --mode "assisted single-session" --pace "<pace>"`
3. Reference the design doc path in any handoff instead of duplicating the design inline.

Design should be treated as a phase, not a ritual:

- the design doc is a mental model, not a spec dump — prefer clarity over completeness
- prefer visuals over code snippets
- keep the doc human readable; anyone picking up the repo later should understand the feature from this doc alone
- when the design is done, the recommended next step is usually `/crew:build-feature`

The builder and reviewer should read the design doc at the top of their run rather than expecting the handoff to duplicate it.
