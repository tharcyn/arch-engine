# AGP v1 JSON Schemas

**Spec:** [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](../../agp-canonical-bundle-and-emitter-mvp-spec.md)
**Open-question defaults:** [`docs/agp/agp-schema-open-question-defaults.md`](../../agp-schema-open-question-defaults.md)
**Conformance corpus:** [`docs/agp/conformance/v1/`](../../conformance/v1/)
**Schema draft:** JSON Schema **Draft 2020-12**
**AGP protocol version:** **1.0.0** (locked by this corpus)
**Status:** Draft v1 — machine-readable, normatively backing the MVP spec for shape; hashing/canonicalization equations remain in the prose spec until the verifier implementation lands.

---

## Schema index

| File | Validates | Notes |
| --- | --- | --- |
| [`common.schema.json`](./common.schema.json) | Shared primitive `$defs` | Referenced via `$ref` by every other schema. Never used as a top-level schema. |
| [`record.schema.json`](./record.schema.json) | One record from `records.ndjson` | Base envelope + plane invariant + family-dispatch via `oneOf`. |
| [`snapshot.schema.json`](./snapshot.schema.json) | `snapshot.json` | Manifest + counts + featureGates + canonicalization/hashing declarations. |
| [`agp-bundle.schema.json`](./agp-bundle.schema.json) | Convenience `bundle.json` | **Non-canonical.** Marked `"x-non-canonical": true`. Used for fixture testing only. |
| [`node-record.schema.json`](./node-record.schema.json) | `node` family records | Factual; `kind: package` in MVP. |
| [`edge-record.schema.json`](./edge-record.schema.json) | `edge` family records | Factual; `kind: depends_on`, `type: workspace_dependency`. |
| [`adapter-evidence-record.schema.json`](./adapter-evidence-record.schema.json) | `adapter_evidence` records | Factual; carries `metadata.pnpm` / `metadata.yarnPnp` sub-blocks. |
| [`diagnostic-record.schema.json`](./diagnostic-record.schema.json) | `diagnostic` records | Factual; `code` matches `ARCH_ENGINE_*` or `AGP_EMITTER_*`. |
| [`drift-record.schema.json`](./drift-record.schema.json) | `drift` records | Factual; one record per individual delta. |
| [`policy-finding-record.schema.json`](./policy-finding-record.schema.json) | `policy_finding` records | Factual; `derivedFromObservation` flag forces `evidenceRecordIds`. |
| [`provenance-record.schema.json`](./provenance-record.schema.json) | `provenance` records | Trust plane; excluded from `snapshotDigest`. |
| [`observation-record.schema.json`](./observation-record.schema.json) | `observation` records | Evidence plane; `factualMutationAllowed` MUST be `false` or absent. |
| [`attestation-record.schema.json`](./attestation-record.schema.json) | `attestation` records | Trust plane; references an off-record DSSE envelope. |

---

## Canonical vs convenience layout

Canonical AGP bundle on disk:

```
agp/
  snapshot.json          ← snapshot.schema.json
  records.ndjson         ← one record per line; each validated by record.schema.json
```

Convenience single-JSON form (testing only):

```
agp/
  bundle.json            ← agp-bundle.schema.json
```

The bundle convenience form is **not the wire format**. Its
`snapshot.snapshotDigest` MUST equal the digest derived from the
canonical `snapshot.json` projection (spec §11.5).

---

## How schemas map to record families

The base `record.schema.json` uses a **two-step dispatch**:

1. **Plane invariant** (`allOf[0]`): the `family` and `plane` fields must
   agree:
   - `node`, `edge`, `adapter_evidence`, `diagnostic`, `drift`,
     `policy_finding` → `plane: "factual"`
   - `provenance`, `attestation` → `plane: "trust"`
   - `observation` → `plane: "evidence"`
2. **Family payload dispatch** (`allOf[1]`): based on `family`, the
   record is delegated to the corresponding family schema.

Each family schema validates:

- The exact `family` constant.
- The allowed `kind` enum for that family.
- The payload shape required by that family.

Family schemas do **not** re-declare every envelope field — they validate
the *additional* shape on top of the base envelope. The combined effect
is `record.schema.json ∧ <family>-record.schema.json`.

---

## Extension rules

| Change | Effect on AGP version |
| --- | --- |
| Add an optional field to a record payload | none (additive) |
| Add a new `kind` value to an existing family's enum | minor bump |
| Add a new family | minor bump |
| Add a new hash algorithm prefix to `common.HashAlgorithmPrefix` | minor bump |
| Remove a required field | major bump |
| Rename a field | major bump |
| Change the snapshot digest derivation | major bump |
| Change the canonicalization algorithm | major bump |
| Change `$id` URL scheme | major bump (URL stability is a contract) |

Future minor versions live alongside v1 in `docs/agp/schemas/v2/`,
`v1.1/`, etc. — the v1 corpus is frozen once shipped to the AGP repo
(see [`agp-repo-extraction-plan.md`](../../agp-repo-extraction-plan.md)).

---

## Compatibility rules

- **Verifier acceptance:** a verifier of AGP protocol version P MUST
  accept any bundle whose `agpVersion` major matches P's major and
  whose schema versions are subsets of the verifier's known schemas.
- **Unknown optional fields:** verifier MUST tolerate (ignore) unknown
  optional fields under any object that doesn't use
  `additionalProperties: false`. The v1 schemas use
  `additionalProperties: false` on protocol-critical objects to make
  the unknown-field policy explicit at each boundary.
- **Plane invariant:** the verifier MUST enforce the family → plane
  mapping in both `records.ndjson` and `snapshot.payload.records[]`.
- **Cross-reference:** every record id listed in
  `snapshot.payload.records[]` MUST appear in `records.ndjson`, and
  vice versa, with byte-identical `family`/`kind`/`plane`/`payloadHash`.

---

## Non-goals (schemas DO NOT validate)

The JSON Schema layer cannot enforce the following — they are
verifier-level checks documented in
[`conformance/v1/README.md`](../../conformance/v1/README.md):

1. **`payloadHash` recomputation:** schemas cannot compute
   `b3(JCS(payload))` and compare. The verifier MUST.
2. **`id` formula recomputation:** schemas can constrain the *pattern*
   of `id` but cannot prove `id == "agp:" + family + ":" + kind + ":" + payloadHash`.
3. **`snapshotDigest` derivation:** schemas can validate the *shape* of
   the snapshot but not the recomputed SHA-256.
4. **NDJSON sort order:** schemas validate one record at a time; the
   verifier must check the lexicographic `(family, kind, primaryKey, payloadHash)` sort.
5. **JCS canonicalization byte equality:** schemas validate parsed
   structure, not byte stream.
6. **NFC Unicode normalization** of string fields.
7. **Manifest ↔ stream bijection** (every record in `records.ndjson` is
   referenced by `snapshot.payload.records[]` exactly once, and vice
   versa).
8. **Absolute-path leakage scan** beyond the schema pattern on path
   fields (`PosixRelativePath`).

These verifier responsibilities are listed in the conformance README's
"Verifier required checks" section.

---

## Locked open-question defaults

The schemas honor the defaults documented in
[`../../agp-schema-open-question-defaults.md`](../../agp-schema-open-question-defaults.md).
Notable consequences:

- `snapshot.payload.shapeHash` and `snapshot.payload.graphSurfaceHash`
  are **both optional**, paired (OQ-4): if `shapeHash` is present,
  `graphSurfaceHash` MUST be present.
- `adapter_evidence.payload.metadata` is `additionalProperties: false`
  with only `pnpm` and `yarnPnp` sub-blocks declared (OQ-3).
  Monorepo-sourced bundles serialise an empty metadata object.
- `policy_finding.payload.findingId` accepts `v_<hex>` (reused
  Arch-Engine id) OR `agp-finding:<hex>` (derived) per OQ-2.
- `observation.payload.factualMutationAllowed` is locked to `false` /
  absent (OQ-8): structural impossibility for an observation to mutate
  factual records.
- `attestation` records exist but **no v1 valid fixture requires one**
  (OQ-9).

---

## Validation

Every file in this directory has been parse-validated as JSON. The
self-consistency check (see audit) verifies:

- All schemas parse.
- Each `$id` is unique.
- Each schema has `$schema` and `title`.
- No `localhost` / `file://` `$id` URLs.

Schema-vs-fixture validation against the
[`conformance/v1/`](../../conformance/v1/) corpus is documented in
the audit and is intended to be wired into the future
`@arch-engine/agp-verifier` package's test suite.
