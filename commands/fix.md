---
description: Preferred short entry point for investigating and fixing broken behavior in the current repo.
---

# Fix With The Lead Workflow

This is the preferred short entry point for bug work.

Use the same lead-owned workflow as `investigate-bug`:

1. verify the repo and read bounded wake-up context
2. frame the bug, expected behavior, and likely repro path
3. choose the execution shape that fits the work:
   - `single-session`
   - `assisted single-session`
   - `team run`
4. write a run brief for substantial work
5. investigate and implement the smallest credible fix
6. if code changed, independent review is required unless explicitly skipped with a reason
7. if the bug path or changed behavior can be exercised meaningfully, validation is expected unless explicitly skipped with a reason
8. write the matching artifacts and workflow badges as the run progresses
9. end with root cause, evidence, residual risk, and next recommended step

Follow the detailed workflow and command examples from `investigate-bug`.
