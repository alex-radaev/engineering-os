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
   - mark it as `repo-derived` unless live infrastructure has actually been checked
7. if the deployment picture is only partial, record what is known and what still needs live verification instead of guessing
8. recommend `/crew:install` if the managed global memory is missing or stale
9. end with a short welcome message:
   - congratulate the user on the suspiciously good choice of bringing this repo into Crew
   - keep it brief and slightly tongue-in-cheek
   - show the main commands to start with: `/crew:brief-me`, `/crew:build`, `/crew:fix`, and `/crew:ship`

Follow the detailed workflow and command examples from `bootstrap-repo`.
