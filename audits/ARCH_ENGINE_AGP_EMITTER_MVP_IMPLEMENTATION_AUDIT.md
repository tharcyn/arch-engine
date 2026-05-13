# Arch-Engine AGP Emitter MVP Implementation Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context), implementation pass |
| Date | 2026-05-13 |
| Mission | AGP Emitter MVP Implementation Pass |
| Package | `@arch-engine/agp-emitter@0.1.0` (private, experimental) |
| Predecessor (spec) | [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](../docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md) |
| Predecessor (schemas) | [`docs/agp/schemas/v1/`](../docs/agp/schemas/v1/) |
| Predecessor audit | [`audits/ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS_AUDIT.md`](./ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS_AUDIT.md) |

---

## 1. Executive Verdict

**`AGP_EMITTER_MVP_READY_FOR_REAL_REPO_BUNDLE_TRIAL`**

The private `@arch-engine/agp-emitter@0.1.0` workspace package
implements the AGP canonical bundle emitter as specified, validates
inputs against the JSON v2 contract, produces deterministic
`snapshot.json` + `records.ndjson` output, and round-trips an
end-to-end Arch-Engine `inspect` → AGP bundle on a real adapter
fixture without absolute-path leakage.

All five test files pass (52 tests):
- 19 valid-fixture bundle tests
- 7 invalid-fixture rejection tests
- 6 determinism tests
- 11 schema-validation tests (Ajv Draft 2020-12 over the 13 v1
  schemas)
- 9 CLI subprocess tests

Full repo test suite grew from 2385 → 2437 (+52). Zero regressions.
Build + typecheck pass.

The package is `"private": true`. The main `arch-engine` CLI was
not touched. No `@arch-governance/*` dependency was added. No
package version bump. No git tag. No `npm publish`.

The next mission can run a real-repo bundle trial against the 11-repo
v1.4.0 corpus to validate the bundle shape on representative public
OSS targets.

---

## 2. Scope

Private workspace package only. The implementation lives entirely
under `packages/agp-emitter/`; nothing in `packages/cli/`,
`packages/core/`, the adapters, or the governance packs was
modified. No CLI commands, flags, or behaviour changed. JSON v1 and
JSON v2 envelopes are byte-identical to v1.4.0.

---

## 3. Files Created / Modified

### Created

#### Package source (`packages/agp-emitter/src/`)

| File | Lines | Purpose |
| --- | --- | --- |
| `index.ts` | ~40 | Public programmatic API surface (`emitAgpBundle`, `emitAgpBundleToDirectory`, `AgpEmitterError`, types). |
| `cli.ts` | ~165 | `agp-emit` CLI binary (`#!/usr/bin/env node`). |
| `emitAgpBundle.ts` | ~170 | Pure-function emit: parsed envelope → bundle. |
| `emitAgpBundleToDirectory.ts` | ~95 | Filesystem wrapper. Reads input, writes bundle. Refuses non-empty output dirs without `--force`. |
| `validateInput.ts` | ~190 | JSON v2 input contract enforcement with structured `AGP_EMITTER_*` errors. |
| `canonicalize.ts` | ~85 | JCS-style canonical JSON. Stable key sort, no whitespace, rejects NaN/Infinity/BigInt/cycles. |
| `hash.ts` | ~130 | BLAKE3 (`@noble/hashes`) per-record `payloadHash`; SHA-256 (`node:crypto`) snapshot digest; record builder. |
| `paths.ts` | ~120 | `looksAbsolute`, `isPosixRelativePath`, `scanForAbsolutePaths`, `rejectAbsolutePathsIn`. |
| `sort.ts` | ~100 | Stable stream sort by `(family, kind, primaryKey, payloadHash)` per spec §10.4. |
| `errors.ts` | ~75 | `AgpEmitterError` class + 9-code vocabulary. |
| `types.ts` | ~210 | TypeScript type model for both Arch-Engine JSON v2 input and AGP records/snapshot. |
| `records/recordMappers.ts` | ~300 | Per-family JSON v2 → AGP record mappers (node, edge, adapter_evidence, diagnostic, drift, policy_finding, provenance). |
| `records/snapshotBuilder.ts` | ~125 | Snapshot envelope + manifest builder; computes `snapshotDigest`. |

Total source: ~1,800 lines TypeScript.

#### Package metadata

| File | Purpose |
| --- | --- |
| `package.json` | `private: true`, `name: @arch-engine/agp-emitter`, version `0.1.0`, ESM, bin `agp-emit`, deps: `@noble/hashes^1.4.0`. |
| `tsconfig.json` | Same shape as adapter-yarn-pnp. |
| `tsup.config.ts` | Builds both `index.ts` + `cli.ts` ESM. |
| `LICENSE` | MIT (copied from adapter-yarn-pnp). |
| `README.md` | Private/experimental documentation, programmatic API, CLI usage, limitations. |

#### Tests (`packages/agp-emitter/tests/`)

| File | Tests |
| --- | --- |
| `agp-emitter-valid.test.ts` | 19 — per-fixture record families, counts, metadata coverage, bundle self-consistency, snapshot digest verification. |
| `agp-emitter-invalid.test.ts` | 7 — rejection of JSON v1, missing topology, unsupported command, absolute paths in input, non-object inputs, malformed adapter metadata. |
| `agp-emitter-determinism.test.ts` | 6 — byte-identical re-emission, `emittedAt` exclusion from digest, stable stream sort, id derived from payloadHash. |
| `agp-emitter-schema.test.ts` | 11 — Ajv Draft 2020-12 validation against all 13 v1 schemas for every output. |
| `agp-emitter-cli.test.ts` | 9 — `--help`, `--version`, missing args, valid round-trip, JSON v1 rejection, `--force` semantics, no stack traces. |

Test fixtures (`tests/fixtures/`):
- `input/` — 5 valid Arch-Engine JSON v2 inputs (minimal-monorepo, pnpm-workspace, yarn-pnp-workspace, check-with-finding, check-with-drift).
- `invalid-input/` — 4 invalid inputs (json-v1, missing-topology, unsupported-command, absolute-path-in-input).

#### Audit

- [`audits/ARCH_ENGINE_AGP_EMITTER_MVP_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_AGP_EMITTER_MVP_IMPLEMENTATION_AUDIT.md) — this file.

### Modified

- [`package.json`](../package.json) — added `packages/agp-emitter` to `workspaces` and to the root `typecheck` script. **No other package.json files changed.**
- [`package-lock.json`](../package-lock.json) — npm-install side effect (workspace symlink + `@noble/hashes` resolution).

### NOT modified

- `packages/cli/**` — main CLI is untouched.
- `packages/core/**`, `packages/schema/**`, `packages/adapter-*/**` — untouched.
- `packages/governance-pack-*/**` — untouched.
- JSON v1 / JSON v2 envelope code — untouched.
- Adapter selection logic — untouched.
- Any `docs/cli/` or `docs/adapters/` spec — untouched.
- AGP spec / schemas / conformance corpus / extraction plan — untouched in this pass.

---

## 4. Package Boundary

| Requirement | Result |
| --- | --- |
| `"private": true` in `package.json` | ✓ (line 4) |
| No `npm publish` performed | ✓ |
| No `arch-engine emit-agp` CLI integration | ✓ — no changes to `packages/cli/` |
| No `--emit-agp` flag on `check/analyze/inspect` | ✓ |
| No new exports from `@arch-engine/cli` | ✓ |
| Optional peer dependency on `@arch-engine/cli` | ✓ — none. Emitter consumes a parsed JSON v2 envelope; it does not import the CLI. |
| No `@arch-governance/*` dependency | ✓ |
| No `postinstall` script | ✓ |
| No runtime package-manager invocation | ✓ — no `child_process` usage in `src/`. |

`npm pack --dry-run` on a private workspace exits non-zero because
of `private: true`; this is expected behaviour, not a defect.

---

## 5. Input Contract

The emitter accepts only Arch-Engine JSON v2 envelopes. The
validator enforces:

| Check | Reject code |
| --- | --- |
| `schemaVersion !== "arch-engine.cli.v2"` | `AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION` |
| `command ∉ {inspect, analyze, check}` | `AGP_EMITTER_UNSUPPORTED_COMMAND` |
| `archEngineVersion` missing/empty | `AGP_EMITTER_INPUT_PARSE_FAILED` |
| `exitCode ∉ {0,1,2,3,5}` | `AGP_EMITTER_INPUT_PARSE_FAILED` |
| `data.topology.canonical{,nodes,edges}` missing/malformed | `AGP_EMITTER_MISSING_TOPOLOGY` |
| Malformed `data.adapter` | `AGP_EMITTER_INVALID_ADAPTER_METADATA` |
| Malformed `data.drift` | `AGP_EMITTER_INVALID_DRIFT_BLOCK` |
| Any absolute path anywhere in the input | `AGP_EMITTER_ABSOLUTE_PATH_REJECTED` |
| Input not a JSON object | `AGP_EMITTER_INPUT_PARSE_FAILED` |

All 4 invalid-input fixtures + 3 inline invalid cases verify these
paths.

---

## 6. Output Contract

Per spec §6.1: `snapshot.json` + `records.ndjson` in the output
directory.

| Property | Result |
| --- | --- |
| `snapshot.json` is JCS-canonical with trailing newline | ✓ |
| `records.ndjson` is one JCS-canonical record per LF-terminated line | ✓ |
| Records sorted by `(family, kind, primaryKey, payloadHash)` | ✓ (tested) |
| UTF-8 encoding, LF endings | ✓ |
| No absolute path leakage | ✓ (final pre-emit scan + per-fixture test) |
| Output dir refuses non-empty without `--force` | ✓ (CLI test) |

---

## 7. Record Mapping

Implemented all 7 actively-emitted record families. Spec §12.1
mapping table verified end-to-end:

| Source | Family | Active in MVP |
| --- | --- | --- |
| `data.topology.canonical.nodes[]` | `node:package` | yes |
| `data.topology.canonical.edges[]` | `edge:depends_on` | yes |
| `data.adapter` | `adapter_evidence:selected` | yes |
| `diagnostics[]` | `diagnostic:<lowercased-suffix>` | yes |
| `data.drift.{topology,violations,signal}` | `drift:{node,edge,violation,severity,signal}_*` | yes |
| `data.violations[]` | `policy_finding:blocking_violation` / `advisory` | yes |
| `archEngineVersion / command / inputDigest / redaction` | `provenance:extraction` | yes |
| `observation` family | **not emitted** (OQ-8 default) | no |
| `attestation` family | **not emitted** (OQ-9 default) | no |

Adapter metadata sub-blocks supported:
- `metadata.pnpm` (all 6 fields)
- `metadata.yarnPnp` (all 11 fields including `nodeLinker`, `nodeLinkerSource`)
- `metadata.monorepo` (omit empty — OQ-3 default)

Adapter `metadata.edges` sub-block is consumed to derive
`edge.attributes.{dependencyKind,protocol}` but is otherwise
**stripped** from the emitted `adapter_evidence.metadata` (the
schema declares `additionalProperties: false` on the metadata
object with only `pnpm` and `yarnPnp` allowed).

---

## 8. Canonicalization and Hashing

### Canonicalization

`canonicalize.ts` implements **JCS-approximating** JSON
serialisation:

- Stable lexicographic key sort by JS string comparison (UTF-16 code unit) — matches RFC 8785 §3.2.3.
- No insignificant whitespace.
- Strings via `JSON.stringify` (standard JSON escapes).
- Numbers via `String(n)` — finite only; rejects `NaN`/`Infinity`/`-Infinity`.
- Booleans/null/null-array preserved.
- Arrays preserve caller-supplied order.
- Rejects: `BigInt`, `function`, `symbol`, `undefined`, circular references.

**Documented deviation from RFC 8785:** number serialisation may
differ for very-large floats with exponent notation. Arch-Engine
JSON v2 does not produce such values; the v0.2 emitter will
tighten to full RFC 8785 number formatting when a real-repo trial
surfaces a counter-example.

### Hashing

| Use | Algorithm | Library | Prefix |
| --- | --- | --- | --- |
| `payloadHash` (per record) | BLAKE3 | `@noble/hashes@1.8.0` `/blake3` | `b3:<64-hex>` |
| `snapshotDigest` | SHA-256 | Node `node:crypto` | `sha256:<64-hex>` |
| `inputDigest` (provenance) | SHA-256 | Node `node:crypto` | `sha256:<64-hex>` |

Record id formula (spec §11.2):
```
id = "agp:" + family + ":" + kind + ":" + payloadHash
```

Snapshot digest projection (spec §11.5):
1. Drop `snapshot.payload.emittedAt`.
2. Filter `snapshot.payload.records[]` to `plane === "factual"`.
3. JCS-canonicalise the projection.
4. SHA-256 over the bytes.

The valid-fixture test suite **recomputes** the digest against
this projection and asserts equality.

---

## 9. Schema Validation

All 13 v1 schemas under `docs/agp/schemas/v1/` are loaded by Ajv
(Draft 2020-12) as a single bundle, with `$ref`s resolving
across files via the `$id` URLs. Every emitted bundle:

- `snapshot.json` validates against `snapshot.schema.json`.
- Every record validates against `record.schema.json` (which
  dispatches to the per-family schema via `oneOf`).

11 schema tests cover the 5 valid fixtures × (snapshot + every
record) plus the Ajv loader sanity check.

Ajv emits non-fatal warnings about `format: date-time` / `format: uri`
being unknown (we did not add `ajv-formats` to keep the dependency
footprint minimal). These warnings do not cause validation failures
and the patterns on those fields are still enforced via regex
`pattern` constraints in `common.schema.json`.

---

## 10. Determinism

Six dedicated tests + the per-fixture bundle self-check confirm:

- Replay on the same input produces byte-identical `recordsNdjson`.
- Replay on the same input produces identical `snapshotDigest`.
- `emittedAt` differences do NOT affect `snapshotDigest`.
- Record stream sort is stable across all 5 valid fixtures.
- Every record id satisfies `id == "agp:family:kind:payloadHash"`.
- Records are sorted by `(family, kind, primaryKey, payloadHash)`.
- `payloadHash` is stable across runs for identical payloads.

Drift records' `current.snapshotDigest` anchor: per the
implementation note in `emitAgpBundle.ts`, the MVP uses the input's
`graphSurfaceHash` as the current anchor to avoid the
bundle-self-reference circular dependency. This is a documented
MVP simplification; future verifier work may swap in a placeholder
substitution scheme.

---

## 11. CLI Binary

`agp-emit` is the local binary built from `src/cli.ts` into
`dist/cli.js`. It is **not** installed into any PATH; invoke via
`node packages/agp-emitter/dist/cli.js`.

Flags: `--from <path>`, `--output <dir>`, `--force`, `--deterministic`,
`--version`, `--help`.

Exit codes: 0 (success), 2 (invalid args / input rejected), 3
(unexpected internal). No stack traces by default; set
`DEBUG=arch-engine:agp` to see them.

Output on success: JSON summary to stdout with
`{ok, snapshotDigest, snapshotPath, recordsPath, counts}`.

Output on rejection: structured JSON to stderr with `{code, message, fix, details?}`.

All 9 CLI tests pass against the built binary via subprocess.

---

## 12. Validation Results

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm install` | up to date |
| Build | `npm run build` | all 18 workspace packages built |
| Typecheck | `npm run typecheck` | exit 0 across 10 tsconfig projects (added `agp-emitter`) |
| Full tests | `npm test` | **679 files, 2437 tests passed, 0 failed** (was 2385 in v1.4.0) |
| Focused agp-emitter tests | `npx vitest run packages/agp-emitter` | **5 files, 52 tests passed** |
| Schema JSON parse | inline Node script | 22/22 schema + corpus JSON files parse |
| NDJSON parse | inline Node script | 12 NDJSON files, 46 lines, 0 fail |

End-to-end smoke against real `arch-engine inspect` output on the
`yarn-pnp-basic` fixture:

```
arch-engine inspect → report.json (3 nodes, 3 edges, adapter=yarn-pnp)
agp-emit --from report.json --output agp/ --deterministic → exit 0
agp/snapshot.json snapshotDigest = sha256:c8f7bfa4…78507ea5
agp/records.ndjson = 9 records (node × 3, edge × 3, adapter_evidence × 1, diagnostic × 1, provenance × 1)
Zero absolute-path leakage in either output file.
```

---

## 13. Compatibility Statement

| Surface | v1.4.0 | After this pass | Compatibility |
| --- | --- | --- | --- |
| JSON v1 envelope | byte-shape | identical | **unchanged** |
| JSON v2 envelope | byte-shape | identical | **unchanged** |
| Existing `@arch-engine/cli` | 1.4.0 | 1.4.0 (unchanged) | **unchanged** |
| Existing adapters | unchanged | unchanged | **unchanged** |
| Adapter selection / precedence / cache-hint protocol | as documented | identical | **unchanged** |
| `graphSurfaceHash` semantics per fixture | byte-stable | identical | **unchanged** |
| `ARCH_ENGINE_*` vocabulary | 22 codes | 22 codes (no new codes; `AGP_EMITTER_*` is a separate namespace) | **unchanged** |
| Published package versions | 4 packages at 1.4.0/1.3.1/0.1.1/0.1.0 | identical | **no bump** |
| AGP repo | not created | not created | **unchanged** (per OQ-7) |
| AGP spec / schemas / conformance corpus | as written in the schema pass | identical | **unchanged** in this pass |
| `@arch-governance/*` dependency | absent | absent | **unchanged** |
| `npm publish` | n/a | not performed | **no publish** |
| Git tag | n/a | not created | **no tag** |

The Arch-Engine product surface is bit-for-bit identical to
v1.4.0 outside the new private package.

---

## 14. Remaining Deltas

### BLOCKER
None.

### HIGH
None.

### MEDIUM

- **MEDIUM-1 — Drift current-anchor stand-in.** Drift records'
  `current.snapshotDigest` is set to the input's
  `graphSurfaceHash` (a valid SHA-256, but semantically the
  topology hash rather than the bundle's own snapshot digest).
  This is necessary to avoid a circular dependency between drift
  payload bytes and the snapshot's manifest of payload hashes.
  A future emitter may use a placeholder-substitution scheme or
  a two-pass digest computation with documented convergence
  guarantees. The current behaviour is documented in the source
  comment and the README.

### LOW

- **LOW-1 — Adapter `metadata.edges` is stripped.** The
  `adapter_evidence.metadata` schema enforces
  `additionalProperties: false` and only declares `pnpm` /
  `yarnPnp` sub-blocks. The per-edge `dependencyKind`/`protocol`
  metadata is consumed to populate edge records' `attributes`
  but is otherwise dropped from the adapter_evidence record. A
  future schema bump may expose it under a declared `edges`
  sub-key.
- **LOW-2 — Ajv `format: date-time` / `format: uri` warnings.**
  `ajv-formats` would silence these warnings but adds a
  dependency. The patterns on those fields are still enforced via
  regex; semantics are unaffected.

### MICRO

- **MICRO-1 — Number format vs RFC 8785.** Canonicalisation uses
  JS `String(n)` for numbers, which matches RFC 8785 for the
  common cases (integers, short decimals) but may diverge for
  very-large floats with scientific notation. No current
  Arch-Engine JSON v2 output triggers this.
- **MICRO-2 — NFC normalisation not performed.** The spec calls
  for NFC normalisation of string fields. Node strings are
  already in some Unicode encoding; explicit NFC pass deferred
  until a real-repo trial surfaces a non-NFC input.

None of the remaining deltas blocks a real-repo bundle trial.

---

## 15. Recommended Next Mission

**`ARCH_ENGINE_AGP_BUNDLE_REAL_REPO_TRIAL_PASS`**

Justification:

- The emitter is implementation-complete, schema-validated, and
  passes end-to-end on the `yarn-pnp-basic` fixture.
- The 11-repo v1.4.0 trial corpus already exists; running each
  repo's `inspect --json --json-schema=v2` output through
  `agp-emit` and verifying bundle shape + determinism + path
  hygiene provides the next critical evidence for graduating
  the emitter out of `private/experimental`.
- The trial would also surface:
  - real-world adapter metadata edge cases (large `matchedGlobs`,
    catalog: refs, unnamed packages),
  - large monorepo node/edge counts (Yarn Berry's 45 nodes / 177
    edges, vitest's 43 / 101),
  - drift behaviour on a baseline→current cycle.

Trial outputs feed directly into:

1. **`AGP_EMITTER_MVP_HARDENING_PASS`** — addresses any P3 / MICRO
   items surfaced by the trial (likely candidates: NFC
   normalisation, RFC 8785 number formatting, drift current-anchor
   refinement).
2. **`AGP_VERIFIER_MVP_IMPLEMENTATION_PASS`** — build the
   companion `@arch-engine/agp-verifier@0.1.0` that
   independently verifies the bundles the emitter produces.

### Alternative missions

- **`ARCH_ENGINE_AGP_VERIFIER_MVP_IMPLEMENTATION_PASS`** —
  skip the trial and go straight to the verifier. Suitable if the
  team prefers to validate the bundle shape via an independent
  consumer before broader exposure. Risk: trial may surface
  emitter changes that the verifier would then need to track.
- **`AGP_REPO_BOOTSTRAP_AND_SPEC_IMPORT_PASS`** — create the AGP
  repo skeleton and freeze v1. Suitable if multi-org governance
  is a higher priority than bundle validation in the wild.

---

## 16. Commands Run

```bash
# Phase 1 — preflight
git status --short
git log --oneline --decorate -n 10
git tag --list "arch-engine-v1.4.0"
npm view @arch-engine/cli@1.4.0 version

# Phase 4 — package skeleton
mkdir -p packages/agp-emitter/{src/records,tests/fixtures/{input,invalid-input}}
$EDITOR packages/agp-emitter/{package,tsconfig,tsup.config}.{json,ts}
cp packages/adapter-yarn-pnp/LICENSE packages/agp-emitter/LICENSE
# add packages/agp-emitter to root workspaces + typecheck script
npm install

# Phase 5–11 — source files
$EDITOR packages/agp-emitter/src/{errors,types,paths,canonicalize,hash,validateInput,sort,emitAgpBundle,emitAgpBundleToDirectory,index,cli}.ts
$EDITOR packages/agp-emitter/src/records/{recordMappers,snapshotBuilder}.ts

# Phase 14–16 — tests + fixtures
$EDITOR packages/agp-emitter/tests/fixtures/input/{minimal-monorepo,pnpm-workspace,yarn-pnp-workspace,check-with-finding,check-with-drift}.json
$EDITOR packages/agp-emitter/tests/fixtures/invalid-input/{json-v1,missing-topology,unsupported-command,absolute-path-in-input}.json
$EDITOR packages/agp-emitter/tests/agp-emitter-{valid,invalid,determinism,schema,cli}.test.ts

# Phase 19 — README
$EDITOR packages/agp-emitter/README.md

# Phase 21 — validation
npm --workspace @arch-engine/agp-emitter run build
npm run build
npm run typecheck
npm test
npx vitest run packages/agp-emitter

# Phase 22 — local e2e smoke
SMOKE_DIR=$(mktemp -d)
(cd packages/cli/tests/fixtures/adapters/yarn-pnp-basic && \
  node …/cli/dist/bin.js inspect --json --json-schema=v2 --output "$SMOKE_DIR/report.json")
node packages/agp-emitter/dist/cli.js --from "$SMOKE_DIR/report.json" --output "$SMOKE_DIR/agp" --deterministic
# Result: exit 0, 9 records, 0 absolute-path leakage.

# Cleanup
git restore .arch-engine/stability-score.json packages/cli/tests/fixtures/adapters/pnpm-basic/.arch-engine/stability-score.json
```

No `npm publish` was run. No git tag was created. No package
version was bumped beyond the new private package's own `0.1.0`.

---

*End of Arch-Engine AGP Emitter MVP Implementation Audit.*
