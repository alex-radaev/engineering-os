---
description: Install or refresh personal Crew overlay under ~/.claude/crew.
---

# Install Crew User Assets

Use this workflow to create or refresh the managed personal Crew overlay directory under `~/.claude/crew`.

Goals:

- create the optional global overlay files that Crew already knows how to read
- keep those files short, repo-agnostic, and additive
- avoid copying repo-local harness files into user-global state

Workflow:

1. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" install-user-assets`
2. Treat the installer output as canonical for the managed global Crew files.
3. Do not copy repo-local `constitution.md`, `workflow.md`, or `protocol.md` into `~/.claude/crew/` by hand.
4. If a legacy `~/.claude/engineering-os/` directory exists, mention that it was detected and should be reviewed manually before reuse.
5. Summarize exactly which overlay files were created and what they are for.

Deliverable:

- a managed `~/.claude/crew/` directory with optional global overlay stubs
- a short explanation of when to edit those files and when to keep guidance repo-local
