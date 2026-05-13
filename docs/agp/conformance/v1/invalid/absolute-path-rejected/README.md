# Invalid fixture: `absolute-path-rejected`

**Demonstrates:** any payload field containing an absolute path is rejected.
**Expected rejection reason:** absolute path in a `workspacePath` field.
**Expected future verifier code:** `AGP_EMITTER_INPUT_ABSOLUTE_PATH_LEAK` (severity `ERROR`).
**Verifier verdict if this somehow shipped:** `invalid` (record's payload `nodeId` path violates `PosixRelativePath` pattern).

## Files

- `records.ndjson` — one node record whose `payload.attributes.workspacePath` is `/Users/example/repo/packages/web`. This violates the `PosixRelativePath` pattern in `common.schema.json`.

The verifier MUST flag the offending record id and refuse to verify
the bundle.
