---
description: Conservatively prepare the current repository for the Crew workflow.
---

# Bootstrap This Repo For Crew

Prepare the current repository for the Crew workflow.

Goals:

- inspect existing Claude Code files before writing anything
- preserve repo-owned instructions and conventions
- create only the smallest framework-specific additions
- make the result easy to inspect and easy to remove

Workflow:

1. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" bootstrap --repo "$PWD"`
2. Treat the installer output as canonical for the Crew harness. Do not manually add extra Crew imports to `CLAUDE.md`.
3. Inspect `CLAUDE.md`, `.claude/`, `.mcp.json`, and other repo guidance only to confirm the installer integrated conservatively.
4. If repo-specific guidance needs follow-up, keep it separate from Crew-owned files and avoid rewriting generated workflow/protocol files.
5. Let the installer own the Crew `.gitignore` block instead of improvising one by hand.
6. Explain any assumptions before editing if the repo shape makes the bootstrap risky.

Deliverable:

- a short summary of what was added
- file references for all changes
- any follow-up needed to enable team mode or optional integrations
- no extra freehand Crew harness edits beyond the installer output unless clearly necessary
