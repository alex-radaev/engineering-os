# Repo Deployer Config (example)

Reference shape for `.claude/crew/deployer.md`. You don't need to hand-copy this — the Crew deployer will ask you for these values conversationally on first `/crew:ship` in a repo with no config. This doc is for humans who want to see the full shape.

The core Crew `deployer` agent is platform-agnostic — all concrete commands, URLs, and auth details live in the per-repo config file.

## Targets

One block per environment the repo can reach.

### dev

- `stable: true` — auto-continue after review in `/crew:build-feature`. Default `false`.
- `trigger: gh workflow run deploy-dev.yml --ref <branch>` — the CI/CD command that starts the dev pipeline. On the allow-list.
- `url: https://telemetry-consumer-aa-dev.run.app` — deployed URL or endpoint.
- `validation_script: scripts/smoke-dev.sh` — repo-relative path to the script validator runs post-deploy. Builder-authored, versioned with the code.
- `auth: ambient` — or `gcloud_adc`, `service_account_key`, etc.
- `auth_setup_command: gcloud auth application-default login` — optional; the exact command a user runs once on a new machine to get auth. Used when validator hits an auth error.

### stg

- `stable: false` — stg changes merit a user nod before triggering.
- `trigger: gh workflow run deploy-stg.yml --ref main`
- `url: https://telemetry-consumer-aa-stg.run.app`
- `validation_script: scripts/smoke-stg.sh`
- `auth: ambient`

### prod

- `stable: false` — prod always requires explicit user approval per workflow Gate Defaults.
- `trigger: gh workflow run promote-prod.yml --ref main`
- `url: https://telemetry-consumer-aa.run.app`
- `validation_script: scripts/smoke-prod.sh`
- `auth: ambient`
- Prod policy: every trigger requires user approval acknowledged in evidence. No rollback without user approval.

## Allow-list (actions deployer may run without extra approval)

- Any `trigger` command listed above under Targets.
- Watch a pipeline run to completion: `gh run watch <run-id>`
- Read deploy service status: `gcloud run services describe <service> --region=<region> --format=json`
- Execute the declared `validation_script` against the deployed target.

## Not allowed (requires per-action user approval)

- Direct infra mutations: `kubectl apply`, `terraform apply`, `gcloud run deploy --image=...`, equivalent for your platform.
- Prod promotion triggers (always user-approved).
- Secret writes, IAM changes, DB migrations against shared infra.
- Publishing messages / writing rows to stg or prod datastores outside what the `validation_script` does.

## Prerequisites before deploy

- PR merged or target branch has CI green.
- Review artifact exists (review gate).
- Build-feature's unit + local-run validation passed (those gates).

## Evidence to persist

Deployer writes to `.claude/artifacts/crew/deployments/evidence/<slug>/`:
- Trigger command + resulting pipeline run URL
- Final status + revision or rollout identifier
- Any rollback command used, if applicable

Validator writes to `.claude/artifacts/crew/validations/evidence/<slug>/`:
- `validation_script` path + full stdout/stderr + exit code
- Response excerpts for any HTTP probes the script made
