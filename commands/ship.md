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
5. Restate the target revision or PR, the target environment, and the promotion boundary for this run.
6. Choose the likely pace: `slow`, `medium`, or `fast`.
7. Choose mode per the workflow Mode Guidance. Treat `assisted single-session` as the default when deployer and validator are the main bounded helpers.
8. If the shipping run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
9. Confirm which evidence already exists:
   - review status
   - validation status
   - target environment readiness
10. Use deployer as the primary specialist for environment transitions and deployment evidence.
11. Use validator as the primary specialist for post-deploy checks or environment verification.
12. If production is affected, ensure explicit user approval exists before promotion per the workflow Gate Defaults. If not, stop before the risky step and surface the missing approval.
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
