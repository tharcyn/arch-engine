# Valid fixture: `inspect-pnpm-workspace`

**Source:** `arch-engine inspect --json --json-schema=v2` over a 3-package
pnpm workspace (similar to the `pnpm-basic` fixture).
**Adapter selected:** `@arch-engine/adapter-pnpm@0.1.1`.
**Verifier verdict:** `valid`.

## What it exercises

- `adapter_evidence.metadata.pnpm` sub-block — full pnpm metadata
  (`workspaceFile`, `packageManagerVersion`, `lockfilePresent`,
  `catalogsDetected`, `excludedGlobs`, `matchedGlobs`).
- `graphSurfaceHash` carried through verbatim from the source JSON v2.
- `shapeHash` present (paired with `graphSurfaceHash` per OQ-4).
- Three `node` records, three `edge` records covering both
  `dependency` and `devDependency` kinds with `protocol: workspace`.
- Zero diagnostics.

## Files

- `snapshot.json` — manifest with 7 factual + 1 trust record.
- `records.ndjson` — 8 records sorted per spec §10.4.

## Hash notes

Per-record `payloadHash` and `snapshotDigest` are illustrative
placeholders (see the minimal fixture's README for the policy).
`graphSurfaceHash` is a realistic-looking placeholder; the verifier
implementation will recompute it from the source JSON v2.
