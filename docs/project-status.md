# Crew Status

Current state of the plugin, the gaps that matter, and what's next.

For user-facing behavior, see `coordination.md`. For v2 architectural detail, see `v2-coordination-evolution.md`.

## What Crew Is

A Claude Code plugin for structured, legible multi-agent software work. Not an autonomous swarm — a personal engineering operating system that makes team-style work easier to follow, safer to steer, and easier to inspect.

Core bets:

- one lead session stays user-facing
- specialists do bounded work, one owner per task
- handoffs are structured and inspectable
- review is an independent gate, not self-certification
- observability is built in (artifacts, events, wake-up)

## User Surface

The MVP intentionally exposes a small set of commands:

- `/crew:init-repo`
- `/crew:bootstrap-repo`
- `/crew:install`
- `/crew:wake-up-brief`
- `/crew:build-feature`
- `/crew:investigate-bug`
- `/crew:review`
- `/crew:validate`
- `/crew:ship`

Claims, approvals, and artifact writers are support machinery — they should increasingly live under the main workflows, not as commands users learn.

## What's Shipped

**v1 foundations:**

- Valid Claude Code plugin with agents, skills, commands, hooks.
- Installer CLI (`scripts/crew.mjs`) covering repo init, bootstrap, user-asset install, wake-up, claims, approvals, and artifact writers.
- Durable specialist roles: builder, reviewer, researcher, validator, deployer.
- Canonical templates for constitution, workflow, and protocol live under `scripts/lib/installer.mjs` and install to `~/.claude/crew/`.
- Automated tests (`tests/*.test.mjs`) and filesystem smoke (`scripts/e2e-smoke.mjs`). CI runs tests and checks version consistency.

**v2 coordination evolution (`feat/v2-coordination-evolution`, merged):**

- CR-01 Token audit: deduped repeated patterns across role files and commands.
- CR-02 Lead-scoped handoff contract: `files`, `call_sites`, `design_notes` required on substantive handoffs.
- CR-03 `help_request` protocol: specialists emit structured scope-blocker requests; lead biases toward approval.
- CR-04 Teardown discipline: `helpers_done` signal + lead-periodic roster sweep; concurrent-helper cap of 2.
- CR-05 Light-close path: `size: light | standard` in the handoff; light skips artifact writes.
- CR-06 Design-doc framing as positive contract ("linked by explicit handoff path, not by search").
- CR-07 User-facing docs (`coordination.md`) and project-status update.

**v3 polish (`feat/v3-polish`, merged):**

- CR-08 Finished the token audit across the remaining four command files.
- CR-09 CLI field discipline: `write-handoff` and `write-review-result` reject sparse inputs with actionable errors. `--force` escape hatch.
- CR-10 Auto-install on template change: wake-up detects drift between canonical templates and `~/.claude/crew/*.md`, auto-refreshes. Role-slot overlays preserved.

## Gaps That Matter

1. **`help_request` and `helpers_done` paths** landed but haven't fired in a real scope-blocker yet. First live round-trip is still an open item.
2. **Cadence and cap are tentative.** The every-3-events cadence and 2-concurrent-helper cap come from the design doc, not observation. Should tune after a few runs.
3. **Artifact writers for validator/deployer (`write-validation-result`, `write-deployment-result`)** don't have the CR-09 field discipline yet. Less frequently used; fair game for a follow-up CR.
4. **Richer task-board state** isn't implemented. Claims work; a real run board doesn't exist.
5. **Event schema is thin** (see `event-schema.md`) — `schemaVersion`, `event`, `timestamp`, `repoPath`, `payloadPath`. Planned optional fields (`sessionId`, `runId`, `taskId`, `owner`, `status`) are not emitted yet.
6. **Memory retrieval is recency-based only.** The roadmap in `memory-system.md` sketches meaning-based retrieval with reinforcement and decay, but none of that is built.

## What's Next

Short list, in rough priority order:

1. Exercise `help_request`/`helpers_done` naturally and tune cadence + cap.
2. Extend CLI field discipline to validator and deployer writers.
3. Richer event schema once there's a concrete consumer that would use it.
4. Observability improvements: surface `templateSync` drift in the lead output; maybe a `/crew:wake-up-brief` that visualizes warm/cold artifact layers.
5. Address UX friction as it surfaces — watch for artifact sparseness, approval-kind UX, claim vs. conflict distinctions.

Big structural moves (task-board state, meaning-based memory) stay deferred until there's a concrete use case pulling for them.
