# Invalid fixture: `trust-record-in-factual-digest`

**Demonstrates:** the plane invariant. A `provenance` record MUST have `plane: "trust"`; an `observation` record MUST have `plane: "evidence"`. Wrongly labelling either as `factual` violates `record.schema.json` plane invariant.
**Expected rejection reason:** record envelope's `family`+`plane` pair fails the `oneOf` plane-invariant check in `record.schema.json`.
**Expected future verifier verdict:** `invalid` (schema-level family/plane mismatch).

## Why this matters

The plane invariant is the structural guarantee that toggling ML
observations or changing provenance cannot affect `snapshotDigest`.
If a trust-plane record could be labelled factual, the digest would
become non-deterministic across CI runs.

## Files

- `records.ndjson` — one `provenance` record incorrectly labelled `plane: "factual"`.
