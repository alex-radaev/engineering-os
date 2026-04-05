---
description: Claim repo files for the current Engineering OS run so ownership stays visible and conflicts are caught early.
argument-hint: <path> [more paths]
---

# Claim Files For Engineering OS

Use this when you want to reserve specific files for the current run before editing them.

Workflow:

1. Run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" claim --repo "$PWD" $ARGUMENTS`
2. Treat successful claims as the current owned scope.
3. If a conflict is reported, do not edit those files until ownership is clarified.
4. Summarize:
   - newly claimed files
   - already-owned files
   - conflicts, if any

Deliverable:

- a short ownership update for the user or lead
