# Crew

A Claude Code plugin for lead-guided engineering work with bounded subagents, quality gates, and inspectable handoffs.

The main design document is [system-design.md](/Users/aradaev/Desktop/projects/engineering-os-plugin/docs/system-design.md).

## What it does

Crew gives Claude Code a lead-centered workflow model:

- **lead** — plans, delegates, synthesizes, paces
- **builder** — implements bounded changes within assigned scope
- **reviewer** — validates correctness, regressions, and scope drift
- **researcher** — investigates questions without editing code

Each agent has strict ownership rules, structured start/completion reports, and explicit handoffs.

In practice, the highest-value default mode is:

- one lead stays user-facing
- the lead infers workflow intent from normal conversation
- the lead uses bounded subagents for smaller focused tasks
- reviewer and later validator/deployer act as quality gates

The user should mostly talk to the lead, not manage a menu of agents or remember a command graph.

The next product direction is an evidence-gated validation loop: local validation, review, PR, dev deploy validation, dev logs/metrics, production promotion, and production monitoring. See [validation-loop.md](/Users/aradaev/Desktop/projects/engineering-os-plugin/docs/validation-loop.md).

For the broader implementation order and rename plan, see [product-roadmap.md](/Users/aradaev/Desktop/projects/engineering-os-plugin/docs/product-roadmap.md).

## Commands

The public surface should stay small.

Preferred entry points:

- `/crew:build` — build or extend capability
- `/crew:fix` — investigate and fix broken behavior
- `/crew:review` — run the review phase on completed work
- `/crew:validate` — run the validation phase on runnable or observable behavior
- `/crew:adopt` — adopt an existing repo into the workflow
- `/crew:init` — initialize a new repo with the harness
- `/crew:install` — install or update the managed global framework memory

Legacy compatibility aliases still exist for migration, but they should not be the primary surface:

- `/crew:build-feature`
- `/crew:investigate-bug`
- `/crew:bootstrap-repo`
- `/crew:init-repo`
- `/crew:install-global`

Everything else should be treated as internal, advanced, or debugging-oriented workflow plumbing:

- `parallel-review`
- `wake-up-brief`
- `audit-repo`
- claims / approvals commands
- direct artifact-writing commands

The user should mostly talk to the lead. The lead should infer `build`, `fix`, `review`, `validate`, and later `ship` from normal conversation when the intent is clear.

`/crew:ship` is still a planned future surface, not a live command yet.

## Install

Install via the Claude Code plugin flow:

```
claude plugin install crew
```

For local development, clone and register as a directory marketplace:

```
git clone https://github.com/alex-radaev/engineering-os.git
```

Then add it as a local marketplace in `~/.claude/plugins/known_marketplaces.json`.

### Global setup

Crew keeps one managed global memory copy for framework-level rules:

- `~/.claude/engineering-os/constitution.md`
- `~/.claude/engineering-os/workflow.md`
- `~/.claude/engineering-os/metadata.json`

Project repos should not each get their own copied constitution and workflow. They should keep only repo-specific rules plus repo-local state, artifacts, and hooks.

After installing or updating the plugin, run:

```text
/crew:install
```

This writes or updates the managed global copy and adds `@` references to your global `~/.claude/CLAUDE.md`.

Why this exists:

- Claude memory can import stable files from `~/.claude/`
- plugin install does not automatically rewrite global `CLAUDE.md`
- one managed global copy avoids stale per-repo framework copies

If a plugin update changes constitution or workflow behavior, rerun `/crew:install` once.

### How configuration layers work

| Layer | Location | Scope | Who edits |
|-------|----------|-------|-----------|
| Constitution + workflow | `~/.claude/engineering-os/` | All repos | Plugin-managed global copy |
| Global user rules | `~/.claude/CLAUDE.md` | All repos | User |
| Repo rules | `CLAUDE.md` | This repo | Team |

**Repo CLAUDE.md overrides constitution defaults.** The constitution provides baseline team rules (ownership, review gates, handoffs). Teams customize per-repo via CLAUDE.md without touching the constitution.

### Per-repo bootstrap

To adopt an existing repo into the workflow, use:

```text
/crew:adopt
```

The raw CLI bootstrap command still exists for debugging and scripting:

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
agents/          — lead, builder, reviewer, researcher, validator
commands/        — small public surface plus internal/debug commands
skills/          — reusable operating behaviors
hooks/           — event logging wiring
scripts/         — CLI tooling and helpers
docs/            — design docs and specs
```

## License

MIT
