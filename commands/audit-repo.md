---
description: Internal setup/debug command to inspect whether the Engineering OS harness is already present.
---

# Audit Repo For Engineering OS

Use this workflow before bootstrapping when you want to understand the current repo state.

Workflow:

1. Run the installer audit command:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" audit --repo "$PWD"`
2. Report whether the repo already has:
   - `CLAUDE.md`
   - `.claude/`
   - `.claude/settings.json`
   - `.claude/artifacts/engineering-os/`
   - `.claude/state/engineering-os/`
   - global Engineering OS memory in `~/.claude/engineering-os/`
3. If the harness is incomplete, recommend either:
   - `/bootstrap-repo` for adoption into this repo
   - `/init-repo` for a fresh repo instead

Deliverable:

- a short state report
- the recommended next step
