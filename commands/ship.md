---
description: Preferred short entry point for moving work through merge, deployment, and post-deploy evidence gates.
---

# Ship In The Lead Workflow

This is the preferred short entry point for moving reviewed work through dev and production with evidence.

Expected shape:

1. verify the repo and read bounded wake-up context
2. frame the current shipping stage:
   - local work complete?
   - review complete?
   - validation complete?
   - PR ready or merged?
   - dev or prod target?
3. identify what evidence already exists and what gate is still missing
4. use the deployer when environment transition or deployment confirmation is needed
5. write deployment checks as environment evidence is gathered
6. require post-deploy validation when behavior can be exercised meaningfully
7. require explicit user approval before risky production promotion
8. return evidence, residual risk, and the next responsible step

Use deployment checks and workflow state to keep the shipping path legible:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge dev_deploy_expected`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge prod_deploy_expected`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-deployment-check --repo "$PWD" --title "<short title>" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge dev_skipped --note "<reason>"`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge prod_skipped --note "<reason>"`

Deployment checks should capture concrete deployment identity when available:

- target environment
- resource or service name
- service URL
- revision, image, or release identifier
