# Engineering OS

A Claude Code plugin for structured multi-agent software work with explicit roles, bounded ownership, and inspectable handoffs.

## What it does

Engineering OS gives Claude Code a small team model:

- **lead** — plans, delegates, synthesizes, paces
- **builder** — implements bounded changes within assigned scope
- **reviewer** — validates correctness, regressions, and scope drift
- **researcher** — investigates questions without editing code

Each agent has strict ownership rules, structured start/completion reports, and explicit handoffs.

## Commands

Primary user-facing commands:

- `/engineering-os:build-feature` — lead a bounded feature delivery run
- `/engineering-os:investigate-bug` — lead a debugging run with evidence gathering
- `/engineering-os:parallel-review` — coordinate clean parallel ownership
- `/engineering-os:bootstrap-repo` — prepare an existing repo for the workflow
- `/engineering-os:init-repo` — initialize a new repo with the harness
- `/engineering-os:install-global` — install or update the one global Engineering OS memory copy

Supporting commands: `claim-files`, `release-files`, `show-claims`, `show-conflicts`, `request-approval`, `show-approvals`, `resolve-approval`, `audit-repo`, `wake-up-brief`.

## Install

Install via the Claude Code plugin flow:

```
claude plugin install engineering-os
```

For local development, clone and register as a directory marketplace:

```
git clone https://github.com/alex-radaev/engineering-os.git
```

Then add it as a local marketplace in `~/.claude/plugins/known_marketplaces.json`.

### Global setup

Engineering OS keeps one managed global memory copy for framework-level rules:

- `~/.claude/engineering-os/constitution.md`
- `~/.claude/engineering-os/workflow.md`
- `~/.claude/engineering-os/metadata.json`

Project repos should not each get their own copied constitution and workflow. They should keep only repo-specific rules plus repo-local state, artifacts, and hooks.

After installing or updating the plugin, run:

```text
/engineering-os:install-global
```

This writes or updates the managed global copy and adds `@` references to your global `~/.claude/CLAUDE.md`.

Why this exists:

- Claude memory can import stable files from `~/.claude/`
- plugin install does not automatically rewrite global `CLAUDE.md`
- one managed global copy avoids stale per-repo framework copies

If a plugin update changes constitution or workflow behavior, rerun `/engineering-os:install-global` once.

### How configuration layers work

| Layer | Location | Scope | Who edits |
|-------|----------|-------|-----------|
| Constitution + workflow | `~/.claude/engineering-os/` | All repos | Plugin-managed global copy |
| Global user rules | `~/.claude/CLAUDE.md` | All repos | User |
| Repo rules | `CLAUDE.md` | This repo | Team |

**Repo CLAUDE.md overrides constitution defaults.** The constitution provides baseline team rules (ownership, review gates, handoffs). Teams customize per-repo via CLAUDE.md without touching the constitution.

### Per-repo bootstrap

To enable artifacts, state tracking, and hooks in a specific repo:

```bash
node "<plugin-path>/scripts/engineering-os.mjs" bootstrap --repo .
```

## Customizing agents

Agents support two-tier custom instructions, same model as Claude Code settings:

| Level | Path | Scope |
|-------|------|-------|
| Global | `~/.claude/engineering-os/<role>.md` | All repos |
| Repo | `.claude/engineering-os/<role>.md` | This repo only |

Both files are read if they exist. Repo instructions take precedence over global on conflict.

### Example

`~/.claude/engineering-os/reviewer.md` (global):
```markdown
- Use the python-coding skill when reviewing Python code
- Use the golang-coding skill when reviewing Go code
```

`.claude/engineering-os/builder.md` (repo-level):
```markdown
- Follow strict typing — no `Any` unless unavoidable
- All new functions must have tests
```

## Agent models

Default model assignments:

| Agent | Model |
|-------|-------|
| lead | opus |
| builder | opus |
| reviewer | opus |
| researcher | sonnet |

## What to commit

Commit the stable operating layer:

- `CLAUDE.md`
- `.claude/engineering-os/` (custom agent instructions)
- `.claude/settings.json` (shared project settings)

Do **not** commit transient coordination state:

```gitignore
.claude/logs/
.claude/artifacts/engineering-os/
.claude/state/engineering-os/
.claude/settings.local.json
```

## Project structure

```
agents/          — lead, builder, reviewer, researcher
commands/        — user-facing slash commands
skills/          — reusable operating behaviors
hooks/           — event logging wiring
scripts/         — CLI tooling and helpers
docs/            — design docs and specs
```

## License

MIT
