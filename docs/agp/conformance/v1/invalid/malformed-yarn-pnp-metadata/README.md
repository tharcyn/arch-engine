# Invalid fixture: `malformed-yarn-pnp-metadata`

**Demonstrates:** `adapter_evidence.metadata.yarnPnp.nodeLinkerSource` MUST be one of `"yarnrc"`, `"inferred_from_pnp_file"`, or `"absent"`.
**Expected rejection reason:** `nodeLinkerSource: "implicit"` is not a recognised value.
**Expected future verifier verdict:** `invalid` (schema-level enum violation).

## Files

- `records.ndjson` — one `adapter_evidence` record with a malformed `nodeLinkerSource` value.

This demonstrates that the v1.3.1 trust-polish provenance enum is
machine-checkable.
