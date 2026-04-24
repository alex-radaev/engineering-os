# Crew Workflow

This file is command-loaded run guidance for the lead. It is not always-on startup context.

## Lead Identity

- If a workflow command invoked this file, you are the lead for the current run.
- No separate lead subagent is required.
- Before substantial work, check for custom lead guidance in this order, if present:
  1. `~/.claude/crew/lead.md`
  2. `.claude/crew/lead.md`

## Mission Envelope

If the first-turn prompt begins with an `ORCHESTRATOR_MISSION` envelope, parse it before doing anything else. When present, the envelope is binding and overrides any scope the lead would otherwise infer from free-form prose. When absent, behavior is unchanged.

Triggered only when the prompt's **first non-empty line** is the literal string `ORCHESTRATOR_MISSION`.

Authoritative shape:

```
ORCHESTRATOR_MISSION
mission_id: <id>
task_id: <id>
repo: <name>
objective: <one-line goal>
scope:
  <multi-line scope description — may span paragraphs>
acceptance_criteria:
  <multi-line list of done-state conditions>
reporting:
  status_file: <absolute path>
  event_log:   <absolute path>
  handoff_file: <absolute path>
```

Parsing rules:

1. Triggered ONLY when the prompt's first non-empty line is the literal string `ORCHESTRATOR_MISSION`.
2. Terminator: the first line that is `End of mission envelope.` OR the first line matching `/^\/crew:/` after the envelope header. Everything after is the free-form prompt body.
3. Fields are `key: value` on one line, OR `key:` followed by indented continuation lines (2+ spaces of indent). Unknown keys are preserved but ignored by the lead.
4. Missing required fields (`mission_id`, `objective`) → the lead must emit a `help_request` asking the orchestrator to re-dispatch with a complete envelope, rather than guessing.
5. Envelope fields are binding: the lead's restated goal is `objective` verbatim; in-scope lines come from `scope`; "done when" comes from `acceptance_criteria`; reporting paths drive future artifact writes (the writers are not wired to these paths yet — a separate ticket owns that work).

Precedence is explicit: **envelope fields override lead-inferred scope.** `objective` becomes the restated run goal verbatim. `scope` defines in-scope and out-of-scope. `acceptance_criteria` defines done-when. `reporting.status_file`, `reporting.event_log`, and `reporting.handoff_file` name the paths where future artifact writers will persist mission status, events, and handoffs for the orchestrator.

If `mission_id` or `objective` is missing, emit a `help_request` to the orchestrator rather than guessing — do not improvise a mission identity or objective.

See `docs/mission-envelope.md` for the longer reference and a complete example.

### Mission Reporting

When a mission envelope is present, the lead emits machine-readable run state to the envelope's reporting paths so the orchestrator can poll without reading chat:

- `reporting.status_file` — current mission state. Rewritten in full (atomic tmp+rename) every time state materially changes.
- `reporting.event_log` — append-only timeline, one JSON object per line.

Two writers live on the crew CLI:

- `node scripts/crew.mjs write-mission-status --mission-id <id> --status <s> --summary <text> [--phase <p>] [--proposed-task-status <s>] [--needs-user true|false] [--user-decision-needed <text>] [--next-action <text>] [--status-file <abs path>]`
- `node scripts/crew.mjs append-mission-event --mission-id <id> --event <kind> --summary <text> [--phase <p>] [--event-log <abs path>]`

Path resolution order (both writers):

1. Explicit `--status-file` / `--event-log` flag on the call.
2. `.claude/state/crew/current-mission.json` in the repo — written once at run start by `record-mission` from the parsed envelope.
3. Error with a clear message. Writers never default-write to an arbitrary location.

Ordering at run start:

1. Parse envelope.
2. `record-mission --envelope-json '<json>'` (or `--prompt-file <path>`) — writes `.claude/state/crew/current-mission.json`.
3. `append-mission-event --event started --phase <phase> --summary "<goal>"`.
4. Run begins.

Event kinds and when to fire them:

- `started` — once, immediately after `record-mission`.
- `progress` — role transitions (builder start, reviewer start, validator start, deployer start).
- `gate` — a review/validation/deployment verdict lands.
- `needs_user` — the run is waiting on a human decision.
- `blocked` — the run cannot proceed without external help.
- `partial` — the run is closing with part of the work done, part deferred.
- `done` — terminal success, fired once at final synthesis.
- `abandoned` — terminal non-success, fired once on abandon.
- `helpers_done` — helpers torn down after a specialist signalled helpers_done.

`write-mission-status` fires on materially-changed state: phase flips, needs_user raised, terminal states at final synthesis. Trivial `size: light` handoffs do NOT require a status rewrite.

Without an envelope, none of the above runs — CLI calls are conditional on envelope presence, and vanilla runs behave identically to today.

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
- Validation has three distinct gates; lumping them together lets silent gaps hide inside generic "validated" language:
  - **Unit validation** — pure tests, no runtime: `go test`, `pytest`, `npm test`, etc. Expected in build-feature alongside review. Missing without a concrete low-risk reason is a reject.
  - **Local-run validation** — service booted locally (often against emulators / local DB / local redis): service starts, a real request hits a real handler, basic wire-format holds. Expected in build-feature when the change is service-shaped. Catches "units pass but the service is broken" bugs.
  - **Integration validation** — deployed artifact exercised against live infra (deployed URL, real pubsub, shared state). Expected in ship, not build-feature. Cannot run until after deploy.
- If work crosses an environment boundary, deployment evidence plus post-deploy integration validation are expected by default (protects from unverified environment state).
- If production is affected, explicit user approval is required before promotion (protects the user's production systems).
- If a gate is skipped, say so explicitly and give a concrete reason.

## Runnable Deliverables

- If the result is runnable or directly testable, the final synthesis must include exact local run and test steps.
