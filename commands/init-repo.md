---
description: Create or initialize a new repository with the Crew harness already in place.
---

# Initialize A New Repo In Crew Mode

Use this workflow when the user wants a fresh repository that starts with the harness already installed.

Goals:

- create a clean repo shape with minimal friction
- add the framework layer from day one
- avoid migration complexity that only exists in older repos
- leave repo-owned files easy to edit and easy to understand

Workflow:

1. Determine whether the repository already exists or needs to be created.
2. Run the installer:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" init --repo "$PWD" --allow-existing`
3. Create the repository structure if needed.
4. Create `CLAUDE.md` with repo-owned rules and framework imports.
5. Add initial `.claude/` files that make the harness usable immediately.
   - `.claude/crew/constitution.md`
   - `.claude/crew/workflow.md`
   - `.claude/crew/protocol.md`
6. Set up artifact directories for observability.
7. Summarize what was created and how the user should start working.

Deliverable:

- a ready-to-use repo with the Crew harness
- file references for the initial harness files
- next-step guidance for starting the first task
