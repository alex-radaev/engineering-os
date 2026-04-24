# ORCHESTRATOR_MISSION Envelope

The `ORCHESTRATOR_MISSION` envelope is a structured header an external orchestrator prepends to the Crew lead's first-turn prompt. When present, it is the binding run contract for this session — the objective, scope, acceptance criteria, and reporting paths override any scope the lead would otherwise infer from free-form prose. When absent, behavior is unchanged: the lead works from the prompt body as usual.

The envelope is consumed by the **Crew lead** at the top of the run, before restating goal and scope. Specialists do not parse it directly — the lead translates it into the run brief and specialist handoffs.

## Shape

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

## Parsing rules

1. Triggered ONLY when the prompt's first non-empty line is the literal string `ORCHESTRATOR_MISSION`.
2. Terminator: the first line that is `End of mission envelope.` OR the first line matching `/^\/crew:/` after the envelope header. Everything after is the free-form prompt body.
3. Fields are `key: value` on one line, OR `key:` followed by indented continuation lines (2+ spaces of indent). Unknown keys are preserved but ignored by the lead.
4. Missing required fields (`mission_id`, `objective`) → the lead must emit a `help_request` asking the orchestrator to re-dispatch with a complete envelope, rather than guessing.
5. Envelope fields are binding: the lead's restated goal is `objective` verbatim; in-scope lines come from `scope`; "done when" comes from `acceptance_criteria`; reporting paths drive future artifact writes (wiring lives in a separate ticket — this doc locks the shape).

## Example

An orchestrator dispatching the Crew lead to investigate a production bug might send:

```
ORCHESTRATOR_MISSION
mission_id: mission-2026-04-24-001
task_id: BUG-842
repo: payments-api
objective: Diagnose and fix the 5xx spike on /charges since 2026-04-23.
scope:
  Investigate the /charges handler and any downstream client it calls.
  Do not touch the refund handler, the billing cron, or shared DB migrations.
  Add a regression test for the root cause before closing.
acceptance_criteria:
  Root cause identified with log or code evidence.
  Fix merged with unit test covering the failure path.
  Error rate on /charges below 0.5% in dev after deploy.
reporting:
  status_file: /var/run/crew/mission-2026-04-24-001/status.json
  event_log:   /var/run/crew/mission-2026-04-24-001/events.jsonl
  handoff_file: /var/run/crew/mission-2026-04-24-001/handoff.md
End of mission envelope.

/crew:investigate-bug 5xx spike on /charges
```

The parser returns an envelope object with the fields above and a `body` string containing the slash-command line (and anything after the terminator). The lead then restates `objective` verbatim as the run goal, uses `scope` as the in-scope / out-of-scope framing, and uses `acceptance_criteria` as the "done when" checklist for final synthesis.

## How the lead consumes it

- Restates the run goal word-for-word from `objective`.
- Derives in-scope / out-of-scope boundaries from `scope`.
- Uses `acceptance_criteria` as the explicit done-state gate for final synthesis.
- Passes reporting paths (`reporting.status_file`, `reporting.event_log`, `reporting.handoff_file`) to future artifact writers so mission status reaches the orchestrator. The artifact writers are not wired to these paths yet — a separate ticket owns that work. This doc locks the shape so the writers can be built against a stable contract.
- If `mission_id` or `objective` is missing, the lead emits a `help_request` asking the orchestrator to re-dispatch with a complete envelope. The lead does not guess.

See `crew/workflow.md § Mission Envelope` for the authoritative run-sequence integration.

## Mission Reporting

The writers that persist status and events to the envelope's `reporting.*` paths are documented in `crew/workflow.md § Mission Reporting`. That section names the writer subcommands (`record-mission`, `write-mission-status`, `append-mission-event`), the path-resolution order, and the event kinds.
