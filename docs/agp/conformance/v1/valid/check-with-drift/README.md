# Valid fixture: `check-with-drift`

**Source:** `arch-engine check --json --json-schema=v2 --baseline baseline.json`.
**Adapter selected:** `@arch-engine/adapter-monorepo@1.3.1`.
**Verifier verdict:** `valid`.
**Source exit code:** `0` (drift is informational unless violations are
new and blocking).

## What it exercises

- One `drift:edge_added` record carrying baseline+current
  `snapshotDigest` and `graphSurfaceHash` anchors.
- One `drift:signal_delta` record summarising scalar deltas
  (`graphSurfaceHashChanged: true`).
- Demonstrates that drift records are individual deltas, not nested
  blocks (per spec §7.6 / §12.6).

## Files

- `snapshot.json` — manifest with 6 factual + 1 trust record.
- `records.ndjson` — 7 records sorted per spec §10.4.

## Hash notes

Placeholders as in the other valid fixtures.
