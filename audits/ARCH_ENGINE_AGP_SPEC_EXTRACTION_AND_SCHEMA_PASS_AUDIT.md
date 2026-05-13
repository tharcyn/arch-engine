# Arch-Engine AGP Spec Extraction and Schema Pass Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context), specification + schema pass |
| Date | 2026-05-13 |
| Mission | AGP Spec Extraction and Schema Pass |
| Predecessor (MVP spec) | [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](../docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md) |
| Predecessor (roadmap) | [`docs/agp/agp-research-informed-roadmap.md`](../docs/agp/agp-research-informed-roadmap.md) |
| Predecessor audit | [`audits/ARCH_ENGINE_AGP_CANONICAL_BUNDLE_AND_EMITTER_SPEC_AUDIT.md`](./ARCH_ENGINE_AGP_CANONICAL_BUNDLE_AND_EMITTER_SPEC_AUDIT.md) |

---

## 1. Executive Verdict

**`AGP_SPEC_SCHEMA_PASS_READY_FOR_EMITTER_IMPLEMENTATION`**

The MVP specification is now backed by:

- 13 machine-readable JSON schemas (Draft 2020-12) under
  [`docs/agp/schemas/v1/`](../docs/agp/schemas/v1/) covering every
  record family, the snapshot manifest, the record envelope, and the
  convenience bundle object.
- A conformance corpus of **5 valid + 8 invalid fixtures** under
  [`docs/agp/conformance/v1/`](../docs/agp/conformance/v1/) with
  per-fixture READMEs documenting the rule each invalid case
  exercises and the expected verifier verdict.
- Locked defaults for all 10 open questions from the predecessor spec
  ([`docs/agp/agp-schema-open-question-defaults.md`](../docs/agp/agp-schema-open-question-defaults.md)).
- An AGP repo extraction plan
  ([`docs/agp/agp-repo-extraction-plan.md`](../docs/agp/agp-repo-extraction-plan.md))
  defining what moves, what stays, and in what order.

Every JSON file parses. Every NDJSON line parses. Every schema has
the required `$schema`, `$id`, and `title`. All 13 `$id` values are
unique. No `localhost` / `file://` URLs. All fixture directories
have READMEs.

No source code, no package changes, no CLI behavior changes, no
version bumps, no publish, no tag.

The next mission can implement `@arch-engine/agp-emitter@0.1.0`
against the frozen schema corpus.

---

## 2. Scope

Specification + schema + conformance corpus pass only:

- **Created:** 13 JSON Schema files, 1 schemas README, 1 conformance
  corpus README, 13 per-fixture READMEs, 6 fixture `snapshot.json`
  files, 12 fixture `records.ndjson` (or `input-v1.json`) files, 1
  open-question defaults doc, 1 AGP repo extraction plan, this audit.
- **Modified:** 1 line band added to the existing spec's Status table
  cross-linking the new artifacts.
- **NOT created:** any runtime code, any package, any CLI integration,
  any AGP repo, any signing/attestation tooling, any policy engine,
  any verifier implementation.

Out of scope per mission rules: emitter runtime, package creation,
CLI flags, version bumps, npm publish, git tags, AGP repo bootstrap,
@arch-governance dependencies.

---

## 3. Files Created

### Schemas (`docs/agp/schemas/v1/`)

13 files:

- `common.schema.json` — shared `$defs` for the entire corpus.
- `record.schema.json` — base envelope + plane invariant + family dispatch.
- `snapshot.schema.json` — `snapshot.json` shape.
- `agp-bundle.schema.json` — non-canonical convenience bundle.
- `node-record.schema.json`
- `edge-record.schema.json`
- `adapter-evidence-record.schema.json`
- `diagnostic-record.schema.json`
- `drift-record.schema.json`
- `policy-finding-record.schema.json`
- `provenance-record.schema.json`
- `observation-record.schema.json`
- `attestation-record.schema.json`
- `README.md`

### Conformance corpus (`docs/agp/conformance/v1/`)

- `README.md` — verifier rules + verdict vocabulary + hash placeholder policy.

**Valid fixtures (5):**

| Path | Records | Plane mix |
| --- | --- | --- |
| `valid/minimal-inspect-monorepo/` | 5 (2 node, 1 edge, 1 adapter, 1 provenance) | factual×4 + trust×1 |
| `valid/inspect-pnpm-workspace/` | 8 (3 node, 3 edge, 1 adapter, 1 provenance) | factual×7 + trust×1 |
| `valid/inspect-yarn-pnp-workspace/` | 10 (3 node, 3 edge, 1 adapter, 1 diagnostic, 1 observation, 1 provenance) | factual×8 + evidence×1 + trust×1 |
| `valid/check-with-policy-finding/` | 7 (2 node, 1 edge, 1 adapter, 1 diagnostic, 1 policy_finding, 1 provenance) | factual×6 + trust×1 |
| `valid/check-with-drift/` | 7 (2 node, 1 edge, 1 adapter, 2 drift, 1 provenance) | factual×6 + trust×1 |

Each fixture directory contains `README.md`, `snapshot.json`,
`records.ndjson`.

**Invalid fixtures (8):**

| Path | Rule violated | Verdict |
| --- | --- | --- |
| `invalid/json-v1-input-rejected/` | input is not Arch-Engine JSON v2 | n/a (emit rejects) |
| `invalid/absolute-path-rejected/` | absolute path in payload | `invalid` |
| `invalid/missing-payload-hash/` | record envelope missing required field | `invalid` |
| `invalid/invalid-record-id/` | id does not match `agp:family:kind:b3:<64hex>` | `tampered` |
| `invalid/unsupported-schema-version/` | unsupported `agpVersion` / record `schemaVersion` | `unsupported_schema` |
| `invalid/malformed-yarn-pnp-metadata/` | `nodeLinkerSource` not in enum | `invalid` |
| `invalid/snapshot-manifest-mismatch/` | manifest ↔ stream bijection broken | `tampered` |
| `invalid/trust-record-in-factual-digest/` | family/plane invariant violated | `invalid` |

Each fixture directory contains `README.md` and the failing
artifact(s).

### Other documents

- [`docs/agp/agp-schema-open-question-defaults.md`](../docs/agp/agp-schema-open-question-defaults.md) — locked defaults for OQ-1..10.
- [`docs/agp/agp-repo-extraction-plan.md`](../docs/agp/agp-repo-extraction-plan.md) — what moves to AGP repo, in what order.
- [`audits/ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS_AUDIT.md`](./ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS_AUDIT.md) — this file.

---

## 4. Files Modified

- [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](../docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md):
  - Added cross-reference rows to the Status table (schemas,
    conformance corpus, OQ defaults, extraction plan, schema pass
    audit).
  - Added a "Normative boundary" sub-section under Status declaring
    schema-vs-prose precedence.
  - No section content was rewritten; the rest of the spec is
    untouched.

No other files modified. No source, no package.json, no
package-lock.json, no `.gitignore`, no CLI behavior.

---

## 5. Open Question Defaults Locked

All 10 OQs from the predecessor spec now have locked defaults
documented in [`docs/agp/agp-schema-open-question-defaults.md`](../docs/agp/agp-schema-open-question-defaults.md):

| # | Default |
| --- | --- |
| OQ-1 | Convenience `bundle.json` deferred; testing-only schema marked `x-non-canonical: true`. |
| OQ-2 | `findingId` reuses Arch-Engine `data.violations[].id` when present (`v_<hex>`); else `agp-finding:<hash>`. |
| OQ-3 | Empty adapter metadata sub-blocks omitted; monorepo serialises `metadata: {}`. |
| OQ-4 | `shapeHash` optional; required iff input had `graphSurfaceHash`. |
| OQ-5 | `provenance.git.dirty` reflects emit-time. |
| OQ-6 | Emitter package private/experimental at v0.1.0. |
| OQ-7 | AGP repo creation deferred to a follow-on pass; extraction plan written. |
| OQ-8 | Observation records schema-defined, optional in MVP bundles. |
| OQ-9 | Attestation family defined; no MVP fixture requires it. |
| OQ-10 | Verifier implementation in Arch-Engine; reference impl moves to AGP repo later. |

---

## 6. Schema Inventory

| Schema | Validates | Required? | `additionalProperties: false`? |
| --- | --- | --- | --- |
| `common.schema.json` | shared `$defs` only | — | n/a (no top-level type) |
| `record.schema.json` | record envelope + plane invariant + family dispatch | yes (every record) | yes |
| `snapshot.schema.json` | `snapshot.json` | yes (one per bundle) | yes |
| `agp-bundle.schema.json` | convenience `bundle.json` (NON-CANONICAL) | no | yes |
| `node-record.schema.json` | `node` family payload | when family = node | yes |
| `edge-record.schema.json` | `edge` family payload | when family = edge | yes |
| `adapter-evidence-record.schema.json` | `adapter_evidence` family payload + per-adapter metadata variants | when family = adapter_evidence | yes |
| `diagnostic-record.schema.json` | `diagnostic` family payload | when family = diagnostic | yes |
| `drift-record.schema.json` | `drift` family payload | when family = drift | yes |
| `policy-finding-record.schema.json` | `policy_finding` family payload + `derivedFromObservation` invariant | when family = policy_finding | yes |
| `provenance-record.schema.json` | `provenance` family payload | when family = provenance | yes |
| `observation-record.schema.json` | `observation` family payload + `factualMutationAllowed === false` | when family = observation | yes |
| `attestation-record.schema.json` | `attestation` family payload + subject digest shape | when family = attestation | yes |

13 schemas, 13 unique `$id`s (verified by self-consistency check),
all Draft 2020-12.

---

## 7. Record Family Coverage

All 10 record families from the spec have machine-readable schemas:

| Family | Spec §7 | Schema | Has valid fixture? | Has invalid fixture? |
| --- | --- | --- | --- | --- |
| `snapshot` | §7.1 | `snapshot.schema.json` (lives in `snapshot.json`, not records.ndjson) | yes (every valid fixture) | `snapshot-manifest-mismatch`, `unsupported-schema-version` |
| `node` | §7.2 | `node-record.schema.json` | yes (5/5 valid fixtures) | `absolute-path-rejected`, `invalid-record-id`, `missing-payload-hash` |
| `edge` | §7.3 | `edge-record.schema.json` | yes (4/5 valid fixtures) | `snapshot-manifest-mismatch` |
| `adapter_evidence` | §7.4 | `adapter-evidence-record.schema.json` | yes (5/5 valid fixtures) | `malformed-yarn-pnp-metadata` |
| `diagnostic` | §7.5 | `diagnostic-record.schema.json` | yes (2/5 valid fixtures) | — |
| `drift` | §7.6 | `drift-record.schema.json` | yes (1/5 valid fixtures) | — |
| `policy_finding` | §7.7 | `policy-finding-record.schema.json` | yes (1/5 valid fixtures) | — |
| `provenance` | §7.8 | `provenance-record.schema.json` | yes (5/5 valid fixtures) | `trust-record-in-factual-digest` |
| `observation` | §7.9 | `observation-record.schema.json` | yes (1/5 valid fixtures — the yarn-pnp one) | — |
| `attestation` | §7.10 | `attestation-record.schema.json` | no (per OQ-9 default) | — |

The schemas cover all 10 families; the conformance corpus exercises
9 of 10 (attestation deferred per the OQ-9 default).

---

## 8. Valid Fixture Corpus

5 fixtures × 1 snapshot.json + 1 records.ndjson + 1 README = 15
files. Total: 37 records across 5 bundles.

| Fixture | Records | Notable |
| --- | --- | --- |
| `minimal-inspect-monorepo` | 5 | Monorepo adapter with empty `metadata: {}` per OQ-3. No `shapeHash`/`graphSurfaceHash` per OQ-4. |
| `inspect-pnpm-workspace` | 8 | `metadata.pnpm` with all 6 fields. `shapeHash` + `graphSurfaceHash` paired per OQ-4. |
| `inspect-yarn-pnp-workspace` | 10 | `metadata.yarnPnp` with all 11 fields including `nodeLinkerSource: "yarnrc"`. `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` diagnostic. One `observation:llm_summary` record exercising the evidence plane per OQ-8. `featureGates.observations: true`. |
| `check-with-policy-finding` | 7 | `policy_finding:blocking_violation` with `findingId: "v_a1b2c3d4"` per OQ-2 (Arch-Engine id reused). `derivedFromObservation: false`. |
| `check-with-drift` | 7 | Two `drift` records (`edge_added` + `signal_delta`) each carrying baseline + current snapshot anchors. |

---

## 9. Invalid Fixture Corpus

8 fixtures, each with a README documenting the rule violated and the
expected verifier verdict. Coverage spans schema-level failures
(missing fields, malformed enums, wrong id format), structural
failures (manifest/stream mismatch, plane-invariant violations), and
input-validation failures (JSON v1 input).

The complete summary table is in [§4 of the conformance
README](../docs/agp/conformance/v1/README.md#invalid-fixture-expectations).

---

## 10. Conformance Rules

The verifier's required behavior is documented in
[`docs/agp/conformance/v1/README.md`](../docs/agp/conformance/v1/README.md)
under "Minimum verifier responsibilities":

1. **Parse checks** — JSON / NDJSON / UTF-8.
2. **Schema validation** — `snapshot.schema.json` + per-record `record.schema.json`.
3. **Identity verification** — `payloadHash == b3(JCS(payload))` and `id == agp:family:kind:payloadHash`.
4. **Snapshot digest verification** — recompute the canonical projection per spec §11.5.
5. **Bijection check** — manifest ↔ stream one-to-one.
6. **Canonical sort check** — per-family primary-key sort.
7. **Plane invariant** — family → plane.
8. **Absolute-path scan** — no `/`-prefixed paths or Windows drives.
9. **Algorithm prefix check** — only declared prefixes (`b3:`, `sha256:`).
10. **Optional attestation subject check** — when present.

Verdicts: `valid | valid_with_warnings | invalid | unsupported_schema | tampered`.

---

## 11. AGP Repo Extraction Plan

Documented in [`docs/agp/agp-repo-extraction-plan.md`](../docs/agp/agp-repo-extraction-plan.md).

Three sub-passes:

- **A. Spec freeze** — review + lock OQ defaults + create AGP repo +
  copy spec/schemas/corpus.
- **B. Implementation pins frozen spec** — emitter implementation
  references AGP repo schemas (recommended: vendor + CI drift
  check).
- **C. Source migration** — delete schemas/corpus from Arch-Engine,
  replace with pointer doc, keep strategic docs (roadmap, this
  extraction plan).

Versioning: AGP protocol version (`agpVersion` in snapshot) is the
AGP repo's; emitter/verifier package versions are Arch-Engine's.

Six open questions for the bootstrap pass (AGP-1..6) listed in §10
of the extraction plan.

---

## 12. Validation Results

### JSON parse

22 JSON files, **0 failures**:

```
docs/agp/schemas/v1/*.schema.json                              13 files
docs/agp/conformance/v1/{valid,invalid}/*/snapshot.json         6 files
docs/agp/conformance/v1/invalid/json-v1-input-rejected/*.json   2 files
docs/agp/conformance/v1/invalid/unsupported-schema-version/...  1 file
```

### NDJSON parse

12 NDJSON files, 46 total lines, **0 failures**:

```
docs/agp/conformance/v1/valid/check-with-drift/records.ndjson           7
docs/agp/conformance/v1/valid/check-with-policy-finding/records.ndjson  7
docs/agp/conformance/v1/valid/inspect-pnpm-workspace/records.ndjson     8
docs/agp/conformance/v1/valid/inspect-yarn-pnp-workspace/records.ndjson 10
docs/agp/conformance/v1/valid/minimal-inspect-monorepo/records.ndjson   5
docs/agp/conformance/v1/invalid/*/records.ndjson                        7×1 + 1×3 = 9 (one fixture has 3 lines)
```

### Schema self-consistency

All 13 schemas have:
- valid `$schema: ".../draft/2020-12/schema"`
- unique `$id` (13/13, no collisions)
- `title` set
- no `localhost` / `file://` URLs

All 13 conformance fixture directories have `README.md`. Both
top-level READMEs (schemas + conformance corpus) exist.

### NOT validated (out of scope for spec/schema pass)

- BLAKE3 / SHA-256 digest *correctness* — schemas validate shape, not value. Fixtures use placeholder hashes. The future verifier rebuilds the corpus with real digests.
- JCS canonical bytes — schemas validate parsed structure, not byte stream.
- Schema-vs-fixture validation by an Ajv-style validator — deferred to the implementation pass (would require adding a dev dependency).

---

## 13. Compatibility Statement

| Surface | Before this pass | After this pass | Compatibility |
| --- | --- | --- | --- |
| Source code | unchanged | unchanged | **no source changes** |
| Package versions | `@arch-engine/cli@1.4.0`, `adapter-monorepo@1.3.1`, `adapter-pnpm@0.1.1`, `adapter-yarn-pnp@0.1.0` | identical | **no package changes** |
| CLI commands / flags | five commands; v1.4.0 surface | identical | **no CLI changes** |
| JSON v1 envelope | byte-shape | identical | **unchanged** |
| JSON v2 envelope | byte-shape | identical | **unchanged** |
| Adapter selection | precedence 2/3/4 | identical | **unchanged** |
| `graphSurfaceHash` | per-fixture byte-stable | identical | **unchanged** |
| `ARCH_ENGINE_*` codes | 22 codes | identical | **unchanged** |
| AGP runtime dependency | none | none | **unchanged** |
| AGP package | none | none (still not created) | **unchanged** |
| npm publish | none | none | **no publish** |
| Git tag | none | none | **no tag** |
| Generated artifacts staged | none | none | **clean** |

This is a docs-only pass. The Arch-Engine product surface is bit-for-bit
identical to v1.4.0.

---

## 14. Remaining Open Questions

None of the OQ-1..10 defaults are blocking. They can be revisited
during stakeholder review without invalidating v1 bundles produced
under them.

The AGP repo bootstrap pass identifies six new open questions
(AGP-1..6) in the extraction plan §10. None block emitter
implementation; they block AGP repo creation. The emitter
implementation can proceed against the in-Arch-Engine schemas
today.

**No question blocks the next implementation mission.**

---

## 15. Recommended Next Mission

**`ARCH_ENGINE_AGP_EMITTER_MVP_IMPLEMENTATION_PASS`**

Justification:

- The spec is locked in machine-readable form.
- The schemas validate envelope/payload shape for every family.
- The conformance corpus has 5 valid + 8 invalid fixtures with
  documented verdicts.
- Locked OQ defaults remove implementation ambiguity for every
  question the predecessor spec recorded.
- The AGP repo extraction plan documents how the implementation
  package will later vendor or depend on the frozen schemas.

The next mission would:

1. Create `packages/agp-emitter/` workspace package (private /
   experimental at v0.1.0, per OQ-6).
2. Implement programmatic API + `agp-emit` CLI binary.
3. Wire fixtures from `docs/agp/conformance/v1/valid/` as the
   emitter's golden output corpus.
4. Wire fixtures from `docs/agp/conformance/v1/invalid/` as the
   emitter's rejection-path test corpus.
5. Add an Ajv-based schema validator to the test suite.
6. Real-repo trial against the 11-repo v1.4.0 trial JSON outputs.

### Alternative missions

- **`AGP_REPO_BOOTSTRAP_AND_SPEC_IMPORT_PASS`** — create the AGP
  repo skeleton, copy spec/schemas/corpus, and freeze v1 before
  any emitter implementation lands. Suitable if multi-organisation
  governance is a higher priority than a working emitter.
- **`AGP_OPEN_QUESTION_RESOLUTION_PASS`** — stakeholder review of the
  10 OQ defaults locked here. Suitable if alignment is the
  bottleneck.

The recommended path is the emitter implementation because:

- The defaults locked here are sound enough to drive code.
- A working emitter + real-repo trial provides much stronger
  evidence than further spec review.
- AGP repo bootstrap can run in parallel once the emitter validates
  the schema shape.

---

## 16. Commands Run

```bash
# Phase 1 — preflight
git status --short
git log --oneline --decorate -n 10
git tag --list "arch-engine-v1.4.0"
npm view @arch-engine/cli@1.4.0 version

# Phase 2/3 — inventory
grep -n "^## \\|^### " docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md

# Phase 4–13 — schema + corpus authoring
mkdir -p docs/agp/schemas/v1 docs/agp/conformance/v1/{valid,invalid}/*

# Phase 16 — JSON / NDJSON parse validation (Node, no new dependencies)
node - <<'EOF'
  # walks docs/agp/schemas/v1 and docs/agp/conformance/v1
  # parses every .json and .ndjson
  # exits non-zero on any parse failure
EOF
# Result: 22 JSON files OK, 12 NDJSON files (46 lines) OK.

# Phase 17 — self-consistency check
node - <<'EOF'
  # every schema has $schema (Draft 2020-12), $id (unique, no localhost), title
  # every fixture dir has README.md
  # top-level schemas/conformance READMEs exist
EOF
# Result: 13 schemas with unique $id, all checks PASS.

git status --short
git diff --name-only | grep -E "packages/|package.json|package-lock.json|dist|node_modules|\.tgz|\.arch-engine" || echo "clean"
```

No `npm install`, no `npm run build`, no `npm test`, no `npm publish`,
no `git tag`, no source changes.

---

*End of AGP Spec Extraction and Schema Pass Audit.*
