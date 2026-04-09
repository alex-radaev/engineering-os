---
description: Compatibility alias for /engineering-os:install. Prefer the short command for global setup.
---

# Install Global Compatibility Alias

Prefer `/engineering-os:install` for new usage.

Install or update the managed global Engineering OS memory files.

Use this after installing or updating the plugin when framework memory changes.

This command writes one global managed copy:

- `~/.claude/engineering-os/constitution.md`
- `~/.claude/engineering-os/workflow.md`
- `~/.claude/engineering-os/metadata.json`

It also ensures global `~/.claude/CLAUDE.md` imports the constitution and workflow.

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" install-global
```

Then report:

- which files changed
- whether global memory is installed
- the installed global memory version
- whether the user should run `/reload-plugins`
