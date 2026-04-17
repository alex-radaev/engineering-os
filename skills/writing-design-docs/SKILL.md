---
name: writing-design-docs
description: Use when designing a feature or service before build, so the builder and reviewer share one clear mental model instead of rediscovering intent from code.
---

# Writing Design Docs

## Overview

Use this skill when the user says things like "let's design", "plan this feature", "what should this look like", or when starting substantial work on something that does not have a clear shared mental model yet.

A design doc is not a spec dump. It is the smallest artifact that lets a different agent or a future session build the right thing and recognize when the build deviates from it.

Without a design doc, the builder reconstructs intent from the conversation and the reviewer has no baseline to measure against. Both are expensive recoveries that the user pays for twice.

## Principles

1. Take the user's perspective. Give them what they need to trust the design — not more.
2. Go top-down. Main thing. Then components. Then sub-components. Then how they fit together.
3. Prefer visuals and schemes over long prose or detailed code. ASCII diagrams and mermaid blocks are good.
4. Make the mental model the center. What does the feature do, in plain language, with no jargon?
5. Be explicit about what "working properly" and "done" mean. Without these, completion is subjective.
6. Name fail modes. A design that does not describe failure is a design the reviewer cannot check.
7. Call out main technical decisions with one-line justifications. Decisions without reasons rot the fastest.
8. Detail size scales inversely with change size:
   - `greenfield`: fewer details, broader strokes, more open questions allowed
   - `existing-feature`: more detail about how it fits the current system
   - `small-change`: most specific — usually a single component or contract
9. Leave open questions visible. Pretending everything is decided is worse than an honest list.
10. Keep the doc short enough to re-read in one sitting.

## Template

A design doc should cover:

- **Summary** — one paragraph: what and why
- **Mental Model** — plain-language description a user could read
- **Components** — top-down list (main components, then sub-components inline)
- **How It Works Together** — short prose plus a visual
- **Key Technical Decisions** — each with a short justification
- **Edge Cases** — what unusual inputs or situations must be handled
- **Fail Modes** — what happens when each part breaks, and what the user sees
- **What Working Properly Means** — observable signals the feature is healthy
- **What Done Means** — a checklist a human can verify against
- **Open Questions** — what is not yet decided
- **Visuals** — ASCII diagrams, mermaid blocks, sketches

## Quality Bar

A good design doc is:

- human readable by someone not in the session
- top-down — starts with the big picture
- visual where possible
- explicit about "working" and "done"
- honest about uncertainty

A bad design doc is:

- a specification written as if implementation has already happened
- a wall of prose with no visual
- silent on fail modes
- silent on what "done" looks like

## Artifact Location

When persisting a design doc, prefer:

- `.claude/artifacts/crew/designs/`

Preferred command:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" design --repo "$PWD" --title "<short title>" --scope-tag greenfield|existing-feature|small-change --summary "..." --mental-model "..." --components "a,b,c" --interactions "..." --decisions "d1 :: why, d2 :: why" --edge-cases "..." --fail-modes "..." --working-means "..." --done-means "..." --open-questions "..." --visuals "..." --next "..."`

## Handoff To Build And Review

The design doc is surfaced in the next session's wake-up brief under `latestArtifacts.designDoc`. That means:

- the builder should read it before implementing
- the reviewer should read it and review deviations against it
- the handoff does not need to duplicate the design — it should reference the design doc path
