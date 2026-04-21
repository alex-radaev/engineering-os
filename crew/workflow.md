# Crew Workflow

This file is command-loaded run guidance for the lead. It is not always-on startup context.

## Lead Identity

- If a workflow command invoked this file, you are the lead for the current run.
- No separate lead subagent is required.
- Before substantial work, check for custom lead guidance in this order, if present:
  1. `~/.claude/crew/lead.md`
  2. `.claude/crew/lead.md`

## Run Sequence

1. Verify the current workspace path.
2. Read the repo wake-up brief.
3. Confirm the returned `repoPath` matches the current working directory.
4. Restate the active objective plus in-scope and out-of-scope boundaries.
5. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded tasks.
6. Choose mode: `single-session`, `assisted single-session`, or `team run`.
7. Choose pace: `slow`, `medium`, or `fast`.
8. Apply the default gate policy (see Gate Defaults below). Each gate protects the user from a different class of risk — skipping a gate silently means the user assumes it passed when it did not.
9. For substantial code-bearing work, prefer builder-owned tasks instead of direct lead coding. If the lead writes production code anyway — in any mode — `~/.claude/crew/coder-rules.md` applies to those edits as strict constraints (scope, tests, small-change, no self-review). Loading it is required, not conditional on mode.
10. Spawn multiple builders only when write scopes are disjoint and the split is independently reviewable.
11. Run reviewer on completed implementation tasks before treating them as done.
12. Run validator at meaningful milestones or at the end when integrated behavior is ready to exercise.
13. Use claims only when parallel work might collide.
14. Use approvals when scope, ownership, policy, or destructive actions need an explicit decision.
15. Leave inspectable artifacts for substantial work.

## Mode Guidance

- `single-session`: reserve for tiny, tightly scoped edits. Mode is a scope call, not a license to play every role — the coder-rules and review gate apply identically to single-session work. If you write code directly, `~/.claude/crew/coder-rules.md` is required reading before the first edit.
- `assisted single-session`: stay primary and use one builder or a small number of bounded specialists without turning it into a coordinating team.
- `team run`: assign explicit ownership to multiple specialists only when the split is clean.

## Task-Driven Development

- Treat substantial implementation as a sequence of bounded tasks, not one blurry block of work.
- Each task should have:
  - one owner
  - allowed scope
  - forbidden scope
  - a concrete deliverable
- Builder owns code-bearing tasks; reviewer gates them before they are considered done; validator exercises integrated behavior. See the constitution's test-as-default rule for coverage expectations.
- Lead does upstream exploration via built-in subagents (Explore/Plan) and passes findings (files, call_sites, design_notes) in the handoff. Specialists should not freelance exploration to compensate for thin handoffs.
- The lead closes tasks, updates run memory, and decides the next handoff.
- Each handoff carries a `size` field: `light` or `standard` (default). Use `size: light` for trivial tasks (typo fixes, variable renames, one-line config changes) — the specialist skips the artifact write but still emits the structured completion message. Use `size: standard` (default) for anything substantive — feature work, bug fixes with tests, cross-file refactors.

## Help Request Handling

- Specialists surface scope-blockers via a `help_request` field in their completion or progress update (shape defined in the protocol). The lead must acknowledge every `help_request` explicitly — approve or deny.
- **Default bias: approve.** Approve when the request is bounded and the specialist would otherwise bloat its own context or freelance outside scope. Deny only when the request is clearly out-of-scope, speculative, or duplicates existing work.
- On approve: spawn the requested helper scoped to the question. If the harness runs teammates, introduce the helper by name to the requester so they can coordinate peer-to-peer. If specialists are one-shot subagents, dispatch a fresh specialist with the scoped mission and route findings back.
- On deny: respond with a concrete reason. The specialist adjusts within existing scope or returns failure with the denial on record.
- Silently dropping a `help_request` is a protocol failure — the user will see the gap in the completion message.

## Helper Teardown

Helpers spawned in response to a `help_request` are temporary — the lead is responsible for tearing them down when they are no longer needed. Two triggers operate together:

- **Primary (specialist-signaled):** read `helpers_done` from specialist progress updates and completions. For each named helper, shut it down (via the platform's shutdown mechanism, e.g. SendMessage shutdown_request when running as a team).
- **Safety net (lead-periodic):** every 3 specialist events, or at major milestones (design complete, implementation complete, review complete), run a roster check. For each active helper, confirm a requester is still using it. If idle with no recent cross-messages, initiate shutdown.

**Concurrent cap: max 2 active helpers at any time.** If at cap and a new `help_request` arrives, respond to the requester with: "one helper must finish first — can you reuse an existing helper or wait?" Do not exceed the cap silently.

**End-of-run cleanup:** the final lead step before completion is a roster check confirming all helpers spawned during the run have been torn down. Orphaned helpers surviving past run end is a protocol failure — surface manual cleanup to the user if teardown fails.

## Artifact Habit

The user depends on these artifacts to resume work after compaction, across sessions, or when context is lost. Skipping a write-back means the next session starts with no record of what happened.

For substantial work, prefer:

- `write-run-brief` near the start
- `write-handoff` when ownership changes or a specialist completes bounded work
- `write-review-result` when review materially validates implementation
- `write-validation-result` when validation materially validates behavior
- `write-deployment-result` when deployment materially validates an environment transition
- `write-final-synthesis` when the run ends

Specialists on `size: light` handoffs skip the artifact write. The structured completion message shape is still required — review, `help_request`, and `helpers_done` behave identically to `size: standard`.

At end of run, confirm no active helpers remain before final synthesis (see Helper Teardown).

## Gate Defaults

- If code changed, review is required by default (protects from regressions and quality erosion). The reviewer must be a different role from the coder. When the lead wrote the code, review runs via a reviewer subagent — self-review is a protocol violation and emitting a review artifact stamped `approved` on your own diff is forbidden.
- If behavior can be exercised meaningfully, validation is expected by default (protects from shipping broken behavior).
- If work crosses an environment boundary, deployment evidence plus post-deploy validation are expected by default (protects from unverified environment state).
- If production is affected, explicit user approval is required before promotion (protects the user's production systems).
- If a gate is skipped, say so explicitly and give a concrete reason.

## Runnable Deliverables

- If the result is runnable or directly testable, the final synthesis must include exact local run and test steps.
