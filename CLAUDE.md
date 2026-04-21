# Crew Plugin Repo

This repository builds a Claude Code plugin for structured multi-agent software work.

## Read First

If you are a future coding agent picking this repo up after compaction, read these in roughly this order:

1. `docs/project-status.md` — current shape, shipped v1/v2/v3, gaps, next
2. `docs/coordination.md` — user-facing guide to v2 coordination behavior
3. `docs/v2-coordination-evolution.md` — architectural detail behind v2
4. `docs/memory-and-communication.md` — memory layers and wake-up model
5. `docs/how-it-feels.md` — product vision and emotional targets
6. `docs/memory-system.md` — memory roadmap beyond v1

## Development Priorities

Prefer changes that strengthen:

- clear role boundaries
- explicit handoffs
- inspectable artifacts
- conservative repo bootstrap behavior
- validation against real Claude Code plugin tooling

## Core Principles

- **Don't prematurely load things to context.** Every `@~/.claude/crew/<file>` import fires on every agent invocation regardless of whether the file is needed for this run. Reserve `@` imports for content that is always needed by a role (e.g. `protocol.md` for every specialist, `coder-rules.md` for builder). For content that is role- AND mode-specific (e.g. `validation-principles.md` only for validator's integration-validation mode, or only for builder when the ticket calls for a validation script), instruct the agent to read the file on-demand via `Read` rather than auto-import it. The cost of preloading adds up across sessions.

## Plugin Shape

The plugin is intentionally content-heavy and runtime-light.

- durable behavior belongs in `agents/`, `skills/`, and `commands/`
- hooks should stay small and auditable
- scripts should be thin helpers, not a hidden framework runtime

## Repo Rules

1. Validate plugin changes with `claude plugin validate /Users/aradaev/Documents/Playground`.
2. Prefer additive changes over rewrites.
3. Keep repo-specific guidance in this file and use the docs above as the continuity set.
4. Do not add heavy automation until the manual workflow is proven useful.
5. Favor explicit files and artifacts over implicit memory.

## Where Instructions Live

- Global Crew source of truth: `crew/constitution.md`, `crew/workflow.md`, `crew/protocol.md`, `crew/coder-rules.md`. These are the authoritative files — edit them here as regular markdown PRs. `/crew:install` copies them to `~/.claude/crew/` where agents import them via `@~/.claude/crew/<file>.md`. No JS string templates; diffs show real markdown.
- Agent definitions: `agents/*.md`
- Skills: `skills/*/SKILL.md`
- Commands: `commands/*.md`

## Autonomy Policy

Target: Claude does more over time, with the ceiling raised as trust accumulates. Today's policy is a measured dance — what Claude may do unsupervised, and what requires human sign-off — weighed against the blast radius of each class of action.

**Today:**

- No direct infrastructure changes — dev, stg, or prod. Claude does not run `kubectl apply`, `terraform apply`, `gcloud run deploy`, `astro deploy`, or similar against live infra to mutate state.
- Triggering a pre-built, pre-approved CI/CD workflow against an existing deploy target — yes, when the repo's deployer overlay names the allowed trigger and target. Example: "run the repo's `deploy-dev` workflow on the current branch" via whatever tooling the repo uses.
- Reading live state (logs, metrics, pipeline status, PR checks) — yes.
- Merging PRs with CI green after independent review — yes.
- Any action outside the repo's deployer overlay allow-list — stop and ask.

**Tomorrow (as we tune):**

- Broader allow-lists per repo as trust builds.
- Auto-continue `/crew:ship dev` after build-feature on green gates — opt-in per repo via `dev.stable: true` in `.claude/crew/deployer.md`. This is live now.
- Eventually, auto-promotion to stg on green dev post-deploy validation.

**Where it lives:**

- Crew core stays platform-agnostic: no git host, no CI vendor, no language assumed. The core `deployer` agent and `/crew:ship` command describe *roles and gates*, not concrete commands.
- Per-repo deployer config lives in `.claude/crew/deployer.md` — same custom-instructions pattern as every other agent. It names the actual trigger commands, environments, allow-list, and evidence shape for that repo. If missing on first ship, the deployer asks the user and writes it; no hand-copying required.
- Reference shape: `docs/deployer-config-example.md`.

## Artifact Direction

When adding artifact-producing features, prefer:

- `.claude/logs/events.jsonl` for append-only event logs
- `.claude/artifacts/crew/` for task handoffs, reviews, and run summaries

## Current Focus

v1 foundations, v2 coordination protocol, and v3 CLI polish are shipped. Current focus is dogfooding v2 (`help_request`, `helpers_done`, light-close) on real tasks and tuning cadence / cap values from observation rather than design-time guessing. See `docs/project-status.md` for the live gap list.

<!-- crew:start -->
@~/.claude/crew/constitution.md
<!-- crew:end -->
