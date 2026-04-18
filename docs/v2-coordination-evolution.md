# Crew v2 — Coordination Evolution

## Summary

Crew v1 delivered the core lead-specialist architecture: bounded scope, independent review gate, structured handoffs, durable artifacts. It works for well-scoped feature work in a single repo.

Four frictions surfaced in real use:

1. **Ceremony overhead for small tasks** — the closing ritual (artifact write + structured completion) is sized for substantial work, feels heavy for trivial fixes.
2. **Layer sprawl / token duplication** — signed-commit, async-default, and scope rules appear across global CLAUDE.md, constitution, and role files; ~14k tokens of standing context before any task starts.
3. **Specialist exploration asymmetry** — built-in Claude Code subagents (Explore, Plan) are available to the lead but not to specialists, because specialists are themselves subagents and the platform's no-nesting rule blocks further dispatch. Specialists must explore in their own context window.
4. **No dynamic help channel** — when a specialist hits a blocker requiring scope outside its mission (research, validation, design clarification), today's options are: give up and return incomplete, or silently freelance outside scope. Neither is clean.

v2 addresses all four in a single coherent protocol update. No binary mode switch, no experimental-flag gating of core features — just a set of protocol additions that make the existing lead-specialist model work better and give it a clean path to dynamic expansion.

## Mental Model

The big shift: **the lead owns the roster; peers own the conversation.**

Today, specialists are one-shot. Lead dispatches, specialist works, specialist returns, session ends. If the specialist needs something it can't get in its own context, it either dies or works around.

In v2, a specialist that hits a blocker can emit a structured `help_request` in its completion or status. The lead decides: approve or deny. If approved, the lead spawns a temp teammate (e.g. a researcher) and introduces the peer. The original specialist and the helper can then message each other directly — no more routing through the lead for every exchange. When the helper is no longer needed, the original specialist signals it, or the lead notices during periodic check and cleans up.

This pattern sits naturally on top of Claude Code's agent-teams mechanics, which are already active in this environment via the user's global setup. We're not adding a new mode — we're formalizing how dynamic expansion happens within the coordination that already exists.

Everything else in v2 is unglamorous but high-leverage: token consolidation, a light-close path for tiny tasks, and making lead-scoped handoffs the documented norm rather than an implicit expectation.

## Components

### Dynamic Help-Request Protocol

The core new mechanism. Extends the specialist completion / status shape with:

```yaml
help_request:
  kind: research | validation | design_question | capability_gap
  question: "concrete, scoped ask"
  scope_note: "why this is outside my assigned mission"
  urgency: blocking | informational
```

**Lead response flow:**

1. Lead reads the help_request on specialist status update.
2. Lead decides:
   - **Approve** → spawn a temp teammate scoped to the help request, introduce by name to the requester. Example: "I've spawned `researcher-1` with scope X. Message them directly to coordinate."
   - **Deny** → respond to specialist with reason. Specialist either adjusts or returns failure with the denial on record.
3. Once introduced, the requester and the helper communicate peer-to-peer. Lead stays out of the loop until either requester signals completion or lead runs periodic roster check.

**Default bias: approve, don't deny.** Lead reluctance to spawn is a known failure mode — the protocol should actively nudge toward approval when the request is bounded and the specialist would otherwise either bloat its own context or freelance outside scope. The lead should deny only when the request is clearly out-of-scope, speculative, or duplicates existing work.

**Key invariant (platform-enforced):** specialists cannot spawn teammates. Only the lead can. Specialists *can* message any existing teammate directly once introduced. The protocol matches the platform — no fighting the tool.

### Teardown Discipline

Two teardown triggers, used as belt + suspenders:

**Primary (specialist-signaled):** when the original requester no longer needs the helper, it emits a teardown signal in its next status or completion:

```yaml
helpers_done:
  - name: researcher-1
    reason: "answer integrated, no further research needed"
```

Lead reads this and shuts down the named teammate(s).

**Safety net (lead-periodic):** every N specialist-turn events, lead runs a roster check: for each active temp teammate, confirm a requester is still using it. If idle with no recent cross-messages, lead initiates shutdown.

**Why both:** specialist forgetting to emit `helpers_done` should not leak teammates into indefinite life. Lead over-aggressive cleanup should not cut off a helper still being used. The two triggers complement — explicit signal is cheap and normal; the check catches what slips.

### Protocol Cleanup (mode-agnostic, ships independently of help-request)

**Light-close path.** Closing ceremony gets a size-sensitive variant. The lead signals task size in the handoff (`size: light | standard`). For light tasks, specialists emit the structured completion message but skip the artifact write. The completion message format stays identical; only the persisted artifact is skipped. Keeps legibility; drops overhead for trivial work.

**Lead-scoped handoff contract.** Formalizes what's currently implicit: specialists are not expected to explore codebases from scratch. The lead does upfront investigation via built-in Explore/Plan subagents (it can; specialists can't), then passes findings into the handoff. Task handoff template gains required fields:

- `files: [...]` — specific files the specialist should touch or read
- `call_sites: [...]` — where affected logic is invoked (cross-cutting changes)
- `design_notes: ...` — decisions, edge cases, and constraints the lead has already identified

If these fields are empty, the lead hasn't done its job — specialists flag via help_request rather than silently compensating with broad grepping. This is the asymmetry fix: shift exploration upstream where it belongs.

**Token audit + consolidation.** One pass across global CLAUDE.md, constitution, protocol, role files, and skills to:

- Remove duplicated rules (signed commits, async-default, scope discipline)
- Flatten role files where the constitution already covers content
- Target: reduce standing context by 3–5k tokens without losing clarity

**Design-doc framing fix.** Reword protocol from "don't scan `designs/` — stale docs mislead" (workaround) to "lead passes explicit paths" (positive norm). Minor polish.

## How It Works Together

```
           ┌─────────────────────┐
           │  User / Lead        │
           └──────────┬──────────┘
                      │ /crew:build-feature
                      │ handoff: { files, call_sites, design_notes, size }
                      ▼
                  ┌──────────┐
                  │ Builder  │── explores within provided scope
                  └────┬─────┘
                       │ hits blocker
                       │ emits help_request
                       ▼
                   ┌──────┐
                   │ Lead │── default: approve
                   └──┬───┘
                      │ spawns researcher-1
                      │ introduces: "builder, talk to researcher-1"
                      ▼
        ┌─────────────┐          ┌────────────────┐
        │  Builder    │◄────────►│ researcher-1   │
        │ (alive,     │  direct  │ (temp teammate)│
        │  keeps ctx) │ messages │                │
        └─────┬───────┘          └────────────────┘
              │ integrates research
              │ emits helpers_done: [researcher-1]
              ▼
            Lead
              │ tears down researcher-1
              │ (safety net: lead periodic check)
              ▼
           continue
```

## Key Technical Decisions

1. **No binary "serial vs parallel" mode.** The platform already makes teams-vs-subagents a harness-level choice. Crew doesn't need to own a mode switch. It owns a protocol that works cleanly on top of whatever coordination the harness provides.

2. **Lead always mediates spawning, never messaging.** Platform-enforced (teammates can't spawn new teammates), and matches clean ownership (lead decides roster; peers decide conversation). Protocol encodes what the platform already enforces.

3. **Default bias: approve help_request.** Lead reluctance to spawn is the observed failure mode. The protocol spells out that denial is the exception, not the default, specifically for bounded scope requests.

4. **Both teardown triggers.** Explicit specialist signal is the primary mechanism; lead periodic check is the safety net. Belt + suspenders because the cost of a leaked teammate is real and the cost of the check is trivial.

5. **Lead-scoped handoff as contract.** Platform constraint (no nested subagents for specialists) means exploration must happen upstream. The handoff fields become required, not recommended. Specialists flag empty fields via help_request rather than silently bloating.

6. **Ship protocol cleanup independently of help_request.** Token audit, light-close, lead-scoped handoff, design-doc framing — all useful on their own. Don't gate them on the help_request work.

## Edge Cases

- **Specialist emits help_request, lead denies, specialist has no fallback.** Specialist returns failure with denial on record. User sees it via completion message and decides next step. Not a protocol-handled case — human judgment.
- **Specialist emits helpers_done for a teammate that's also being used by another specialist.** Currently not a designed-for case — only one specialist should be the "owner" of a helper. If multiple requesters use the same helper, lead tracks owners and only tears down when all have signaled done.
- **Lead periodic check catches a helper mid-use (false positive).** Safety net should require the helper to be truly idle (no recent cross-messages in N turns) before shutdown. Parameter tunable.
- **Specialist in teams mode goes idle mid-task with an active helper.** Platform sends idle notification to lead; lead handles shutdown of both the requester and the helper. Normal teams behavior.
- **Light-close task where user wants the artifact anyway.** Provide `size: standard` override on the handoff. Don't build a per-task toggle beyond that.
- **help_request with a `kind` that doesn't map to an existing role.** Lead judgment call. Protocol specifies known kinds; lead can deny unknown kinds with reason.

## Fail Modes

- **Lead ignores help_request field.** Specialist's request is silently dropped. Mitigation: lead's protocol instructions make surfacing a help_request an explicit required step on every specialist completion. If the lead skips the acknowledgment, the user sees the gap in the completion message.
- **Specialist never emits helpers_done.** Primary teardown trigger fails. Safety net (lead periodic check) catches it. Worst case: temp teammate survives a turn or two longer than needed.
- **Lead over-approves, spawns too many teammates.** Token cost blows up. Mitigation: lead protocol guidance caps concurrent helpers per run (e.g. max 2 active at a time). If at cap, new help_requests get "wait, one is finishing" response.
- **Lead over-denies, specialists compensate by freelancing.** Exact current failure. Mitigation: protocol explicitly biases toward approval for bounded scope; examples in protocol doc show what denial-worthy requests look like vs. approve-worthy ones.
- **Teammate cleanup fails, orphans survive run end.** Final explicit cleanup step at end of run; if it fails, surface to user with manual cleanup command per agent-teams docs.
- **Protocol too much for small tasks.** Light-close path is the escape valve. Size field in handoff signals small-task scope.

## What Working Properly Means

Observable signals v2 is healthy:

- Standing context tokens drop measurably after consolidation (target 3–5k reduction, visible in `/context`).
- `help_request` field appears in real specialist completions when they hit scope-blockers — not just in theoretical docs.
- Lead approves most help_requests rather than denying by default; when it denies, the reason is explicit and inspectable.
- `helpers_done` signals close the loop on temp teammates; post-run `tmux ls` (when applicable) shows no orphans.
- Light-close tasks complete without artifact writes but still produce structured completion messages.
- Handoff artifacts show populated `files`, `call_sites`, `design_notes` fields on substantive tasks.

## What Done Means

v2 ships when:

- [ ] Token audit complete, duplications removed, delta reported
- [ ] Protocol updated with `help_request` + `helpers_done` + `size` fields
- [ ] Lead protocol instructions updated with approval-bias guidance and periodic-check behavior
- [ ] Specialist role files updated with help_request emission guidance and helpers_done closure
- [ ] Handoff template updated with required `files`, `call_sites`, `design_notes`
- [ ] Design-doc framing reworded (positive norm, not workaround)
- [ ] Light-close path implemented; both path variants covered in docs
- [ ] End-to-end smoke: run one standard task, one light-close task, one task that triggers a help_request and clean teardown; all three complete cleanly
- [ ] No regression in existing `/crew:build-feature`, `/crew:investigate-bug`, `/crew:review`, `/crew:validate`, `/crew:ship` flows on the default path

## Phasing / Tickets

One phase. Order below is the suggested build sequence: cleanup first (low risk, immediate benefit), then protocol additions (help_request, teardown), then light-close and polish.

| Ticket | Title | Scope | Risk |
|---|---|---|---|
| CR-01 | Token audit + consolidation | Find duplications across CLAUDE.md, constitution, protocol, role files. Remove or reference. Report token delta. | Low |
| CR-02 | Lead-scoped handoff contract | Update handoff template to require `files`, `call_sites`, `design_notes`. Update lead command instructions. Specialist flags missing scope via help_request. | Low |
| CR-03 | `help_request` protocol addition | Add field to specialist completion/status shape. Update lead instructions on response flow and approval bias. Update specialist instructions on when to emit. | Low-medium |
| CR-04 | Teardown discipline | Add `helpers_done` signal. Document periodic-check behavior for lead. Specify concurrent-helper cap. | Low-medium |
| CR-05 | Light-close path | `size: light \| standard` in handoff. Specialist closing step becomes conditional. | Low |
| CR-06 | Design-doc framing fix | Reword protocol from workaround to positive norm. | Low |
| CR-07 | End-to-end smoke + docs | Run the three scenarios. Update user-facing docs with coordination behavior and help_request pattern. | Low |

## Open Questions

1. **Concurrent helper cap.** Is 2 the right number? 3? Unlimited? Tentative: 2, revisit after observation.
2. **Periodic-check cadence.** Every turn? Every N specialist events? Tentative: every 3 specialist events or at milestones (design, implementation complete, review).
3. **help_request retries.** If lead denies, can specialist re-emit with different framing, or is a denial final for that task? Tentative: one retry allowed with explicit re-scoped request.
4. **Token audit aggressiveness.** Some duplication is intentional (role files self-contained for independence). Where's the line? Tentative: dedupe anything in 3+ places; keep intentional self-contained restatements where they matter for role-isolated reading.
5. **Should help_request surface to the user by default?** Or only on denial? If lead approves and quietly spawns, user may not see the coordination happening. Tentative: always log to event stream, surface to user on denial or on any help_request that takes >N turns to resolve.

## Visuals

### Today (v1) — specialists are one-shot

```
lead ──dispatch──► specialist ──return──► lead
                    (one-shot)
```

Specialist hitting a blocker: dies, lead re-spawns new specialist with updated scope. Accumulated context is lost on each re-spawn.

### v2 — lead owns roster, peers own conversation

```
lead ──dispatch──► specialist
                    │
                    │ help_request: "need X"
                    ▼
                   lead ──approves──► spawns helper
                    │                  ▲
                    │ introduces       │
                    └─────────► specialist ◄──messages──► helper
                                (alive)        direct      (temp)
                                 │
                                 │ helpers_done
                                 ▼
                                lead ──tear down helper
```

Specialist stays alive through the help cycle. Context preserved. Lead gatekeeps creation, not every exchange. Teardown is explicit, with a safety net.
