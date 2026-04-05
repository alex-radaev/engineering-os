---
description: Show open or resolved Engineering OS approvals for this repo.
argument-hint: [open|resolved|all]
---

# Show Engineering OS Approvals

Use this to inspect which approval decisions are waiting and which have already been resolved.

Workflow:

1. Run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" show-approvals --repo "$PWD" --status "${ARGUMENTS:-open}"`
2. Summarize:
   - open approvals
   - who they are waiting on
   - any resolved approvals if requested

Deliverable:

- a short approval status summary
