---
description: Preferred short entry point for installing or updating the managed global framework memory.
---

# Install Global Crew Memory

This is the preferred short entry point for global setup.

Install or update the managed global Crew memory files directly.

1. install or update the one managed global framework memory copy under `~/.claude/engineering-os/`
2. ensure global `~/.claude/CLAUDE.md` imports that managed memory
3. run:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" install-global`
4. report:
   - which files changed
   - whether global memory is installed
   - the installed global memory version
   - whether the user should run `/reload-plugins`
5. end with a short welcome message:
   - congratulate the user on the excellent life choice of installing Crew
   - keep it brief and slightly tongue-in-cheek
   - remind them of the next useful commands: `/crew:init`, `/crew:adopt`, and `/crew:brief-me`

Do not delegate this to another command name or skill reference. `/crew:install` is the primary user-facing command.
