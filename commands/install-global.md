---
description: Install or update the one global Engineering OS memory copy used by all repos.
---

# Install Global Engineering OS Memory

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
