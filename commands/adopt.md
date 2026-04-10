---
description: Preferred short entry point for adopting an existing repo into the workflow.
---

# Adopt This Repo For Crew

This is the preferred short entry point for existing repositories.

Use the same conservative bootstrap workflow as `bootstrap-repo`:

1. run the bootstrap installer for the current repo
2. preserve repo-owned guidance and improve it conservatively
3. keep framework-owned behavior isolated from repo-owned behavior
4. add only the repo-local harness pieces that are actually useful
5. scan the repo for obvious runtime and deployment clues:
   - `README`
   - `.github/workflows/`
   - Docker / compose / infra files
6. if deployment clues are clear enough, write initial deployment guidance in `.claude/engineering-os/deployment.md`
7. if the deployment picture is only partial, record what is known and what still needs verification instead of guessing
8. recommend `/crew:install` if the managed global memory is missing or stale

Follow the detailed workflow and command examples from `bootstrap-repo`.
