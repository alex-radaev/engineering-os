# Crew Protocol

This file defines the shared reporting shapes used by the lead and specialists.

## Custom Instructions Lookup

Before starting work, every role (lead and specialists) should check for personal then repo-local custom instructions for that role, in this order, if present:

1. `~/.claude/crew/<role>.md` (personal overlay across repos)
2. `.claude/crew/<role>.md` (repo-local overlay)

Precedence: repo-local overrides personal; assigned mission and core role boundaries override both.

## Start Acknowledgement

Every specialist should begin with:

- what I own
- what I will not change
- what I need from others, if anything
- what I will deliver

## Progress Update

Use when reporting mid-task:

- current status
- whether scope is still valid
- blocker, if any
- next expected handoff
- `helpers_done` entry, if a helper you requested is no longer needed (see Helpers Done below)

## Completion Report

Every specialist completion should include:

- what changed or what was found
- changed files or evidence checked
- whether tests were added or updated, or the exact deferral reason plus the missing coverage if they were skipped
- confidence level
- risks or open questions
- suggested next handoff
- `help_request` entry, if the specialist hit a scope-blocker it believes warrants lead intervention (see Help Request below)
- `helpers_done` entry, if a helper you requested during this task is no longer needed (see Helpers Done below)

## Help Request

A specialist that hits a scope-blocker — capability outside its mission, information it cannot gather within its assigned files, a design question that needs a decision — should surface a `help_request` rather than freelance outside scope, bloat its context by grepping from scratch, or return silently incomplete work.

Mode caveat: a progress-update `help_request` only makes sense in `team run` mode with persistent teammates — one-shot subagents (used in `single-session` / `assisted single-session`) cannot pause mid-run and wait for a lead response. In those modes, emit `help_request` in the completion only; the lead resolves the block by dispatching a follow-up specialist in the next turn.

Include the `help_request` in the completion (or a progress update if blocking mid-task in team run). Shape:

```yaml
help_request:
  kind: research | validation | design_question | capability_gap
  question: "concrete, scoped ask"
  scope_note: "why this is outside my assigned mission"
  urgency: blocking | informational
```

Field guidance:

- `kind` — one of the four known kinds. Unknown kinds are allowed but the lead may deny with reason.
  - `research` — code reading, architecture tracing, or dependency questions outside assigned files.
  - `validation` — externally observable behavior that needs exercising, not just reading.
  - `design_question` — a decision the specialist cannot make alone (edge case, tradeoff, constraint clarification).
  - `capability_gap` — a tool, credential, or environment the specialist does not have.
- `question` — concrete and scoped; a helper should be able to act on it without further clarification.
- `scope_note` — one sentence on why this is outside the assigned mission. Helps the lead decide approve vs. deny quickly.
- `urgency` — `blocking` means the specialist cannot make progress without an answer; `informational` means the specialist can continue but flagged the gap.

The specialist emits the request mode-agnostically. Whether the lead resolves it by spawning a fresh one-shot specialist or by introducing a persistent teammate is the lead's call based on the active coordination mode.

## Help Request Response (lead)

When a specialist's completion or progress update contains a `help_request`, acknowledge it explicitly and decide:

- **Approve** — spawn the requested helper scoped to the question. If the harness is running teammates, introduce the helper by name to the requester (e.g. "researcher-1 is scoped to X; message them directly"). If specialists are one-shot subagents, dispatch a fresh specialist with the scoped mission and route findings back.
- **Deny** — respond with a concrete reason. The specialist then either adjusts within its existing scope or returns failure with the denial on record.

**Default bias: approve.** Lead reluctance to spawn is a known failure mode. Approve when the request is bounded and the specialist would otherwise freelance outside scope or bloat its context. Deny only when the request is clearly out-of-scope, speculative, or duplicates existing work.

Do not silently drop a `help_request`. An unacknowledged request is a protocol failure — the user sees the gap in the completion message.

## Helpers Done

When a specialist that requested a helper no longer needs it, the specialist signals teardown in its next progress update or completion:

```yaml
helpers_done:
  - name: researcher-1
    reason: "answer integrated, no further research needed"
```

The lead reads this signal and tears down the named helper(s). Forgetting to emit `helpers_done` leaks teammates into indefinite life — name every helper you requested that is no longer needed.

Teardown has two triggers, used as belt + suspenders:

- **Primary (specialist-signaled):** the requester emits `helpers_done` as above. This is the normal path.
- **Safety net (lead-periodic):** every 3 specialist events, or at major milestones (design complete, implementation complete, review complete), the lead runs a roster check. Any helper with no recent cross-messages and no requester using it gets shut down.

Specialist forgetting ≠ leaked teammate (safety net catches it). Lead over-aggressive ≠ premature shutdown (safety net requires true idle).

## Review Result

Every review result must be one of:

- `approved`
- `approved_with_notes`
- `rejected`

And include:

- evidence checked
- risk or failure summary
- test adequacy summary
- whether missing automated coverage blocks approval
- required follow-up, if rejected

## Validation Result

Every validation result must be one of:

- `passed`
- `failed`
- `blocked`

And include:

- environment
- scenario
- executed evidence checked
- inferred confidence, if any
- gaps, risks, or blockers
- recommended next step

## Deployment Result

Every deployment result should include:

- target environment
- target revision or rollout target
- outcome: `image_published`, `deployed`, `verified`, `blocked`, or `rolled_back`
  - `image_published` — CI produced and pushed the artifact, but the running service has not yet rolled over to the new image (e.g. Flux/Argo hasn't applied, terraform hasn't reconciled, manual promote not triggered). Integration validation cannot run yet.
  - `deployed` — trigger ran and the runtime has accepted the new artifact, but post-deploy smoke has not been checked.
  - `verified` — deployed and post-deploy integration validation passed against the deployed target.
  - `blocked` — the transition could not complete; evidence names why.
  - `rolled_back` — a prior verified state was restored; evidence names why.
- evidence checked
- risks, blockers, or follow-up
- recommended next step

## Handoff Quality Bar

Good handoffs are:

- bounded
- specific
- inspectable
- honest about uncertainty

For substantive specialist tasks, the lead must populate:

- `files` — specific paths the specialist should read or modify
- `call_sites` — where the affected logic is invoked, for cross-cutting changes
- `design_notes` — decisions, edge cases, and constraints the lead has already identified

Specialists cannot delegate exploration to subagents. A handoff missing `files` or `call_sites` on a substantive task is a thin handoff; the specialist should emit a `help_request` (see Help Request below) rather than grep from scratch.

## Handoff Shape

The lead sets a `size` field on every specialist handoff:

```
size: light | standard   (default: standard)
```

- `standard` (default) — substantive work; specialist writes the role-appropriate artifact AND emits the structured completion message.
- `light` — trivial work (typo fixes, one-line config tweaks, variable renames); specialist emits the structured completion message only and skips the artifact write.

The completion message shape is identical in both sizes. Only the persisted artifact is conditional. Review gating, `help_request`, and `helpers_done` behave the same way regardless of size.

## Closing Discipline

A specialist's turn is not complete until the final actions of the turn are:

1. If the handoff specifies `size: standard` (or omits `size` — default is standard), persist the role-appropriate artifact via `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" <writer> --repo "$PWD" --title "<short title>" ...`. Writers by role: builder -> `write-handoff\