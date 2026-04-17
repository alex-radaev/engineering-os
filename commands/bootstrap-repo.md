---
description: Bootstrap Crew into this repo conservatively.
---

# Bootstrap This Repo For Crew

Prepare the current repository for the Crew workflow.

Goals:

- inspect existing Claude Code files before writing anything
- preserve repo-owned instructions and conventions
- create only the smallest framework-specific additions
- make the result easy to inspect and easy to remove

Workflow:

1. Confirm the canonical Crew files exist globally. If `~/.claude/crew/constitution.md` is missing, run `/crew:install` first.
2. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" bootstrap --repo "$PWD"`
3. Treat the installer output as canonical for the Crew repo footprint. Do not manually add extra Crew imports to `CLAUDE.md`.
4. Inspect `CLAUDE.md`, `.claude/`, `.mcp.json`, and other repo guidance only to confirm the installer integrated conservatively.
5. Note that the constitution, workflow, and protocol live at `~/.claude/crew/` — the bootstrap does not copy them into the repo. If the repo previously had stale copies under `.claude/crew/{constitution,workflow,protocol}.md`, the installer removes them.
6. Let the installer own the Crew `.gitignore` block instead of improvising one by hand.
7. Explain any assumptions before editing if the repo shape makes the bootstrap risky.

Deliverable:

- a short summary of what was added (and any stale canonical files removed)
- file references for all changes
- any follow-up needed to enable team mode or optional integrations
- no extra freehand Crew harness edits beyond the installer output unless clearly necessary
