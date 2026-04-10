---
description: Preferred short entry point for building or extending capability in the current repo.
---

# Build With The Lead Workflow

This is the preferred short entry point for feature work.

Use the same lead-owned workflow as `build-feature`:

1. verify the current workspace path with `pwd`
2. read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
3. explicitly confirm the returned `repoPath` matches the current working directory before trusting the brief
   - for substantial work, do not start implementation until this step is complete
4. frame the task clearly:
   - what the user wants
   - what is in scope
   - what is out of scope
   - what repo or external context matters
   - what the first bounded work chunk is
5. choose the execution shape that fits the work:
   - `single-session`
   - `assisted single-session`
   - `team run`
6. write a run brief for substantial work
   - treat deployable or production-code changes as substantial by default
   - use "substantial" mainly to decide run-brief and fuller artifact weight, not whether review is required
7. implement directly or through bounded sub-tasks
8. if code changed, do not stop at implementation or tests:
   - mark `review_required`
   - run independent review unless an unusual skip is explicitly justified and recorded
   - write the review result artifact when review completes
9. if behavior can be exercised meaningfully, validation is expected after review unless explicitly skipped with a reason
10. write the matching artifacts and workflow badges as the run progresses
11. do not end with only “tests pass” or “ready to commit”
12. end with a clear synthesis and a concrete next recommended step

Before you declare the work done, explicitly check:

- did code change?
- if yes, is review resolved or explicitly skipped?
- did behavior change?
- if yes, is validation resolved or explicitly skipped?
- did the run leave the artifact trail it should?
- what is the next responsible step?

Follow the detailed workflow and command examples from `build-feature`.
