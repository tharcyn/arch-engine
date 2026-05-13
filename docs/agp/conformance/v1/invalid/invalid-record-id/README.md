# Invalid fixture: `invalid-record-id`

**Demonstrates:** record `id` MUST match the canonical pattern `agp:<family>:<kind>:b3:<64-hex>`.
**Expected rejection reason:** `id` does not match the pattern (uses `sha256:` prefix instead of `b3:`, or omits the algorithm segment).
**Expected future verifier verdict:** `tampered` — the id formula does not match the embedded `payloadHash`.

## Files

- `records.ndjson` — three records, each with a different malformed `id`:
  1. Wrong algorithm prefix in id (`sha256:` instead of `b3:`).
  2. Missing `agp:` prefix.
  3. Kind in id (`Package`) does not match record kind (`package`).
