---
description: Debug — inspect raw Crew wake-up brief.
---

# Read Crew Wake-Up Brief

@~/.claude/crew/workflow.md

Use this at the start of substantial work, or after returning to a repo, so you reconstruct context from durable repo memory instead of guessing.

Workflow:

1. If this wake-up begins a new Crew workflow run, treat the current session as the lead for that run.
2. First verify the current workspace path:
   - `pwd`
3. Sync remote state so the brief reflects reality, not stale local refs:
   - `git fetch --prune`
4. Then run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly compare the returned `repoPath` with the current working directory.
6. If they do not match, stop and treat the wake-up brief as invalid for this run.
7. Only if they match, summarize:
   - latest run memory
   - open approvals
   - active claims
   - anything that looks stale, blocked, or currently active
8. Use that to decide whether work should stay single-session, become assisted single-session, or become a team run.
