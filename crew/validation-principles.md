# Crew Validation Principles

These principles apply to anyone writing integration-validation scripts under Crew.

Validation scripts are **change-specific** (one per ticket or feature), not repo-wide. A single "smoke the whole service" script gives weak signal on whether *this* change shipped correctly — a generic `/health` pass cannot prove the new fan-out logic fans out, or that the renamed env var is live. Only a change-specific script can.

Who authors: the **builder**, as part of the ticket's deliverables for any service-shaped change. Who runs: the **validator** specialist, via the lead's handoff. The lead passes the script path to the validator; it is not stored in the repo's deployer config.

## Principles

1. Scope to the specific behavior this change added or altered. Broader = less useful signal.
2. Exercise only what is observable from outside the service — deployed URL, dev pubsub topic, read-only query on a dev DB. Internal state requires in-process access the validator does not have.
3. No shared-state writes beyond what the script itself cleans up. Pollution of shared dev state costs other engineers time.
4. Fail loud on unexpected responses. Do not tolerate silent degradation (empty arrays where data was expected, nulls, 204 where a body was required). Prefer strict assertions to permissive ones.
5. Exit code 0 = pass, non-zero = fail. Stderr carries the reason. No ambiguous "mostly passed" — the lead and the user read the exit code.
6. Respect the deployer config's `auth` method — do not hard-code credentials. If the script hits an auth error, surface the config's `auth_setup_command` so the user can run it once on a new machine.
7. The script is the evidence, not a summary of it. Log every request and response (to stdout or the validator's evidence directory). The user must be able to re-read what ran and what the service returned.
8. Disposable by default. Once the ticket ships, the script may be archived, deleted, or kept as regression coverage — repo's call. Treat it as throwaway unless the repo's convention says otherwise.

## When to skip writing a script

- The change has no externally observable behavior (pure refactor, doc-only, test-only).
- The change is purely internal where unit + local-run validation already covers it end-to-end.

If in doubt, write the script. The cost of authoring is low; the cost of a silent regression is high.
