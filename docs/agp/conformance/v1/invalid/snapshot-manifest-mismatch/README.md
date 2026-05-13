# Invalid fixture: `snapshot-manifest-mismatch`

**Demonstrates:** the snapshot manifest and `records.ndjson` MUST be in
bijection. Every id in the manifest must appear as a line; every line
must appear in the manifest.
**Expected rejection reason:** `snapshot.json` declares a node record id
that does not appear in `records.ndjson`, and `records.ndjson` carries
an edge record not listed in the manifest.
**Expected future verifier verdict:** `tampered` (manifest/stream mismatch is a tamper signal).

## Files

- `snapshot.json` — manifest lists `agp:node:package:b3:...c1` (does not exist) and omits `agp:edge:depends_on:b3:...e1` (which DOES appear in the stream).
- `records.ndjson` — contains the edge record that is not in the manifest.

The verifier's "every record in records.ndjson is referenced exactly
once in snapshot.payload.records[]" check fails in both directions.
