---
description: Design a feature or service before build.
---

# Design Mode

This is the preferred short entry point for the design phase.

Use it when the user wants to plan a feature or service — before code is written, before a build run starts. The output is a short, human-readable design doc artifact that the builder can implement from and the reviewer can review against.

Expected shape:

1. verify the current workspace path with `pwd`
2. read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
3. explicitly confirm the returned `repoPath` matches the current working directory before trusting the brief
4. if a recent design doc is already surfaced in the brief (`latestArtifacts.designDoc`), read it — decide whether this session is extending it or starting a fresh one
5. frame the design task with the user:
   - what the user wants built
   - rough scope tag: `greenfield`, `existing-feature`, or `small-change`
   - what is in and out of scope
   - who will use it and how
6. design top-down, in conversation with the user:
   - start from the main thing the feature or service does
   - break it into components, then sub-components
   - describe how they work together — prefer a small visual (ASCII or mermaid block) over paragraphs of prose
   - list main technical decisions with one-line justifications
   - list edge cases the feature must handle
   - list fail modes and what happens when each fails
   - define what "working properly" means — observable signals
   - define what "done" means — a checklist the user can confirm against
   - collect any open questions that still need answers
7. keep the detail proportional to the change:
   - greenfield → lighter, broader strokes, fewer decisions locked down
   - existing-feature → more detail on how it fits the current system
   - small-change → more specific, often a single component or contract
8. take the user's perspective: give them what they need to know to trust the design, no more

When the design is agreed, write the design doc artifact:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" design --repo "$PWD" --title "<short title>" --scope-tag <tag> --summary "<one-paragraph summary>" --mental-model "<plain-language model>" --components "<comma list>" --interactions "<how they work together, ascii/mermaid ok>" --decisions "<comma list of decision :: justification>" --edge-cases "<comma list>" --fail-modes "<comma list>" --working-means "<comma list>" --done-means "<comma list>" --open-questions "<comma list>" --visuals "<multi-line ok>" --next "<recommended next step>"`

Design should be treated as a phase, not a ritual:

- the design doc is a mental model, not a spec dump — prefer clarity over completeness
- prefer visuals over code snippets
- keep the doc human readable; anyone picking up the repo later should understand the feature from this doc alone
- when the design is done, the recommended next step is usually `/crew:build`

The builder and reviewer will find the design doc via the wake-up brief in their session, so do not duplicate the design doc inline in the next handoff — reference it by path.
