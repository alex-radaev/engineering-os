---
description: Preferred short entry point for investigating and fixing broken behavior in the current repo.
---

# Fix With The Lead Workflow

This is the preferred short entry point for bug work.

Use the same lead-owned workflow as `investigate-bug`:

1. verify the current workspace path with `pwd`
2. read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
3. explicitly confirm the returned `repoPath` matches the current working directory before trusting the brief
   - for substantial work, do not start implementation until this step is complete
4. frame the bug, expected behavior, and likely repro path
5. identify the smallest credible work chunk that can investigate or fix the issue
6. choose the execution shape that fits the work:
   - `single-session`
   - `assisted single-session`
   - `team run`
7. write a run brief for substantial work
   - treat deployable or production-code fixes as substantial by default
   - use "substantial" mainly to decide run-brief and fuller artifact weight, not whether review is required
8. investigate and implement the smallest credible fix
9. if code changed, do not stop at implementation or tests:
   - mark `review_required`
   - run independent review unless an unusual skip is explicitly justified and recorded
   - write the review result artifact when review completes
10. if the bug path or changed behavior can be exercised meaningfully, validation is expected after review unless explicitly skipped with a reason
11. write the matching artifacts and workflow badges as the run progresses
12. do not end with only “tests pass” or “ready to commit”
13. end with root cause, evidence, residual risk, and a concrete next recommended step

Before you declare the fix done, explicitly check:

- did code change?
- if yes, is review resolved or explicitly skipped?
- did the bug path or changed behavior get exercised?
- if yes, is validation resolved or explicitly skipped?
- did the run leave the artifact trail it should?
- what is the next responsible step?

Follow the detailed workflow and command examples from `investigate-bug`.
