---
description: Install or refresh the canonical Crew files under ~/.claude/crew.
---

# Install Crew User Assets

Use this workflow to create or refresh the canonical Crew files under `~/.claude/crew`. These files are managed by the plugin and shared across every repo.

Goals:

- write or refresh the canonical `constitution.md`, `workflow.md`, and `protocol.md`
- create optional role-overlay stubs (`lead.md`, `builder.md`, etc.) without clobbering user edits
- ensure `~/.claude/CLAUDE.md` imports the constitution so every session picks it up

Workflow:

1. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" install-user-assets`
2. Treat the installer output as canonical. `constitution.md`, `workflow.md`, and `protocol.md` are refreshed on every run; role overlays are only seeded when missing.
3. Do not hand-edit the three canonical files — they will be overwritten next install. Put personal additions in the role overlay files instead.
4. Confirm that `~/.claude/CLAUDE.md` contains the Crew import block so every session loads the constitution.
5. Summarize which files were written and which overlays already existed.

Deliverable:

- a managed `~/.claude/crew/` directory with canonical files refreshed and role overlay stubs preserved
- a short explanation of which files are canonical (plugin-owned) vs which are personal overlays (user-owned)
