# Valid fixture: `minimal-inspect-monorepo`

**Source:** `arch-engine inspect --json --json-schema=v2` over a 2-package
yarn-classic / npm workspace repo.
**Adapter selected:** `@arch-engine/adapter-monorepo@1.3.1`.
**Verifier verdict:** `valid`.

## What it exercises

- The smallest plausible bundle: 2 `node` records, 1 `edge` record, 1
  `adapter_evidence` record (monorepo — empty `metadata` sub-object),
  1 `provenance` record. Zero `diagnostic`, `drift`, `policy_finding`,
  `observation`, `attestation` records.
- The `adapter_evidence` record's `metadata` is `{}` (OQ-3: monorepo
  adapter does not surface a sub-block).
- `snapshot.json` `featureGates` all `false`.
- `shapeHash` and `graphSurfaceHash` both **omitted** (input was a
  monorepo `inspect` — `data.topology.canonical.graphSurfaceHash` was
  present in the source JSON v2 but the OQ-4 default keeps `shapeHash`
  optional; this fixture omits both to exercise the "no shape hash"
  path).

## Files

- `snapshot.json` — manifest with 4 factual + 1 trust record.
- `records.ndjson` — 5 records, sorted per spec §10.4.

## Hash notes

Per-record `payloadHash` values and the `snapshotDigest` in this fixture
are **illustrative placeholders** in the `b3:0000…` / `sha256:0000…`
namespace. They have the correct shape (64 lowercase hex chars after
the algorithm prefix) but do NOT match recomputed digests over the
payloads. The future `agp-verify` binary will regenerate this fixture
with real BLAKE3 / SHA-256 digests during its conformance test suite
build, replacing the placeholders.

Schema validation does pass — the patterns in `common.schema.json` only
require shape (`b3:[0-9a-f]{64}`), not numerical correctness.
