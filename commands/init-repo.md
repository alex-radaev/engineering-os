---
description: Initialize a new repo with Crew.
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
3. Treat the installer output as canonical for the Crew harness. Do not manually add extra Crew imports to `CLAUDE.md`.
4. Do not manually rewrite generated harness files unless the installer clearly failed or the user asked for a repo-specific change.
5. If repo-specific guidance is needed, add only repo-owned instructions and keep them separate from Crew-owned files.
6. Summarize exactly what the installer created or refreshed, including the canonical `.gitignore` Crew block if it was added.
7. Explain how the user should start working with the new repo.

Deliverable:

- a ready-to-use repo with the Crew harness
- file references for the initial harness files
- next-step guidance for starting the first task
- no extra freehand Crew harness edits beyond the installer output unless clearly necessary
