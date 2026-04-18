# Coordination

A short reader-oriented guide to how a Crew run actually unfolds in v2. If you've kicked off `/crew:build-feature` or `/crew:investigate-bug` and want to know what happens between dispatch and completion — and how the new v2 signals (`help_request`, `helpers_done`, `size`) affect you — this is the page.

For the architectural "why" behind these changes, see `docs/v2-coordination-evolution.md`.

## Mental Model

**The lead owns the roster. Specialists own their tasks.**

- The lead session is the one you talk to. It plans, dispatches, and reviews.
- Specialists (builder, reviewer, researcher, validator, deployer) are bounded-scope workers spawned by the lead.
- Specialists never spawn other specialists — only the lead adds teammates. This matches the platform (no-nesting for subagents) and keeps ownership legible.

Once a specialist is alive, it can communicate directly with any peer the lead has introduced it to. The lead gatekeeps creation, not every exchange.

## Task Size: `light` vs `standard`

Every handoff carries a `size` field. It controls how much closing ceremony the specialist runs.

| Size | When it applies | What the specialist does at the end |
|---|---|---|
| `standard` | Substantial tasks: new behavior, multi-file edits, anything worth reviewing | Writes a handoff artifact to `.claude/artifacts/crew/` AND emits a structured completion message |
| `light` | Small focused tasks: a docs tweak, a targeted bug fix, a single-file change | Emits the structured completion message only; skips the artifact write |

The completion message format is identical in both cases — only the persisted artifact differs. If you want the artifact for a task the lead marked light, override with `size: standard` in the handoff.

**Rule of thumb:** the lead picks size based on whether the work merits an independent review gate. Light-close is an escape valve for trivial work, not a way to skip review on substantive changes.

## `help_request` — When a Specialist Needs Scope It Doesn't Have

Sometimes a specialist hits a blocker that's genuinely outside its mission — it needs research, validation, a design clarification, or a capability its role doesn't cover. In v1 the only options were "give up" or "freelance outside scope." In v2 the specialist emits a structured request:

```yaml
help_request:
  kind: research | validation | design_question | capability_gap
  question: "concrete, scoped ask"
  scope_note: "why this is outside my assigned mission"
  urgency: blocking | informational
```

### How the lead responds

1. The lead reads the `help_request` on the specialist's status or completion message.
2. The lead decides approve or deny:
   - **Approve** (the default bias): spawn a temp teammate scoped to the request, then introduce them by name to the requester. "I've spawned `researcher-1`. Message them directly."
   - **Deny**: respond with a reason. The specialist either adjusts or returns failure with the denial on record.
3. Once introduced, the requester and the helper talk peer-to-peer. The lead stays out of the loop until the requester signals done or the lead's periodic check sweeps the roster.

### Approval bias

The lead defaults to approve. Denial is the exception. The protocol nudges this way because lead reluctance to spawn is the observed failure mode — it pushes specialists back into freelancing or context bloat. Lead denies only when the request is clearly out-of-scope, speculative, or duplicates existing work.

**Concurrent cap:** the lead keeps at most 2 active helpers at a time. If at cap, a new `help_request` gets a "wait, one is finishing" response rather than an outright denial.

## `helpers_done` — Teardown

Teammates spun up for a `help_request` are temporary. Two triggers close them out:

**Primary (specialist-signaled).** When the requester no longer needs the helper, it emits in its next status or completion:

```yaml
helpers_done:
  - name: researcher-1
    reason: "answer integrated, no further research needed"
```

The lead reads this and shuts down the named teammates.

**Safety net (lead periodic check).** Every few specialist-turn events, the lead sweeps the active roster. If a temp teammate is idle with no recent cross-messages, the lead tears it down even without an explicit signal.

Belt and suspenders: explicit signal handles the normal case; the sweep catches what slips.

## Mode Notes — Subagent vs Teams

The v2 protocol is mode-agnostic. Both modes are supported:

- **Subagent mode.** Specialists are one-shot Task dispatches. `help_request` still applies: the specialist returns with the request in its completion; the lead spawns a new specialist for the helper scope and a follow-up specialist for continuation.
- **Teams mode.** Specialists live longer; the requester stays alive across the help cycle and messages the helper directly. Teardown is explicit via `helpers_done` or automatic via the lead's periodic sweep.

The protocol shape — `help_request`, approval flow, `helpers_done`, size-sensitive close — is the same in either mode. What changes is whether peer-to-peer messaging is literal (teams) or mediated through sequential dispatches (subagents).

## What "Working Properly" Looks Like

Signals the v2 coordination is healthy in real runs:

- Specialists emit `help_request` when they hit genuine scope-blockers (not when they're lazy about in-scope exploration).
- The lead approves most requests; denials come with explicit reasons.
- `helpers_done` closes the loop on temp teammates; no orphans survive run end.
- Light-close tasks complete without artifact writes but still produce structured completion messages.
- Handoff artifacts on substantive tasks show populated `files`, `call_sites`, and `design_notes` — evidence the lead did upstream exploration rather than punting it to specialists.

## Further Reading

- `docs/v2-coordination-evolution.md` — design doc with rationale, edge cases, fail modes, and phasing.
- `docs/v1-spec.md` — original lead-specialist architecture that v2 builds on.
- `~/.claude/crew/protocol.md` — the canonical protocol templates installed by `/crew:install`.
