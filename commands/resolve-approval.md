---
description: Resolve a pending Engineering OS approval request as approved, rejected, or canceled.
argument-hint: <approval-id>
---

# Resolve Engineering OS Approval

Use this after the lead or user has made a decision on a pending approval request.

Workflow:

1. Run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" resolve-approval --repo "$PWD" --id "$ARGUMENTS" --decision approved`
2. If the approval should be rejected or canceled instead, rerun with `--decision rejected` or `--decision canceled`.
3. Summarize:
   - approval id
   - decision
   - resolver
   - any follow-up work implied by the decision

Deliverable:

- a short approval resolution update
