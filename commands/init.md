---
description: Preferred short entry point for initializing a new repo with the workflow harness.
---

# Initialize A New Crew Repo In The Lead Workflow

This is the preferred short entry point for new repositories.

Use the same setup workflow as `init-repo`:

1. decide whether the repo already exists or needs to be created
2. run the init installer for the current repo path
3. create the minimal repo-local harness
4. create or improve `CLAUDE.md` conservatively
5. scan the repo for obvious runtime and deployment clues:
   - `README`
   - `.github/workflows/`
   - Docker / compose / infra files
6. if deployment clues are clear enough, write initial deployment guidance in `.claude/engineering-os/deployment.md`
   - mark it as `repo-derived` unless live infrastructure has actually been checked
7. if the deployment picture is only partial, record what is known and what still needs live verification instead of guessing
8. recommend `/crew:install` if the managed global memory is missing or stale
9. end with a short welcome message:
   - congratulate the user on the excellent decision to use Crew
   - keep it brief and slightly tongue-in-cheek
   - show the main commands to start with: `/crew:brief-me`, `/crew:build`, `/crew:fix`, and `/crew:ship`

Follow the detailed workflow and command examples from `init-repo`.
