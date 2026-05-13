# AGP v1 Conformance Corpus

**Spec:** [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](../../agp-canonical-bundle-and-emitter-mvp-spec.md)
**Schemas:** [`docs/agp/schemas/v1/`](../../schemas/v1/)
**Open-question defaults:** [`docs/agp/agp-schema-open-question-defaults.md`](../../agp-schema-open-question-defaults.md)
**Status:** Draft v1 — the canonical corpus the future `@arch-engine/agp-verifier` test suite will validate against.

---

## Purpose

The conformance corpus exists to:

1. **Pin the protocol shape independently of any implementation.** If the
   future emitter or verifier drifts from the spec, fixtures break first.
2. **Document the verifier's required behavior by example.** Each
   invalid fixture maps to a verdict and a verifier code.
3. **Enable multi-implementor parity.** A second emitter (Rust, Go,
   Java) can validate against the same corpus.
4. **Provide regression evidence before code lands.** The
   implementation pass writes against fixtures that already exist.

---

## Fixture layout

```
docs/agp/conformance/v1/
├── README.md                          ← this file
├── valid/
│   ├── minimal-inspect-monorepo/      ← smallest plausible bundle
│   ├── inspect-pnpm-workspace/        ← pnpm metadata + graphSurfaceHash
│   ├── inspect-yarn-pnp-workspace/    ← yarnPnp metadata + observation example
│   ├── check-with-policy-finding/     ← blocking violation
│   └── check-with-drift/              ← drift records (edge_added + signal_delta)
└── invalid/
    ├── json-v1-input-rejected/
    ├── absolute-path-rejected/
    ├── missing-payload-hash/
    ├── invalid-record-id/
    ├── unsupported-schema-version/
    ├── malformed-yarn-pnp-metadata/
    ├── snapshot-manifest-mismatch/
    └── trust-record-in-factual-digest/
```

Each fixture directory contains:

- `README.md` — what it exercises and the expected verifier verdict.
- `snapshot.json` and/or `records.ndjson` (or `input-v1.json` for the
  v1-rejection case).
- Optional `expected-rejection.json` / `expected-verdict.json` files
  for clarity.

---

## Valid fixture expectations

Every valid fixture MUST satisfy:

1. `snapshot.json` parses as valid JSON.
2. `snapshot.json` validates against
   [`schemas/v1/snapshot.schema.json`](../../schemas/v1/snapshot.schema.json).
3. Every line of `records.ndjson` parses as valid JSON.
4. Every record validates against
   [`schemas/v1/record.schema.json`](../../schemas/v1/record.schema.json)
   (which dispatches to the family schema).
5. The set of `id` values in `snapshot.payload.records[]` equals the
   set of `id` values in `records.ndjson` (bijection).
6. No record carries an absolute path in any payload field.
7. Plane invariant: family → plane mapping per spec §7.11 holds.
8. The `kind` declared on a record matches the `kind` segment of its
   `id`.

**Note on hash placeholders.** Valid fixtures in this corpus use
**illustrative placeholder hashes** (`b3:0000…`, `sha256:0000…`). The
v1 schemas validate only the *shape* of these (64 hex chars), not
the recomputed values. The future verifier MUST recompute and
compare. The corpus is *schema-valid*; *digest-validity* is a
verifier responsibility.

---

## Invalid fixture expectations

Every invalid fixture documents:

- **The rejection rule** that catches it (schema-level, format-level,
  or verifier-level).
- **The expected verifier verdict** from the enum
  `{ valid, valid_with_warnings, invalid, unsupported_schema, tampered }`.
- **The expected emitter input-validation code** when the rejection
  happens at emit-time (e.g. `AGP_EMITTER_INPUT_NOT_V2`).

Summary table:

| Fixture | Rule violated | Verdict | Emitter code |
| --- | --- | --- | --- |
| `json-v1-input-rejected` | Input is not Arch-Engine JSON v2 | n/a (emitter rejects, no bundle produced) | `AGP_EMITTER_INPUT_NOT_V2` |
| `absolute-path-rejected` | Path is not repo-relative POSIX | `invalid` | `AGP_EMITTER_INPUT_ABSOLUTE_PATH_LEAK` |
| `missing-payload-hash` | Record envelope missing required field | `invalid` | n/a (schema-level) |
| `invalid-record-id` | `id` does not match `agp:family:kind:b3:<64hex>` | `tampered` | n/a (schema-level) |
| `unsupported-schema-version` | Record `schemaVersion` or snapshot `agpVersion` outside supported set | `unsupported_schema` | n/a (verifier-level) |
| `malformed-yarn-pnp-metadata` | `nodeLinkerSource` not in declared enum | `invalid` | n/a (schema-level) |
| `snapshot-manifest-mismatch` | Manifest ↔ stream bijection broken | `tampered` | n/a (verifier-level) |
| `trust-record-in-factual-digest` | Family/plane invariant violated | `invalid` | n/a (schema-level) |

---

## Minimum verifier responsibilities

A v1-conformant verifier MUST implement all of:

### 1. Parse checks

- `snapshot.json` parses as JSON.
- `records.ndjson` parses one JSON object per LF-terminated line.
- All strings are valid UTF-8.

### 2. Schema validation

- `snapshot.json` validates against
  `schemas/v1/snapshot.schema.json`.
- Each `records.ndjson` line validates against
  `schemas/v1/record.schema.json`.

### 3. Identity verification

- Recompute `payloadHash := b3(JCS(record.payload))`.
- Assert `payloadHash` matches the embedded value.
- Assert `id == "agp:" + family + ":" + kind + ":" + payloadHash`.

### 4. Snapshot digest verification

- Take `snapshot.json` parsed.
- Save the embedded `snapshotDigest`.
- Set `snapshot.payload.snapshotDigest := ""`.
- Drop `snapshot.payload.emittedAt`.
- Filter `snapshot.payload.records[]` to factual-plane entries only.
- JCS-canonicalize.
- Compute `sha256(projection)`.
- Assert `"sha256:" + recomputed == embedded`.

### 5. Bijection check

- Every `snapshot.payload.records[].id` appears as a line in `records.ndjson`.
- Every line in `records.ndjson` is referenced by `snapshot.payload.records[]` exactly once.
- `family`, `kind`, `plane`, `payloadHash` agree at every cross-reference.

### 6. Canonical sort check

- `records.ndjson` lines are sorted by
  `(family, kind, primaryKey, payloadHash)` per spec §10.4.
- Primary-key extraction per family:
  - `node` → `payload.nodeId`
  - `edge` → `payload.from + "|" + payload.to + "|" + payload.type`
  - `adapter_evidence` → `payload.name`
  - `diagnostic` → `(severity-rank-desc, payload.code, payload.message)`
  - `drift` → `payload.baseline.snapshotDigest + "|" + payload.current.snapshotDigest + "|" + <kind-subkey>`
  - `policy_finding` → `payload.findingId`
  - `provenance` → `payload.command`
  - `observation` → `(payload.observer.type, payload.observer.model, payload.observer.modelVersion, payload.body.kind)`
  - `attestation` → `payload.kind`

### 7. Plane invariant

- `node`, `edge`, `adapter_evidence`, `diagnostic`, `drift`,
  `policy_finding` records have `plane: "factual"`.
- `provenance`, `attestation` records have `plane: "trust"`.
- `observation` records have `plane: "evidence"`.

### 8. Absolute-path scan

- No record payload contains an absolute path in any string field.
  Regex scan for `/`-prefixed strings outside of `format: uri` fields,
  Windows drive letters (`[A-Z]:`), or backslashes.

### 9. Algorithm prefix check

- Every digest field's algorithm prefix is in the declared
  `common.HashAlgorithmPrefix` enum (`b3`, `sha256`).
- Unknown prefixes → reject as `tampered`.

### 10. Optional attestation subject check

- If an `attestation:dsse_envelope` record exists, its
  `payload.subject.digest.sha256` MUST equal the hex part (after
  `sha256:`) of `snapshot.snapshotDigest`.
- If the attestation file is referenced via `envelopeRef`, the file
  hash at that path SHOULD match `envelopeSha256`.

---

## Verdict vocabulary

The verifier returns exactly one verdict per bundle:

| Verdict | Condition |
| --- | --- |
| `valid` | All required checks pass. |
| `valid_with_warnings` | All required checks pass; one or more *optional* integrity checks failed (e.g. attestation subject unverifiable because envelope is absent). |
| `invalid` | A required schema or structural check failed. |
| `unsupported_schema` | The bundle declares a `schemaVersion` / `agpVersion` outside the verifier's supported set. The verifier MUST distinguish this from `invalid` so callers can decide to upgrade. |
| `tampered` | `snapshotDigest` mismatch, `payloadHash` mismatch, `id` formula mismatch, manifest/stream non-bijection, or undeclared hash algorithm prefix. |

---

## Hash placeholder policy

The valid corpus contains synthetic placeholder hashes. Real BLAKE3
and SHA-256 values cannot be hand-computed reliably, so the v1 corpus
uses `b3:0000…<short-suffix>` and `sha256:0000…<short-suffix>`
placeholders that:

- pass schema pattern checks (`[0-9a-f]{64}`),
- visually distinguish themselves from real digests,
- are stable across re-runs (no random suffix).

The future `@arch-engine/agp-verifier` will:

1. Include a corpus-rebuild tool that regenerates each valid
   fixture's `snapshot.json` and `records.ndjson` with real
   BLAKE3/SHA-256 digests computed deterministically from the
   payloads.
2. Commit the rebuilt fixtures.
3. Run digest verification against the rebuilt corpus as part of CI.

Invalid fixtures generally don't need real digests because they fail
schema or structural checks before digest verification.

---

## Future expansion

When new record families, new edge kinds, new adapters, or new error
codes are added, the corpus expands accordingly:

- Add at least one valid fixture exercising the new shape.
- Add at least one invalid fixture exercising the new rejection rule
  (when applicable).
- Update the verdict summary table.

Schema-pattern updates (e.g. extending the `HashAlgorithmPrefix`
enum) bump the AGP minor version and add fixtures under
`docs/agp/conformance/v1.<minor>/`.
