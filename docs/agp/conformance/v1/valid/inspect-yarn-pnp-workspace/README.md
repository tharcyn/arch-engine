# Valid fixture: `inspect-yarn-pnp-workspace`

**Source:** `arch-engine inspect --json --json-schema=v2` over a Yarn
Berry / PnP workspace (similar to the `yarn-pnp-basic` fixture).
**Adapter selected:** `@arch-engine/adapter-yarn-pnp@0.1.0`.
**Verifier verdict:** `valid` (with one `WARNING`-severity diagnostic
present, expected for any PnP repo).

## What it exercises

- `adapter_evidence.metadata.yarnPnp` sub-block with all 11 fields,
  including the v0.1.1 trust-polish `nodeLinker`/`nodeLinkerSource`
  pair.
- `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` diagnostic record (always
  emitted on PnP repos).
- Three `node` records, three `edge` records with `protocol: workspace`.
- One `observation` record (LLM summary) exercising the **evidence**
  plane per OQ-8: the observation is in `records.ndjson` but is
  **NOT** in `snapshot.payload.records[]` for the factual-only
  subset that `snapshotDigest` is computed over. (In this fixture
  we still include it in `records[]` for completeness; the verifier
  filters by plane when computing the digest per spec §11.5.)
- `featureGates.observations: true` declares the bundle includes
  evidence-plane content.

## Files

- `snapshot.json` — manifest with 8 factual + 1 trust + 1 evidence record.
- `records.ndjson` — 10 records sorted per spec §10.4.

## Hash notes

Placeholders as in the other valid fixtures.
