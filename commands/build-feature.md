---
description: Build or extend a capability.
---

# Build Feature In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. If the prompt begins with `ORCHESTRATOR_MISSION`, parse it per `workflow.md § Mission Envelope` before restating goal/scope. Record `mission_id` and reporting paths in the run brief.
1a. If the envelope is present, call the mission writers (see `workflow.md § Mission Reporting`):
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" record-mission --repo "$PWD" --prompt-file <path-to-envelope-dump>` (or `--envelope-json`).
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" append-mission-event --repo "$PWD" --mission-id <id> --event started --phase implementation --summary "<goal>"`.
    Skip both calls when no envelope is present.
2. Read custom lead guidance in this order, if present:
   - `~/.claude/crew/lead.md`
   - `.claude/crew/lead.md`
3. If a repo-local `.claude/crew/lead.md` exists and conflicts with global guidance, prefer it for this run.
4. First verify the current workspace path:
   - `pwd`
5. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
6. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
7. Restate the feature goal plus what is in scope and out of scope.
8. Choose the likely pace: `slow`, `medium`, or `fast`.
9. Decide whether the work is tiny enough for direct lead execution or should be decomposed into bounded implementation tasks.
10. Choose mode (`single-session`, `assisted single-session`, or `team run`) per the workflow Mode Guidance. For substantial implementation, prefer `assisted single-session` with a builder or `team run` with multiple builders.
11. If the task is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
12. If using `single-session` and you will write code directly, first read builder guidance per the protocol's Custom Instructions Lookup section (role name: `builder`).
13. For substantial implementation work, decompose the run into bounded tasks with one owner each. Builder owns code-bearing tasks per the constitution's test-as-default rule.
    - Before dispatching a specialist on a substantive task, pre-scope: use Explore or Plan subagents as needed to identify relevant files and call sites. Pass these plus design notes explicitly in the specialist's handoff (`files`, `call_sites`, `design_notes`). Thin handoffs (missing files or call_sites) force specialists to freelance exploration in their own context window, which the platform does not let them offload.
    - Set a `size` on each handoff: use `size: light` for trivial tasks (one-line fixes, typo corrections, variable renames) — light-close skips the artifact write but keeps the structured completion message. Use `size: standard` (default) for anything substantive.
14. If this run was driven by a design doc (from `/crew:design` or user-referenced), pass the design doc path to both the builder and the reviewer in their handoffs so they work from the same spec — the explicit path is how specialists link work to a design. If there is no design doc, say "no design doc" explicitly so specialists know no conformance check applies.
15. If using multiple builders, ensure write scopes are disjoint before running them in parallel.
16. If using a `team run`, claim files only when parallel work might collide, and open approvals only when scope or ownership boundaries must be crossed. Assign bounded work to:
   - builder for implementation
   - reviewer for review
   - validator for behavior validation when the result can be exercised meaningfully
   - researcher for uncertainty reduction if needed
17. Keep ownership explicit and avoid same-file parallel editing.
18. Apply gate defaults (see workflow Gate Defaults). If a gate is skipped, say so explicitly and justify it before the final synthesis.
19. If the work is already moving through a deployment boundary, recommend or enter `/crew:ship` instead of treating local implementation as the whole workflow.
20. When a specialist's completion or progress update contains a `help_request`, acknowledge it explicitly and decide: approve (spawn the requested helper scoped to the question; if the harness runs teammates, introduce the helper by name to the requester so they can coordinate peer-to-peer) or deny (with a concrete reason). Default bias is approve for bounded requests — denying silently or defaulting to "figure it out yourself" reproduces the exact failure mode this field exists to fix. Cap concurrent helpers at 2 per the workflow's Helper Teardown section.
21. When a specialist emits `helpers_done` in a progress update or completion, tear down the named helpers. Additionally, run a roster check every 3 specialist events or at major milestones (design complete, implementation complete, review complete); shut down any helper with no recent cross-messages and no requester using it.
22. When a helper or teammate hands work back, write a handoff artifact if the run is substantial:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-handoff --repo "$PWD" --title "<short title>" ...`
   - If an envelope is active, fire `append-mission-event --event progress --phase implementation --summary "<what changed>"` before/after the transition.
23. When a reviewer materially validates the work, write a review artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-review-result --repo "$PWD" --title "<short title>" ...`
   - If an envelope is active, fire `append-mission-event --event gate --phase review --summary "<verdict>"` after the review verdict lands.
24. When a validator materially validates the behavior, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
   - If an envelope is active, fire `append-mission-event --event gate --phase validation --summary "<verdict>"` after the validation verdict lands.
24a. After review passes, check `.claude/crew/deployer.md` for `dev.stable: true`. If present AND all build-feature gates are green (review approved or approved_with_notes, unit + local-run validation passed, no open `help_request`), continue into the ship-dev flow in this same session — do not return to the user at review boundary. Run `/crew:ship dev` conceptually: deployer triggers the dev pipeline per the config's allow-list, validator runs the change-specific integration-validation script authored by the builder for this ticket (path taken from the builder's completion handoff, not from the deployer config). Evidence is persisted. If the builder's handoff names no validation script and the change is service-shaped, halt — that is a missing deliverable per `~/.claude/crew/validation-principles.md`, not an optional skip. If `dev.stable` is absent or false, stop at review and recommend `/crew:ship dev` as the next step. If any gate fails during the auto-continue path, halt and surface the failure — stable means "default forward on green", not "skip gates".
25. Before final synthesis, confirm all helpers spawned during this run have been torn down. If any remain, tear them down now or surface a manual cleanup note to the user.
26. End with a clear synthesis for the user:
   - what changed
   - what was reviewed
   - what was validated — separately call out unit, local-run, and (if applicable) integration gates; do not collapse them under one "validated" word
   - what tests were added, or the exact reason they were deferred plus what coverage is still missing
   - risks or open questions
   - what happens next — for changes bound for a deployed environment, explicitly recommend `/crew:ship <env>` (typically `dev`) as the follow-up; for plugin-internal or doc-only changes, say "ship not applicable"
   - exact local run and test instructions if the result is runnable
27. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --run-steps "<step one,step two>" --external-deltas "<off-repo changes required, or 'none'>"`
   - When an envelope is active, also pass `--mission-terminal-status <done|partial|needs_user|blocked|abandoned> --proposed-task-status <candidate|ready|active|blocked|needs_review|done|parked|cancelled>` and optionally `--next-action "<text>"`. The CLI then writes mission status, appends a terminal event, and copies the synthesis to `reporting.handoff_file` in a single call. See `crew/workflow.md` § Terminal Synthesis.
   - Vanilla runs (no envelope) skip the mission flags — behavior is unchanged.
   - The CLI rejects missing `--external-deltas`. Enumerate sibling-config changes the PR depends on (env var renames in deploy manifests, terraform/helm updates, sibling-repo PRs, feature flags, DB migrations, IAM). Pass `--external-deltas none` explicitly if there are none. A silent default is how renamed env vars silently fall back to old defaults in prod.
