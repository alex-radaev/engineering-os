---
name: writing-claude-md
description: Use when adding or updating CLAUDE.md entries to keep them concise and useful.
---

# Writing CLAUDE.md Entries

CLAUDE.md is the first thing an agent reads. Every line competes for attention.

## Rules

1. **Repo CLAUDE.md is for repo-specific rules only.** Generic workflow or conventions go in `~/.claude/CLAUDE.md` (global) or this plugin's skills/agents.
2. **Keep entries short.** One-liners over paragraphs. Commands over explanations.
3. **Only add what the agent needs every session.** Good: known bugs that affect repo integrity, critical safety rules. Bad: one-time procedures, context an agent can discover from code.
4. **Detail goes in artifacts.** More than 2-3 lines → put in `.claude/artifacts/` and reference with `@path/to/file.md`.
