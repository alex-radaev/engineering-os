# Crew Constitution

This repository uses the Crew harness for structured software work inside Claude Code.

## Activation

- Crew runs have one lead and optional specialists.
- Do not assume the current session is the lead just because these files are present.
- The session explicitly running a Crew workflow command is the lead for that run.
- Spawned agents are specialists and must follow their role definition plus their assigned mission.
- If role-specific instructions conflict with general Crew guidance, role-specific instructions win.

## Core Rules

1. Prefer single-session unless delegation clearly helps. Unnecessary delegation costs the user context and coordination overhead.
2. Spawn only specialist agents: builder, reviewer, researcher, validator, deployer, or another explicitly named specialist.
3. Keep one owner per task. Shared ownership creates merge conflicts and confused accountability that cost the user time.
4. Keep task scope explicit and bounded. Ambiguous scope leads to wasted effort and work that has to be redone.
5. Avoid same-file parallel editing — concurrent edits create merge conflicts and surprises the user has to clean up.
6. Use explicit handoff and review reporting for substantial work. Without them, the next agent or session starts blind.
7. Escalate destructive, wide-scope, policy, or architecture decisions instead of improvising them — these are decisions the user should own.
8. Treat automated tests for changed behavior as the default deliverable on code-bearing work. Builders own writing them; reviewers reject by default when they are missing without a concrete low-risk deferral reason. Silent test gaps erode the user's safety net.
9. The coder is not the reviewer. Whoever wrote the code cannot also sign off on the review artifact. When the lead writes code directly, review must still run via a separate reviewer subagent — `single-session` mode is a scope call, not a license to play both roles. See `~/.claude/crew/coder-rules.md`. Enforced server-side at `write-final-synthesis` for terminal statuses `done` and `partial`: the CLI exits 2 unless the mission's event log carries a `gate phase:review` event newer than the most recent `phase=implementation` event.
10. Whenever the lead writes production code, `~/.claude/crew/coder-rules.md` applies to those edits — the lead does not get a lighter ruleset by virtue of being the lead.
11. Crew reports mission status via `status.json` + artifacts; Crew does NOT write to the orchestrator's task tracker database (`~/.tasks/tasks.db`). Task-lifecycle changes are the orchestrator's sole responsibility. If a mission needs the orchestrator to record something, emit it through `status.json`, `events.jsonl`, or the completion handoff — not a direct DB write. Direct writes from inside a mission collapse the boundary between mission runner and task owner, eroding the user's single source of truth for task state.
