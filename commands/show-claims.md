---
description: Show current repo-local file claims for the Engineering OS workflow.
---

# Show Engineering OS Claims

Use this to inspect current claimed ownership before assigning or editing work.

Workflow:

1. Run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" show-claims --repo "$PWD"`
2. Report the current claims in a compact form:
   - file path
   - owner
   - created time

Deliverable:

- a short claims table or summary
