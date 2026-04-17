---
description: Debug — inspect whether Crew is installed here.
---

# Audit Repo

Inspect whether Crew is already installed in this repo.

Steps:

1. Run the installer audit command:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" audit --repo "$PWD"`
2. Report whether the repo already has:
   - `CLAUDE.md`
   - `.claude/`
   - `.claude/settings.json`
   - `.claude/artifacts/crew/`
   - `.claude/state/crew/`
   - global Crew memory in `~/.claude/engineering-os/`
3. If the harness is incomplete, recommend either:
   - `/crew:adopt` for adoption into this repo
   - `/crew:init` for a fresh repo instead

Deliverable:

- a short state report
- the recommended next step
