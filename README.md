# Crew

`crew` is a Claude Code plugin for running a small, legible engineering team around a lead session.

It is aimed at the workflow described in [docs/v1-spec.md](docs/v1-spec.md):

- explicit roles
- bounded ownership
- structured handoffs
- configurable pace
- basic observability

## MVP Shape

The intended user-facing surface is deliberately small:

- `/crew:init-repo`
- `/crew:bootstrap-repo`
- `/crew:install`
- `/crew:wake-up-brief`
- `/crew:design`
- `/crew:build-feature`
- `/crew:investigate-bug`
- `/crew:review`
- `/crew:validate`
- `/crew:ship`

Parallelism, claims, approvals, and artifact writers exist to support those workflows. They are framework machinery and development helpers, not the normal command set a user should need to memorize.

## Orientation Docs

If you are picking this repo up in a later session, read these first:

- [project-status.md](docs/project-status.md)
- [reference-repo-plan.md](docs/reference-repo-plan.md)
- [memory-and-communication.md](docs/memory-and-communication.md)
- [memory-system.md](docs/memory-system.md)
- [how-it-feels.md](docs/how-it-feels.md)
- [v1-spec.md](docs/v1-spec.md)
- [release-versioning.md](docs/release-versioning.md)

## Current shape

This first pass includes:

- plugin manifest at `.claude-plugin/plugin.json`
- development marketplace manifest at `.claude-plugin/marketplace.json`
- five durable specialist agents in `agents/`
- four reusable skills in `skills/`
- a small user-facing workflow layer in `commands/`
- lead identity assigned by workflow commands instead of a spawnable lead agent
- task-driven execution where substantial implementation is expected to flow through bounded builder-owned tasks
- control-plane helpers kept in the CLI instead of exposed as slash commands
- hook wiring in `hooks/hooks.json`
- a lightweight event logger in `scripts/log_event.sh`
- repo development guidance in `CLAUDE.md`

## Install direction

Claude Code plugins are installed through the `/plugin` flow.

Recommended first use:

1. Install this plugin at `user` scope for your personal default setup.
2. Optionally run `/crew:install` once to create managed personal overlays under `~/.claude/crew/`.
3. For an existing repo, open it and run `/crew:bootstrap-repo`.
4. For a brand-new repo, run `/crew:init-repo`.
5. Use `/crew:wake-up-brief`, `/crew:design`, `/crew:build-feature`, `/crew:investigate-bug`, `/crew:review`, `/crew:validate`, or `/crew:ship` when the task fits.

For local development, you can also add the included dev marketplace and install from it:

1. `claude plugin marketplace add ${CLAUDE_PLUGIN_ROOT}/.claude-plugin/marketplace.json`
2. `claude plugin install crew@crew-dev`

## Installer And Dev CLI

The plugin now ships a small CLI.

Normal development mainly needs:

- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs audit --repo <path>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs bootstrap --repo <path>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs init --repo <path> [--allow-existing]`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs install-user-assets`

Internal or advanced coordination/testing helpers:

- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs wake-up --repo <path>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs claim --repo <path> [--owner <name>] <files...>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs release --repo <path> [files...]`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs show-claims --repo <path>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs show-conflicts --repo <path> [files...]`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs request-approval --repo <path> --summary <text>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs show-approvals --repo <path> [--status open|resolved|all]`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs resolve-approval --repo <path> --id <approval-id> --decision approved|rejected|canceled`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs write-run-brief --repo <path> --title <text>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs write-handoff --repo <path> --title <text>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs write-review-result --repo <path> --title <text>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs write-validation-result --repo <path> --title <text>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs write-deployment-result --repo <path> --title <text>`
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs write-final-synthesis --repo <path> --title <text>`

Shortcut scripts:

- `npm run installer:audit -- --repo <path>`
- `npm run installer:bootstrap -- --repo <path>`
- `npm run installer:init -- --repo <path>`
- `npm run e2e:smoke`

## What To Commit

Default recommendation:

Commit the stable repo-owned operating layer:

- `CLAUDE.md`
- `.claude/crew/constitution.md`
- `.claude/crew/workflow.md`
- `.claude/crew/protocol.md`
- `.claude/settings.json` when it contains shared project settings
- any repo-owned agents, commands, or skills you intentionally want the team to share

Usually do not commit live coordination noise:

- `.claude/logs/`
- `.claude/artifacts/crew/`
- `.claude/state/crew/claims.json`
- `.claude/state/crew/*.jsonl`
- `.claude/settings.local.json`

This is especially important in multi-engineer repos. Claims, approvals, logs, and transient run artifacts are operational state and will create noisy, low-value merge conflicts if tracked by default.

Suggested shared-repo `.gitignore` block:

```gitignore
.claude/logs/
.claude/artifacts/crew/
.claude/state/crew/claims.json
.claude/state/crew/*.jsonl
.claude/settings.local.json
```

## Notes

- The installer core is real now, but still intentionally conservative and minimal.
- `bootstrap-repo` and `init-repo` should eventually share the same conservative installer core with different entry behavior.
- Hook logging is intentionally minimal and appends JSONL metadata to `.claude/logs/events.jsonl` in the working repo.
- Startup context should stay small: `CLAUDE.md` imports only the neutral constitution layer.
- The installer now owns the canonical Crew `.gitignore` block so repo setup stays consistent.
- Workflow commands assign lead identity at runtime and load shared workflow/protocol guidance on demand.
- Specialist agents are reusable tools with optional global and repo overlays.
- `/crew:install` now creates managed global overlay stubs under `~/.claude/crew/` instead of leaving that path completely manual.
- Builder now owns code-bearing tasks plus automated tests for changed behavior; if a substantial task lacks suitable test setup, the smallest suitable harness is part of the task unless explicitly scoped out. Reviewer gates completed tasks before they count as done, and validator is expected at milestones or the end for runnable behavior.
- Review, validation, and shipping now exist as first-class lead entry points, but the validator/deployer prompts and evidence loops are intentionally minimal v1 contracts that should be iterated through dogfooding.
- The installer already has automated tests plus a sample-repo smoke run.
- Live Claude Code validation has now succeeded for install, audit, bootstrap, hooks, a feature flow, and a bug-fix flow.
- The product direction is a small workflow surface with richer internal machinery underneath, not a growing list of user commands.
- The next step toward a real `wow` is better context recovery, so the workflows now start from a repo wake-up brief built from durable state and artifacts.
- Memory is now being treated as its own product track: bounded startup memory first, with meaning-based retrieval, reinforcement, and decay as a later direction.
- CI now exists for tests plus plugin-version consistency.
- Plugin versioning is currently manual-on-change with CI enforcing consistency across the release files.
