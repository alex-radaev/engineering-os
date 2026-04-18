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

- Global constitution, workflow, and protocol templates: `scripts/lib/installer.mjs` (`CONSTITUTION_TEMPLATE`, `WORKFLOW_TEMPLATE`, `PROTOCOL_TEMPLATE`). These are the source of truth — `/crew:install` writes them under `~/.claude/crew/` and `/crew:bootstrap-repo` or `/crew:init-repo` write them under `.claude/crew/`.
- Agent definitions: `agents/*.md`
- Skills: `skills/*/SKILL.md`
- Commands: `commands/*.md`

## Artifact Direction

When adding artifact-producing features, prefer:

- `.claude/logs/events.jsonl` for append-only event logs
- `.claude/artifacts/crew/` for task handoffs, reviews, and run summaries

## Current Focus

v1 foundations, v2 coordination protocol, and v3 CLI polish are shipped. Current focus is dogfooding v2 (`help_request`, `helpers_done`, light-close) on real tasks and tuning cadence / cap values from observation rather than design-time guessing. See `docs/project-status.md` for the live gap list.

<!-- crew:start -->
@~/.claude/crew/constitution.md
<!-- crew:end -->
