---
description: Compatibility alias for /engineering-os:init. Prefer the short command for new repos.
---

# Init Repo Compatibility Alias

Prefer `/engineering-os:init` for new usage.

Use this workflow when the user wants a fresh repository that starts with the harness already installed.

Goals:

- create a clean repo shape with minimal friction
- add the repo-local harness layer from day one
- avoid migration complexity that only exists in older repos
- leave repo-owned files easy to edit and easy to understand

Workflow:

1. Determine whether the repository already exists or needs to be created.
2. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" init --repo "$PWD" --allow-existing`
3. Create the repository structure if needed.
4. Create `CLAUDE.md` with repo-owned rules and framework imports.
5. Add initial `.claude/` files that make the harness usable immediately.
6. Set up artifact directories for observability.
7. If global Engineering OS memory is missing or stale, recommend `/engineering-os:install`.
8. Summarize what was created and how the user should start working.

Deliverable:

- a ready-to-use repo with the Engineering OS harness
- file references for the initial harness files
- next-step guidance for starting the first task
