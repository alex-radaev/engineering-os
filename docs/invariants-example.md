# Repo Invariants (example)

Reference shape for `.claude/crew/invariants.md`. Optional per repo. When present, the reviewer is required to read it and check any diff against listed invariants.

An invariant names a contract that cannot drift inside this repo without a matching change somewhere else. Common cases:
- Redis keyspace shared with a sibling consumer in another language
- BigQuery table schema read by a consumer repo and written by a producer repo
- PubSub message shape published by one repo and subscribed by another
- Enum values or canonical strings shared across repo boundaries
- Env var names read by external infra (terraform, helm, Cloud Run YAML in another repo)

## Shape

One entry per invariant. Keep short — the reviewer uses this as a checklist, not a novel.

### redis-cleaned-key-format

- pattern: `internal/models/redirect_event_cleaned.go` (lines matching `fmt.Sprintf\(".*redirect_event_cleaned.*"`)
- invariant: The Redis key format is `<env>::redirect_event_cleaned::<dsp_auction_id>`. Changing it de-dupes against disjoint state from the Python consumer.
- siblings: `telemetry-consumer` (Python) — owns the matching key format.
- severity: breaking — any diff that changes the format here requires a coordinated change in the sibling repo and a deploy plan that rolls them together.

### redis-expiration-env-var

- pattern: `internal/config/config.go` (any rename/removal of `ADDIT_REDIRECT_REDIS_EXPIRATION`)
- invariant: The env var name must match what the deployed service's runtime config sets (Cloud Run YAML, terraform, helm values — lives outside this repo). Renames here are inert until external infra flips.
- siblings: deploy-config repo (or infra manifests wherever `ADDIT_REDIRECT_REDIS_EXPIRATION` / `REDIS_EXPIRATION` are set on the service).
- severity: silent-drift — the code keeps working with the default value; prod behavior changes without any alarm.

### pubsub-telemetry-shape

- pattern: any file under `internal/models/` defining PubSub attributes the telemetry pipeline consumes.
- invariant: New required attributes break every subscriber that doesn't know them yet. Optional/additive attributes are safe.
- siblings: `telemetry-api-aa`, `telemetry-consumer-aa`.
- severity: breaking if required, safe if optional.

## Reviewer protocol

When `.claude/crew/invariants.md` exists, the reviewer:
1. Reads this file.
2. For each invariant, checks whether the current diff touches the `pattern`.
3. If yes, cites the invariant in the review result and verifies either (a) the invariant is preserved, or (b) the handoff explicitly names the sibling change required and the lead carries it forward into final-synthesis `External Deltas`.
4. Unaddressed invariant drift is a default reject.
