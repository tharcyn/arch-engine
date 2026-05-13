# Valid fixture: `check-with-policy-finding`

**Source:** `arch-engine check --json --json-schema=v2` over a yarn-classic
workspace with a `rest-contract` policy pack producing one blocking
violation.
**Adapter selected:** `@arch-engine/adapter-monorepo@1.3.1`.
**Verifier verdict:** `valid` (the bundle is structurally valid; the
*content* declares a blocking violation, which is a policy-level
concern outside the verifier's scope).
**Source exit code:** `1` (`ARCH_ENGINE_BLOCKING_VIOLATION`).

## What it exercises

- `policy_finding:blocking_violation` record with a stable
  Arch-Engine-style `v_<hex>` id (per OQ-2: reuse when present).
- `derivedFromObservation: false` (factual derivation only).
- The matching `diagnostic` record (`ARCH_ENGINE_BLOCKING_VIOLATION`)
  carrying severity `BLOCKING`.
- `snapshot.payload.sourceExitCode: 1`, `sourceStatus: "blocked"`.
- `featureGates.policy: true`.

## Files

- `snapshot.json` — manifest with 6 factual + 1 trust record.
- `records.ndjson` — 7 records sorted per spec §10.4.

## Hash notes

Placeholders as in the other valid fixtures.
