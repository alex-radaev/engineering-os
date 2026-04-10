---
description: Preferred short entry point for moving work through merge, deployment, and post-deploy evidence gates.
---

# Ship In The Lead Workflow

This is the preferred short entry point for moving reviewed work through dev and production with evidence.

Before substantial shipping work:

- `pwd`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" wake-up --repo "$PWD"`
- explicitly verify the returned `repoPath` matches the current working directory before trusting the brief

Expected shape:

1. verify the repo and read bounded wake-up context
2. retrieve existing repo deployment guidance before planning an environment transition
3. if deployment guidance is missing or stale, inspect CI/CD, infra, and deployment files and write durable repo deployment guidance
4. frame the current shipping stage:
   - local work complete?
   - review complete?
   - validation complete?
   - PR ready or merged?
   - dev or prod target?
5. identify what evidence already exists and what gate is still missing
6. use the deployer when environment transition or deployment confirmation is needed
7. write deployment checks as environment evidence is gathered
8. require post-deploy validation when behavior can be exercised meaningfully
9. require explicit user approval before risky production promotion
10. return evidence, residual risk, and the next responsible step

Use deployment checks and workflow state to keep the shipping path legible:

- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge dev_deploy_expected`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge prod_deploy_expected`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" discover-deployment --repo "$PWD"`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-deployment-guidance --repo "$PWD" --title "<short title>" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" write-deployment-check --repo "$PWD" --title "<short title>" ...`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge dev_skipped --note "<reason>"`
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/engineering-os.mjs" mark-badge --repo "$PWD" --badge prod_skipped --note "<reason>"`

Repo deployment guidance should preserve what the repo itself teaches us about shipping:

- build path
- deploy path
- environments
- logs / metrics / alerts / telemetry surfaces
- CI/CD and infra clue files

Deployment checks should capture concrete deployment identity when available:

- target environment
- resource or service name
- service URL
- revision, image, or release identifier
