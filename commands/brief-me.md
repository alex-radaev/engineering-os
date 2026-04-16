---
description: Preferred first command for a fixed-structure situational report on the current repo.
---

# Brief Me

This is the preferred user-facing "where are we?" command.

Use it when the user wants a fast, structured briefing before continuing work.

Workflow:

1. verify the current workspace path with `pwd`
2. run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" brief-me --repo "$PWD"`
3. explicitly compare the returned `repoPath` with the current working directory
4. if they do not match, stop and treat the brief as invalid for this run
5. if they match, present the briefing in this fixed order:
   - `Current Objective`
   - `Recent Activity`
   - `In Progress`
   - `Blocked / Missing`
   - `Important Reminders`
   - `Recommended Next Step`
   - `Secondary Options`
6. keep the report concise, concrete, and evidence-backed
7. use the git activity, artifact trail, workflow state, and repo memory to produce one clear next-step recommendation
8. in `Recent Activity`, include the most relevant repo-memory starting points or retrieval hints, not just git or artifact counts

The point is not to dump raw JSON. The point is to give the user a calm, situational briefing with the most relevant status and one concrete recommendation.
