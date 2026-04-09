---
description: Compatibility alias for /engineering-os:adopt. Prefer the short command for repo adoption.
---

# Bootstrap Repo Compatibility Alias

Prefer `/engineering-os:adopt` for new usage.

Prepare the current repository for the Engineering OS workflow.

Goals:

- inspect existing Claude Code files before writing anything
- preserve repo-owned instructions and conventions
- create only the smallest framework-specific additions
- keep framework constitution and workflow in the one global managed copy
- make the result easy to inspect and easy to remove

Workflow:

1. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" bootstrap --repo "$PWD"`
2. Inspect `CLAUDE.md`, `.claude/`, `.mcp.json`, and other repo guidance before making additional changes.
3. If `CLAUDE.md` does not exist, create it.
4. If `CLAUDE.md` already exists, improve it conservatively and prefer `@path` imports instead of rewriting large sections.
5. Add repo-local framework files only where useful:
   - `.claude/agents/`
   - `.claude/commands/`
   - `.claude/hooks/`
   - `.claude/settings.json`
6. Keep framework-owned instructions isolated from repo-owned instructions.
7. If the installer reports missing or stale global memory, recommend `/engineering-os:install`.
8. Explain any assumptions before editing if the repo shape makes the bootstrap risky.

Deliverable:

- a short summary of what was added
- file references for all changes
- any follow-up needed to enable team mode or optional integrations
