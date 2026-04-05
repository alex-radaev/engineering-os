---
description: Read the current Engineering OS wake-up brief for this repo before substantial work.
---

# Read Engineering OS Wake-Up Brief

Use this at the start of substantial work, or after returning to a repo, so you reconstruct context from durable repo memory instead of guessing.

Workflow:

1. First verify the current workspace path:
   - `pwd`
2. Then run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
3. Explicitly compare the returned `repoPath` with the current working directory.
4. If they do not match, stop and treat the wake-up brief as invalid for this run.
5. Only if they match, summarize:
   - latest run memory
   - open approvals
   - active claims
   - anything that looks stale, blocked, or currently active
6. Use that to decide whether work should stay single-session, become assisted single-session, or become a team run.
