---
description: Ship through merge, deploy, and evidence gates.
---

# Ship Work In Crew Mode

@~/.claude/crew/workflow.md
@~/.claude/crew/protocol.md

You are the lead for this run.

Workflow:

1. Read custom lead guidance in this order, if present:
   - `~/.claude/crew/lead.md`
   - `.claude/crew/lead.md`
2. If a repo-local `.claude/crew/lead.md` exists and conflicts with global guidance, prefer it for this run.
3. First verify the current workspace path:
   - `pwd`
4. Start by reading the repo wake-up brief:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" wake-up --repo "$PWD"`
5. Explicitly confirm the returned `repoPath` matches the current working directory. If it does not, stop and correct the repo context before proceeding.
6. Restate the target revision or PR, the target environment, and the promotion boundary for this run.
7. Choose the likely pace: `slow`, `medium`, or `fast`.
8. Choose one of:
   - `single-session`
   - `assisted single-session`
   - `team run`
    Treat `assisted single-session` as the default when deployer and validator are the main bounded helpers.
9. If the shipping run is substantial enough that future wake-up context will matter, immediately write a run brief with:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-run-brief --repo "$PWD" --title "<short title>" --goal "<goal>" --mode "<mode>" --pace "<pace>"`
10. Confirm which evidence already exists:
   - review status
   - validation status
   - target environment readiness
11. Use deployer as the primary specialist for environment transitions and deployment evidence.
12. Use validator as the primary specialist for post-deploy checks or environment verification.
13. If production is affected, ensure explicit user approval exists before promotion. If not, stop before the risky step and surface the missing approval.
14. When deployment evidence materially validates the transition, write a deployment artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-deployment-result --repo "$PWD" --title "<short title>" ...`
15. When post-deploy validation materially validates the result, write a validation artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-validation-result --repo "$PWD" --title "<short title>" ...`
16. End with:
   - what was shipped or what blocked shipping
   - environment reached
   - evidence from deployer and validator
   - recommendation: monitor, promote, roll back, or fix
17. For substantial work, write a final synthesis artifact:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.mjs" write-final-synthesis --repo "$PWD" --title "<short title>" --summary "<summary>"`
