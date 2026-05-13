# Invalid fixture: `missing-payload-hash`

**Demonstrates:** every record MUST carry `payloadHash`.
**Expected rejection reason:** schema-level missing-required-field on `payloadHash` (per `record.schema.json`).
**Expected future verifier verdict:** `invalid` (record envelope fails schema validation).

## Files

- `records.ndjson` — a node record missing the `payloadHash` field.

This is a schema-only check; the verifier rejects at parse-time.
