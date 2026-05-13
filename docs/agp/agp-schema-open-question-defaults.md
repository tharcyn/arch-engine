# AGP Schema Open Question Defaults (v1)

**Companion to:** [`agp-canonical-bundle-and-emitter-mvp-spec.md`](./agp-canonical-bundle-and-emitter-mvp-spec.md) §26.
**Locked by:** Arch-Engine AGP Spec Extraction and Schema Pass, 2026-05-13.
**Status:** **DEFAULTS LOCKED for v1 schema corpus.**

The spec recorded 10 non-blocking open questions. The schema pass locks
working defaults for each so the JSON Schema corpus, conformance
fixtures, and verifier acceptance criteria can be unambiguously
machine-checked. These defaults can be revisited during stakeholder
review or amended via a v1.1 schema pass without invalidating v1
bundles produced under them.

## Locked defaults

| # | Question | Locked default | Effect on v1 schemas |
| --- | --- | --- | --- |
| **OQ-1** | Convenience `bundle.json` in MVP? | **Deferred.** Canonical layout is `snapshot.json` + `records.ndjson`. A non-normative `agp-bundle.schema.json` exists for fixture testing only. | `agp-bundle.schema.json` is explicitly marked `"x-non-canonical": true` and documented as testing-only. |
| **OQ-2** | `policy_finding.findingId` source? | **Reuse** Arch-Engine `data.violations[].id` when present; otherwise derive deterministically from `(ruleId, affectedRecordIds, severity, code)`. | `policy-finding-record.schema.json` requires `findingId` (pattern: `v_<hex>` OR `agp-finding:<hash>`). |
| **OQ-3** | Empty `metadata.monorepo` block? | **Omit.** `adapter_evidence.payload.metadata` is `object`. Adapter-specific sub-keys (`pnpm`, `yarnPnp`) are optional. The monorepo adapter does not surface a sub-block in v1.3.1. | `adapter-evidence-record.schema.json` uses `additionalProperties: false` at the metadata level but defines only the *known* adapter sub-blocks; absent sub-blocks are valid. |
| **OQ-4** | `shapeHash` required or optional? | **Optional.** Required iff input JSON v2 carried `data.topology.canonical.graphSurfaceHash`. | `snapshot.schema.json` makes `shapeHash` optional; valid fixtures with `graphSurfaceHash` carry it, those without omit it. |
| **OQ-5** | `provenance.git.dirty` — emit-time or extract-time? | **Emit-time** (the emitter is the producer of the provenance record). Excluded from `snapshotDigest`. | `provenance-record.schema.json` documents this in the field description; verifier MUST NOT compare across runs. |
| **OQ-6** | Emitter package private or public at v0.1.0? | **Private/experimental** until one real-repo bundle trial passes. The protocol (schemas + conformance) is public. | No effect on schemas. Documented in `agp-repo-extraction-plan.md`. |
| **OQ-7** | Create AGP repo in this pass? | **No.** Extraction subset prepared via `agp-repo-extraction-plan.md`; physical repo creation deferred. | Schemas use stable, future-AGP-repo-compatible `$id` URLs (`https://arch-engine.dev/agp/v1/...`). |
| **OQ-8** | Observation records in MVP bundles? | **Schema-defined**, not emitted by MVP unless explicitly enabled. One valid fixture may include an observation example to exercise the schema. The verifier MUST treat observation absence as valid. | `observation-record.schema.json` exists. Valid fixtures emit zero observations by default. |
| **OQ-9** | Attestation in `records.ndjson` or `attestations/` directory? | **Both.** Family defined for record-level reference. DSSE envelope file lives under `attestations/` at emit time. MVP fixtures emit zero attestation records. | `attestation-record.schema.json` exists; no MVP fixture requires it. |
| **OQ-10** | Verifier in Arch-Engine or AGP repo? | **Implementation later in Arch-Engine** (`@arch-engine/agp-verifier@0.1.0`). Conformance corpus and schemas eventually move to the AGP repo. | No effect on schemas. Documented in extraction plan. |

## Effect on the conformance corpus

The locked defaults map directly onto corpus structure:

- **Valid fixtures:** 5 bundles covering inspect/monorepo, inspect/pnpm, inspect/yarn-pnp, check+policy, check+drift. Each contains only factual + trust records by default. The yarn-pnp fixture optionally contains one observation record to exercise the schema (per OQ-8 default).
- **Invalid fixtures:** 8 negative cases (per spec §11), each documenting the rejection rule and the future verifier verdict code.

## Effect on the verifier acceptance criteria

The verifier MUST:

1. Accept bundles that comply with the locked defaults above.
2. Reject bundles that violate any locked default (e.g. record `id` not matching the canonical formula).
3. Treat the optional fields locked in this doc (`shapeHash`, `nodeLinkerSource`, observation/attestation records) as informational; their absence is valid, their malformed presence is invalid.

## Revisability

The defaults locked here are not part of the AGP v1 wire contract. A
later v1.x amendment pass MAY change a default if the change is
backward-compatible (e.g. adding a new optional field to a record
family). A breaking default change bumps AGP major.

---

*End of AGP Schema Open Question Defaults (v1).*
