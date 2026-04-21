---
description: Ship through merge, deploy, and evidence gates.
---

# Ship Work In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. Read custom lead guidance per the protocol's Custom Instructions Lookup section (role name: `lead`).
2. First verify the current workspace path:
   - `pwd`
3. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
4. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
5. Restate the target revision or PR, the target environment (`dev`, `stg`, or `prod`), and the promotion boundary for this run.
6. Check for the repo's deployer config at `.claude/crew/deployer.md` (same custom-instructions pattern as every other agent). If absent, ask the user conversationally how the repo deploys and write the config in this session. If no deploy CI workflow exists, remind the user to set one up (often copied from a sibling repo) — the deployer triggers pipelines, it does not mutate infra directly.
7. Choose the likely pace: `slow`, `medium`, or `fast`.
8. Choose mode per the workflow Mode Guidance:
   - `dev` behind an existing, pre-approved CI workflow: `single-session` or `assisted single-session` is usually right (trigger + watch + smoke).
   - `stg`: `assisted single-session` with deployer and validator; consider a user nod before triggering.
   - `prod`: `assisted single-session` with deployer and validator; explicit user approval required before triggering the promotion workflow.
8. If the shipping run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
9. Confirm which evidence already exists:
   - review status (review gate)
   - unit + local-run validation status (build-feature gates)
   - target environment readiness (pipeline exists, allow-list covers the trigger)
10. Use deployer as the primary specialist for environment transitions and deployment evidence. The deployer triggers pipelines named in the overlay's allow-list; it does not mutate infra directly.
11. Use validator as the primary specialist for post-deploy integration validation against the deployed environment. The validator runs the repo's declared `validation_script` from the deployer config — it does not invent ad-hoc probes. This is the integration gate — it cannot run until the deploy has landed. The lead must not run the script itself; integration validation is validator-owned so evidence is captured in the standard validation artifact shape.
12. Gate policy by target environment:
    - `dev`: integration validation required post-deploy; light-touch supervision as long as the trigger command is on the overlay allow-list.
    - `stg`: integration validation required post-deploy; prefer a user nod before triggering.
    - `prod`: explicit user approval required before triggering the promotion workflow, acknowledged in the deployment evidence. If approval is missing, stop and surface it.
13. When deployment evidence materially validates the transition, write a deployment artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-deployment-result --repo "$PWD" --title "<short title>" ...`
14. When post-deploy validation materially validates the result, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
15. End with:
   - what was shipped or what blocked shipping
   - environment reached
   - evidence from deployer and validator
   - recommendation: monitor, promote, roll back, or fix
16. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
