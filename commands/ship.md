---
description: Ship through merge, deploy, and evidence gates.
---

# Ship Work In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. If the prompt begins with `ORCHESTRATOR_MISSION`, parse it per `workflow.md § Mission Envelope` before restating goal/scope. Record `mission_id` and reporting paths in the run brief.
1a. If the envelope is present, call the mission writers (see `workflow.md § Mission Reporting`):
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" record-mission --repo "$PWD" --prompt-file <path-to-envelope-dump>` (or `--envelope-json`).
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" append-mission-event --repo "$PWD" --mission-id <id> --event started --phase deployment --summary "<goal>"`.
    Skip both calls when no envelope is present.
2. Read custom lead guidance per the protocol's Custom Instructions Lookup section (role name: `lead`).
3. First verify the current workspace path:
   - `pwd`
4. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
6. Restate the target revision or PR, the target environment (`dev`, `stg`, or `prod`), and the promotion boundary for this run.
7. Check for the repo's deployer config at `.claude/crew/deployer.md` (same custom-instructions pattern as every other agent). If absent, ask the user conversationally how the repo deploys and write the config in this session. If no deploy CI workflow exists, remind the user to set one up (often copied from a sibling repo) — the deployer triggers pipelines, it does not mutate infra directly.
8. Choose the likely pace: `slow`, `medium`, or `fast`.
9. Choose mode per the workflow Mode Guidance:
   - `dev` behind an existing, pre-approved CI workflow: `single-session` or `assisted single-session` is usually right (trigger + watch + smoke).
   - `stg`: `assisted single-session` with deployer and validator; consider a user nod before triggering.
   - `prod`: `assisted single-session` with deployer and validator; explicit user approval required before triggering the promotion workflow.
10. If the shipping run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
11. Confirm which evidence already exists:
   - review status (review gate)
   - unit + local-run validation status (build-feature gates)
   - target environment readiness (pipeline exists, allow-list covers the trigger)
12. Use deployer as the primary specialist for environment transitions and deployment evidence. The deployer triggers pipelines named in the overlay's allow-list; it does not mutate infra directly.
13. Use validator as the primary specialist for post-deploy integration validation against the deployed environment. The validator runs the repo's declared `validation_script` from the deployer config — it does not invent ad-hoc probes. This is the integration gate — it cannot run until the deploy has landed. The lead must not run the script itself; integration validation is validator-owned so evidence is captured in the standard validation artifact shape.
14. Gate policy by target environment:
    - `dev`: integration validation required post-deploy; light-touch supervision as long as the trigger command is on the overlay allow-list.
    - `stg`: integration validation required post-deploy; prefer a user nod before triggering.
    - `prod`: explicit user approval required before triggering the promotion workflow, acknowledged in the deployment evidence. If approval is missing, stop and surface it.
15. When deployment evidence materially validates the transition, write a deployment artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-deployment-result --repo "$PWD" --title "<short title>" ...`
   - If an envelope is active, fire `append-mission-event --event gate --phase deployment --summary "<outcome>"` after the deployment verdict lands.
16. When post-deploy validation materially validates the result, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
   - If an envelope is active, fire `append-mission-event --event gate --phase deployment --summary "<verdict>"` after the post-deploy validation verdict lands.
17. End with:
   - what was shipped or what blocked shipping
   - environment reached
   - evidence from deployer and validator
   - recommendation: monitor, promote, roll back, or fix
17a. If an envelope is active, before writing the final synthesis:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-mission-status --repo "$PWD" --mission-id <id> --status <done|partial|needs_user|abandoned> --phase deployment --summary "<synthesis summary>" --proposed-task-status <task-status> [--next-action <text>] [--artifact-validation <path>] [--artifact-pr <url>]`
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" append-mission-event --repo "$PWD" --mission-id <id> --event <done|partial|abandoned> --phase deployment --summary "<synthesis summary>"`.
   Skip both when no envelope is present.
18. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>" --external-deltas "<off-repo changes required for this deploy, or 'none'>"`
   - The CLI rejects missing `--external-deltas`. Ship is exactly where silent off-repo drift bites — name the deploy manifest / terraform / IAM / sibling-repo changes this rollout depends on, or pass `none` explicitly.
