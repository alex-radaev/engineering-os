---
description: Build or extend a capability.
---

# Build

Lead-owned workflow for feature work.

Steps:

1. verify the current workspace path with `pwd`
2. read the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
3. explicitly confirm the returned `repoPath` matches the current working directory before trusting the brief
   - for substantial work, do not start implementation until this step is complete
   - in an established same-repo session, do this quietly unless there is a mismatch or repo switch
4. frame the task clearly:
   - what the user wants
   - what is in scope
   - what is out of scope
   - what repo or external context matters
   - what the first bounded work chunk is
   - if this is a continuation of the current workstream, do not restate the whole framing block unless scope materially changed
5. choose the execution shape that fits the work:
   - `single-session`
   - `assisted single-session`
   - `team run`
6. write a run brief for substantial work
   - treat deployable or production-code changes as substantial by default
   - use "substantial" mainly to decide run-brief and fuller artifact weight, not whether review is required
7. implement directly or through bounded sub-tasks
8. if the work produced a substantial non-code deliverable, do not stop at implementation or a draft:
   - substantial non-code deliverables should normally be reviewed before being treated as done
9. if code changed, do not stop at implementation or tests:
   - mark `review_required`
   - run independent review unless an unusual skip is explicitly justified and recorded
   - write the review result artifact immediately when review completes, before moving on
10. if behavior can be exercised meaningfully, validation is expected after review unless explicitly skipped with a reason
11. write the matching artifacts and workflow badges as the run progresses, not batched at the end
12. do not end with only “tests pass” or “ready to commit”
13. end with a clear synthesis and a concrete next recommended step

Before you declare the work done, explicitly check:

- did code change?
- if yes, is review resolved or explicitly skipped?
- if no, did a substantial non-code deliverable still get an appropriate review or explicit skip?
- did behavior change?
- if yes, is validation resolved or explicitly skipped?
- did the run leave the artifact trail it should?
- what is the next responsible step?
