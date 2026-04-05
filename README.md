# Engineering OS

`engineering-os` is a Claude Code plugin for running a small, legible engineering team around a lead session.

It is aimed at the workflow described in [docs/v1-spec.md](/Users/aradaev/Documents/Playground/docs/v1-spec.md):

- explicit roles
- bounded ownership
- structured handoffs
- configurable pace
- basic observability

## MVP Shape

The intended user-facing surface is deliberately small:

- `/engineering-os:init-repo`
- `/engineering-os:bootstrap-repo`
- `/engineering-os:build-feature`
- `/engineering-os:investigate-bug`
- `/engineering-os:parallel-review`

Claims, approvals, and artifact writers exist to support those workflows. They are framework machinery and development helpers, not the normal command set a user should need to memorize.

## Orientation Docs

If you are picking this repo up in a later session, read these first:

- [project-status.md](/Users/aradaev/Documents/Playground/docs/project-status.md)
- [reference-repo-plan.md](/Users/aradaev/Documents/Playground/docs/reference-repo-plan.md)
- [memory-and-communication.md](/Users/aradaev/Documents/Playground/docs/memory-and-communication.md)
- [memory-system.md](/Users/aradaev/Documents/Playground/docs/memory-system.md)
- [how-it-feels.md](/Users/aradaev/Documents/Playground/docs/how-it-feels.md)
- [v1-spec.md](/Users/aradaev/Documents/Playground/docs/v1-spec.md)
- [release-versioning.md](/Users/aradaev/Documents/Playground/docs/release-versioning.md)

## Current shape

This first pass includes:

- plugin manifest at `.claude-plugin/plugin.json`
- development marketplace manifest at `.claude-plugin/marketplace.json`
- four durable agents in `agents/`
- three reusable skills in `skills/`
- a small user-facing workflow layer in `commands/`
- hook wiring in `hooks/hooks.json`
- a lightweight event logger in `scripts/log_event.sh`
- repo development guidance in `CLAUDE.md`

## Install direction

Claude Code plugins are installed through the `/plugin` flow.

Recommended first use:

1. Install this plugin at `user` scope for your personal default setup.
2. For an existing repo, open it and run `/engineering-os:bootstrap-repo`.
3. For a brand-new repo, run `/engineering-os:init-repo`.
4. Use `/engineering-os:build-feature`, `/engineering-os:investigate-bug`, or `/engineering-os:parallel-review` when the task fits.

For local development, you can also add the included dev marketplace and install from it:

1. `claude plugin marketplace add /Users/aradaev/Documents/Playground/.claude-plugin/marketplace.json`
2. `claude plugin install engineering-os@engineering-os-dev`

## Installer And Dev CLI

The plugin now ships a small CLI.

Normal development mainly needs:

- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs audit --repo <path>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs bootstrap --repo <path>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs init --repo <path> [--allow-existing]`

Internal or advanced coordination/testing helpers:

- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs wake-up --repo <path>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs claim --repo <path> [--owner <name>] <files...>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs release --repo <path> [files...]`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs show-claims --repo <path>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs show-conflicts --repo <path> [files...]`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs request-approval --repo <path> --summary <text>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs show-approvals --repo <path> [--status open|resolved|all]`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs resolve-approval --repo <path> --id <approval-id> --decision approved|rejected|canceled`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs write-run-brief --repo <path> --title <text>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs write-handoff --repo <path> --title <text>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs write-review-result --repo <path> --title <text>`
- `node /Users/aradaev/Documents/Playground/scripts/engineering-os.mjs write-final-synthesis --repo <path> --title <text>`

Shortcut scripts:

- `npm run installer:audit -- --repo <path>`
- `npm run installer:bootstrap -- --repo <path>`
- `npm run installer:init -- --repo <path>`
- `npm run e2e:smoke`

## What To Commit

Default recommendation:

Commit the stable repo-owned operating layer:

- `CLAUDE.md`
- `.claude/engineering-os/`
- `.claude/settings.json` when it contains shared project settings
- any repo-owned agents, commands, or skills you intentionally want the team to share

Usually do not commit live coordination noise:

- `.claude/logs/`
- `.claude/artifacts/engineering-os/`
- `.claude/state/engineering-os/claims.json`
- `.claude/state/engineering-os/*.jsonl`
- `.claude/settings.local.json`

This is especially important in multi-engineer repos. Claims, approvals, logs, and transient run artifacts are operational state and will create noisy, low-value merge conflicts if tracked by default.

Suggested shared-repo `.gitignore` block:

```gitignore
.claude/logs/
.claude/artifacts/engineering-os/
.claude/state/engineering-os/claims.json
.claude/state/engineering-os/*.jsonl
.claude/settings.local.json
```

## Notes

- The installer core is real now, but still intentionally conservative and minimal.
- `bootstrap-repo` and `init-repo` should eventually share the same conservative installer core with different entry behavior.
- Hook logging is intentionally minimal and appends JSONL metadata to `.claude/logs/events.jsonl` in the working repo.
- The skills are where the most reusable operating behavior now lives.
- The installer already has automated tests plus a sample-repo smoke run.
- Live Claude Code validation has now succeeded for install, audit, bootstrap, hooks, a feature flow, and a bug-fix flow.
- The product direction is a small workflow surface with richer internal machinery underneath, not a growing list of user commands.
- The next step toward a real `wow` is better context recovery, so the workflows now start from a repo wake-up brief built from durable state and artifacts.
- Memory is now being treated as its own product track: bounded startup memory first, with meaning-based retrieval, reinforcement, and decay as a later direction.
- CI now exists for tests plus plugin-version consistency.
- Plugin versioning is currently manual-on-change with CI enforcing consistency across the release files.
