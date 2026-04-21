# Repo Deployer Overlay (example)

Copy this into `.claude/crew/deployer.md` in your repo and fill in the concrete commands + allow-list. The core Crew `deployer` agent is platform-agnostic — it relies on this overlay for every specific.

Keep it short and authoritative: every command on the allow-list is a command the deployer may run without additional user approval. Anything not listed needs the user.

## Targets

- `dev`: `<service-name>` on `<platform>` (e.g. `telemetry-consumer-aa` on Cloud Run in GCP project `aa-dev`)
- `stg`: ...
- `prod`: ...

## Trigger mechanism

Deploys run via the repo's CI/CD pipeline. The deployer triggers pipelines; it does not mutate infra directly.

## Allow-list (the deployer may run these without extra approval)

- Trigger dev deploy from current branch: `gh workflow run deploy-dev.yml --ref <branch>`
- Watch a pipeline run to completion: `gh run watch <run-id>`
- Read deploy service status: `gcloud run services describe <service> --region=<region> --format=json`
- Smoke the dev URL: `curl -fsS https://<dev-url>/health`
- Subscribe to a dev pubsub topic for smoke: `gcloud pubsub subscriptions pull <dev-subscription> --limit=1`

(Replace with the actual commands for your git host, CI, cloud, and service.)

## Not allowed (requires per-action user approval)

- Direct infra mutations: `kubectl apply`, `terraform apply`, `gcloud run deploy --image=...`, equivalent for your platform
- Prod promotion triggers
- Secret writes, IAM changes, DB migrations against shared infra
- Publishing messages / writing rows to stg or prod datastores outside a smoke-test allow-list

## Prerequisites before deploy

- PR merged or target branch has CI green
- Review artifact exists (review gate)
- Build-feature's unit and local-run validation passed (unit + local-run gates)

## Evidence to persist

Write to `.claude/artifacts/crew/deployments/evidence/<slug>/`:

- Trigger command + resulting pipeline run URL
- Final status + revision or rollout identifier
- Post-deploy smoke result (HTTP code + response body excerpt, or equivalent)
- Any rollback command used, if applicable

## Production policy

Prod promotion is not autonomous. The deployer must:

1. Confirm explicit user approval for this specific promotion, acknowledged in evidence.
2. Trigger the promotion workflow named in the allow-list (never a direct infra mutation).
3. Watch the pipeline and gather post-deploy validation before declaring success.
4. If anything red, stop and report — do not attempt rollback without user approval.
