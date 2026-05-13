# Invalid fixture: `unsupported-schema-version`

**Demonstrates:** unsupported `schemaVersion` MUST be rejected.
**Expected rejection reason:** record envelope declares `schemaVersion: "agp.record.v2"` which is not a known v1 schema version.
**Expected future verifier verdict:** `unsupported_schema`.

## Files

- `records.ndjson` — one node record with `schemaVersion: "agp.record.v2"`.
- `snapshot.json` — a snapshot declaring `agpVersion: "2.0.0"` which the v1 verifier MUST refuse.

The verifier returns `unsupported_schema` rather than `invalid` so
tooling can distinguish "future bundle, upgrade verifier" from
"malformed bundle".
