---
description: Design a feature or service before build.
---

# Design Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this design run.

Use this when the user wants to plan a feature or service — before code is written, before `/crew:build` starts. The output is a short, human-readable design doc artifact that the builder can implement from and the reviewer can review against.

Workflow:

1. Read custom lead guidance in this order, if present:
   - `~/.claude/crew/lead.md`
   - `.claude/crew/lead.md`
2. Apply the `writing-design-docs` skill for the design structure and quality bar.
3. First verify the current workspace path:
   - `pwd`
4. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
6. If a recent design doc already exists under `.claude/artifacts/crew/designs/`, read it — decide whether this session is extending it or starting a fresh one.
7. Frame the design task with the user:
   - what the user wants built
   - rough scope tag: `greenfield`, `existing-feature`, or `small-change`
   - what is in and out of scope
   - who will use it and how
8. Design top-down, in conversation with the user:
    - start from the main thing the feature or service does
    - break it into components, then sub-components
    - describe how they work together — prefer a small visual (ASCII or mermaid block) over paragraphs of prose
    - list main technical decisions with one-line justifications
    - list edge cases the feature must handle
    - list fail modes and what happens when each fails
    - define what "working properly" means — observable signals
    - define what "done" means — a checklist the user can confirm against
    - collect any open questions that still need answers
9. Keep the detail proportional to the change:
    - `greenfield` → lighter, broader strokes, fewer decisions locked down
    - `existing-feature` → more detail on how it fits the current system
    - `small-change` → more specific, often a single component or contract
10. Take the user's perspective: give them what they need to know to trust the design, no more.

When the design is agreed, persist it:

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
