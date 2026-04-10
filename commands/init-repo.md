---
description: Compatibility alias for /crew:init. Prefer the short command for new repos.
---

# Init Repo Compatibility Alias

Prefer `/crew:init` for new usage.

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
7. Inspect repo context that will matter later:
   - `README`
   - `.github/workflows/`
   - Docker / compose / infra files
   - obvious runtime or service entrypoints
8. If the repo already reveals useful deployment clues, write initial deployment guidance:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" discover-deployment --repo "$PWD"`
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-deployment-guidance --repo "$PWD" --title "<short title>" --discovery-status repo-derived ...`
9. If deployment is only partly clear, record the known build/deploy path and what still needs live verification instead of guessing.
10. If global Crew memory is missing or stale, recommend `/crew:install`.
11. Summarize what was created, what deployment memory was seeded, and how the user should start working.

Deliverable:

- a ready-to-use repo with the Crew harness
- file references for the initial harness files
- initial deployment guidance when discoverable
- next-step guidance for starting the first task
