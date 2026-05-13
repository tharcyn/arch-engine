# Arch-Engine AGP Verifier MVP Implementation Audit

## 1. Executive Verdict

**`AGP_VERIFIER_MVP_READY_FOR_BUNDLE_VERIFICATION_TRIAL`**

A new private workspace package `@arch-engine/agp-verifier@0.1.0` independently verifies AGP canonical bundles emitted by `@arch-engine/agp-emitter`. Schema validation, hash/identity recomputation, manifest bijection, sort order, plane invariant, path hygiene, algorithm prefix, and optional attestation subject checks all run end-to-end. 58 verifier tests + 52 emitter tests pass; the broader project test suite goes from 2 437 → 2 495 tests, all green. The agp-verify CLI returns the 5 spec verdicts and the 4 documented exit codes.

The package remains **private/experimental**, is **never published**, has no main-CLI integration, and depends on no `@arch-governance/*` surface. The next mission is the real-repo verification trial.

## 2. Scope

Private `@arch-engine/agp-verifier@0.1.0` only. No publish, no tag, no version bump on any other package. No changes to:

- JSON v1
- JSON v2
- Existing Arch-Engine CLI (`packages/cli/src/**`)
- Existing adapters
- Emitter output format
- AGP schemas or conformance corpus
- AGP repo migration

## 3. Files Created/Modified

### Created — package source (22 TypeScript files)

| Path | Purpose |
| --- | --- |
| `packages/agp-verifier/package.json` | Workspace manifest (`private: true`, `bin: agp-verify`) |
| `packages/agp-verifier/tsconfig.json` | TS config, extends `tsconfig.base.json` |
| `packages/agp-verifier/tsup.config.ts` | Bundler config (ESM, Node 18 target) |
| `packages/agp-verifier/README.md` | Package documentation |
| `packages/agp-verifier/src/index.ts` | Public API barrel |
| `packages/agp-verifier/src/cli.ts` | `agp-verify` CLI binary entrypoint |
| `packages/agp-verifier/src/types.ts` | Verifier type model (verdicts, issues, results, options) |
| `packages/agp-verifier/src/errors.ts` | `AGP_VERIFIER_*` issue codes + `AgpVerifierError` |
| `packages/agp-verifier/src/canonicalize.ts` | Independent JCS-style canonicaliser |
| `packages/agp-verifier/src/hash.ts` | Independent BLAKE3 + SHA-256 + digest projection |
| `packages/agp-verifier/src/paths.ts` | Absolute-path scan with URL allow-list |
| `packages/agp-verifier/src/sort.ts` | Sort-order comparator + primary-key extractor |
| `packages/agp-verifier/src/schemas.ts` | Ajv 2020-12 loader for AGP v1 schemas |
| `packages/agp-verifier/src/readBundle.ts` | Filesystem reader for `snapshot.json` + `records.ndjson` |
| `packages/agp-verifier/src/verifyAgpBundle.ts` | Pure verification orchestrator |
| `packages/agp-verifier/src/verifyAgpBundleDirectory.ts` | Filesystem entrypoint wrapper |
| `packages/agp-verifier/src/checks/parseChecks.ts` | Structural checks (empty stream, etc.) |
| `packages/agp-verifier/src/checks/schemaChecks.ts` | Ajv validation + version gates |
| `packages/agp-verifier/src/checks/identityChecks.ts` | Record id format check |
| `packages/agp-verifier/src/checks/hashChecks.ts` | payloadHash recompute + id ↔ formula |
| `packages/agp-verifier/src/checks/manifestChecks.ts` | Bijection + cross-ref + counts + duplicates |
| `packages/agp-verifier/src/checks/sortChecks.ts` | records.ndjson sort order |
| `packages/agp-verifier/src/checks/planeChecks.ts` | Family ↔ plane invariant |
| `packages/agp-verifier/src/checks/pathChecks.ts` | Absolute-path leak scan |
| `packages/agp-verifier/src/checks/digestChecks.ts` | snapshotDigest recompute |
| `packages/agp-verifier/src/checks/attestationChecks.ts` | Optional attestation subject cross-ref |

### Created — tests (6 files / 58 tests)

| Path | Tests |
| --- | --- |
| `packages/agp-verifier/tests/agp-verifier-valid.test.ts` | 11 — valid bundle round-trips (emitter interop) |
| `packages/agp-verifier/tests/agp-verifier-invalid.test.ts` | 11 — synthetic invalid bundles |
| `packages/agp-verifier/tests/agp-verifier-tamper.test.ts` | 10 — emit + mutate + verify (every tamper class) |
| `packages/agp-verifier/tests/agp-verifier-cli.test.ts` | 9 — CLI flags + exit codes + JSON output |
| `packages/agp-verifier/tests/agp-verifier-conformance.test.ts` | 13 — AGP v1 conformance corpus |
| `packages/agp-verifier/tests/agp-verifier-interop.test.ts` | 4 — emitter → verifier loop smoke |

### Created — audit

| Path | Purpose |
| --- | --- |
| `audits/ARCH_ENGINE_AGP_VERIFIER_MVP_IMPLEMENTATION_AUDIT.md` | This document |

### Modified

| Path | Change |
| --- | --- |
| `package.json` | Added `packages/agp-verifier` to `workspaces[]`; added `agp-verifier/tsconfig.json` to `typecheck` script |
| `package-lock.json` | Reflects the new workspace + `ajv@^8.18.0` + `@noble/hashes@^1.4.0` resolutions for the verifier (already present transitively) |

### Not modified

- `packages/cli/**` (main CLI unchanged)
- `packages/agp-emitter/**` (emitter unchanged)
- `packages/adapter-*/**` (adapters unchanged)
- `docs/agp/**` (schemas + conformance unchanged)
- Any existing test (no test weakening)

## 4. Package Boundary

| Property | Value |
| --- | --- |
| Name | `@arch-engine/agp-verifier` |
| Version | `0.1.0` |
| `private` | `true` ✓ |
| `type` | `module` |
| `sideEffects` | `false` |
| `engines.node` | `>=18.0.0` |
| `bin` | `{ "agp-verify": "./dist/cli.js" }` |
| Runtime dependencies | `@noble/hashes ^1.4.0`, `ajv ^8.18.0` |
| Dev dependencies | `tsup ^8.0.0`, `typescript ^5.0.0` |
| `@arch-governance/*` deps | **None** ✓ |
| `@arch-engine/cli` runtime dep | **None** ✓ |
| `@arch-engine/agp-emitter` runtime dep | **None** (used only at test time as a workspace symlink) ✓ |
| publishConfig | absent ✓ |
| postinstall script | absent ✓ |
| Published to npm | **No** ✓ (verified: `npm view @arch-engine/agp-verifier` returns 404) |
| Main CLI integration | **None** ✓ (no `arch-engine verify-agp`, no `--verify-agp` flag) |

## 5. Verification Contract

Checks implemented (spec §16.2 + conformance README §1–§10):

1. **Parse checks** — `snapshot.json` parses; each `records.ndjson` line parses; empty stream rejected.
2. **Version gating** — `agpVersion` major ∈ `{1}`; record `schemaVersion ∈ {"agp.record.v1"}`; snapshot `schemaVersion ∈ {"agp.snapshot.v1"}`.
3. **Schema validation** — Ajv 2020-12 against `docs/agp/schemas/v1/snapshot.schema.json` and `record.schema.json` (which dispatches by family).
4. **Identity format** — record `id` matches `^agp:<family>:<kind>:b3:<64-hex>$`.
5. **Hash recompute** — `payloadHash := b3(JCS(payload))` independently; compared to declared value.
6. **Id formula** — `id == "agp:" + family + ":" + kind + ":" + payloadHash` against the declared payloadHash.
7. **Manifest ↔ records bijection** — every manifest id appears in stream; every stream record appears in manifest; cross-ref `family/kind/plane/payloadHash` agree.
8. **Duplicate detection** — no duplicate ids in stream; no duplicate manifest ids.
9. **Counts consistency** — all 13 declared count fields match the observed stream.
10. **Sort order** — `records.ndjson` sorted by `(family, kind, primaryKey, payloadHash)` per spec §10.4.
11. **Plane invariant** — `node/edge/adapter_evidence/diagnostic/drift/policy_finding` ↔ `factual`; `observation` ↔ `evidence`; `provenance/attestation` ↔ `trust`.
12. **Absolute path scan** — every snapshot/record string field checked; URLs (`http`/`https`/`ftp`/`git+`) and the well-known `$schema/predicateType/repository/homepage/docsHint/url` keys are tolerated; POSIX absolute, Windows drive letters, Windows UNC, and `file://` are flagged.
13. **Snapshot digest** — `sha256(JCS(payload with emittedAt dropped and records[] filtered to factual plane))`, compared to embedded `snapshot.snapshotDigest`.
14. **Algorithm prefix** — `payloadHash` must be `b3:<64-hex>`; `snapshotDigest` must be `sha256:<64-hex>`; unknown prefixes rejected.
15. **Attestation subject (optional)** — if an `attestation` record carries `payload.subject.digest.sha256`, it must equal the hex part of `snapshot.snapshotDigest`. `envelopeRef` is NOT dereferenced (a warning is surfaced).

## 6. Verdict Model

| Verdict | Trigger codes | Exit code |
| --- | --- | --- |
| `valid` | no errors, no warnings | 0 |
| `valid_with_warnings` | warnings only (e.g. `ATTESTATION_ENVELOPE_UNVERIFIED`) | 0 (1 with `--strict`) |
| `invalid` | schema validation, parse, sort order, plane, path leak, unsupported algorithm | 1 |
| `unsupported_schema` | `UNSUPPORTED_AGP_VERSION` or `UNSUPPORTED_SCHEMA_VERSION` | 2 |
| `tampered` | `PAYLOAD_HASH_MISMATCH`, `RECORD_ID_MISMATCH`, `SNAPSHOT_DIGEST_MISMATCH`, `DUPLICATE_RECORD_ID`, `DUPLICATE_MANIFEST_ID`, `MANIFEST_CROSS_REF_MISMATCH`, `ATTESTATION_SUBJECT_MISMATCH` | 1 |

Internal verifier errors → exit 5. Bundle-path / IO errors → exit 2. No stack traces on stderr by default; `DEBUG=arch-engine:agp` enables them.

## 7. Schema Validation

Implementation:

- Ajv 2020-12 (Draft 2020-12) via `ajv/dist/2020.js`.
- All 13 v1 schemas loaded from `docs/agp/schemas/v1/` (snapshot, record, common, 9 family schemas, bundle).
- `validateFormats: false` so missing `ajv-formats` does not break validation; the schemas already pin format-like constraints via `pattern` (e.g. `Timestamp`, `RecordId`, `Blake3Digest`, `Sha256Digest`).
- Schema-root resolution walks up from the package directory and accepts an explicit `options.schemaRoot` or the `AGP_VERIFIER_SCHEMA_ROOT` env override.

Error reporting: each Ajv error becomes one `AGP_VERIFIER_SCHEMA_VALIDATION_FAILED` issue with `instancePath`, `schemaPath`, and the original message.

## 8. Hash and Identity Verification

- **BLAKE3** via `@noble/hashes/blake3` (same dependency as the emitter, but the verifier never imports emitter modules).
- **SHA-256** via Node `crypto.createHash('sha256')`.
- Verifier re-implements the JCS canonicaliser in `packages/agp-verifier/src/canonicalize.ts` independently of the emitter's, so a canonicalisation drift between the two would surface as a digest mismatch.
- For each record: recompute `payloadHash := b3(JCS(payload))`, compare; recompute `id`, compare against the declared `payloadHash`.
- Records that are too malformed to canonicalise (e.g. missing `payload` object) are skipped at the hash step — the schema layer flags them so issues are not double-reported.

## 9. Manifest Bijection

Per spec §16.2 #7 / conformance §5:

- Build `Map<id, manifestEntry>` and `Map<id, record>`.
- For every manifest id not in records → `AGP_VERIFIER_MANIFEST_RECORD_MISSING`.
- For every record id not in manifest → `AGP_VERIFIER_RECORD_NOT_IN_MANIFEST`.
- For every cross-pair, `family/kind/plane/payloadHash` must agree → `AGP_VERIFIER_MANIFEST_CROSS_REF_MISMATCH`.
- Duplicates → `AGP_VERIFIER_DUPLICATE_RECORD_ID` / `AGP_VERIFIER_DUPLICATE_MANIFEST_ID`.
- All 13 `counts.*` fields recomputed and compared → `AGP_VERIFIER_COUNT_MISMATCH`.

## 10. Snapshot Digest Verification

Re-implementation of spec §11.5:

```
1. Take snapshot.payload (parsed).
2. Drop emittedAt.
3. Filter records[] to plane === "factual".
4. JCS-canonicalise.
5. SHA-256.
6. Compare to "sha256:" + recomputed against the embedded
   snapshot.snapshotDigest.
```

Mismatch → `AGP_VERIFIER_SNAPSHOT_DIGEST_MISMATCH`, verdict `tampered`.

The projection is computed against the parsed `snapshot.payload`, not against the raw bytes — this matches the emitter's projection logic and avoids whitespace pitfalls.

## 11. Path Hygiene

Absolute-path detection:

- POSIX `^/`
- Windows drive-letter `^[A-Za-z]:[\\/]?`
- Windows UNC `^\\\\`
- `file://`

Allow-list:

- URL schemes `http://`, `https://`, `ftp://`, `git+`
- Well-known URL-bearing keys: `$schema`, `predicateType`, `homepage`, `repository`, `docsHint`, `url`

False-positive avoidance: only whole-string matches flag a leak; natural-language strings (diagnostic messages, etc.) are not scanned for embedded `/usr/...` substrings.

## 12. Tamper Detection

Test coverage (`agp-verifier-tamper.test.ts` — 10 tests):

| Tamper class | Expected verdict | Expected primary issue |
| --- | --- | --- |
| Payload content mutation | `tampered` | `PAYLOAD_HASH_MISMATCH` |
| payloadHash swapped | `tampered` | `PAYLOAD_HASH_MISMATCH` + `RECORD_ID_MISMATCH` |
| snapshotDigest mutation | `tampered` | `SNAPSHOT_DIGEST_MISMATCH` |
| Record removed from stream | `invalid` / `tampered` | `MANIFEST_RECORD_MISSING` |
| Record added but missing from manifest | `invalid` / `tampered` | `RECORD_NOT_IN_MANIFEST` |
| Duplicate record id | `tampered` | `DUPLICATE_RECORD_ID` |
| Counts fudged | `invalid` / `tampered` | `COUNT_MISMATCH` |
| Stream reorder | `invalid` / `tampered` | `SORT_ORDER_INVALID` |
| Absolute path injected | `invalid` / `tampered` | `ABSOLUTE_PATH_LEAK` |
| `b3:` → `sha1:` prefix swap | `invalid` / `tampered` | `UNSUPPORTED_HASH_ALGORITHM` |

All ten cases pass.

## 13. CLI Binary

`agp-verify` (built as `packages/agp-verifier/dist/cli.js`, declared in `package.json#bin`).

Flags:

| Flag | Effect |
| --- | --- |
| `--bundle <dir>` | Required path to bundle directory |
| `--json` | JSON output on stdout instead of human |
| `--strict` | `valid_with_warnings` becomes exit 1 |
| `--version` | Print verifier version |
| `--help` | Print usage |

Exit codes (confirmed in CLI test suite + manual smoke):

```
valid CLI exit:              0
valid_with_warnings exit:    0   (1 with --strict)
tamper CLI exit:             1
invalid CLI exit:            1
unsupported_schema CLI exit: 2
missing bundle CLI exit:     2
no args CLI exit:            2
internal error exit:         5
```

Human output:

```
AGP bundle verification

Verdict:    valid
Snapshot:   sha256:a53f3af6d49b3d9a449e4b6637b6f64bfbf2d2bd6eec82150d5af7b726d6abee
AGP:        1.0.0
Source cmd: inspect (arch-engine 1.4.0)
Records:    36 (factual=35, evidence=0, trust=1)
Families:   adapter_evidence=1, edge=18, node=16, provenance=1
Algorithms: payload=b3, snapshot=sha256
Checks:     schema ok, hashes ok, manifest ok, paths ok
```

JSON output is the verbatim `AgpVerificationResult`.

## 14. Emitter Interop

End-to-end smoke (`agp-verifier-interop.test.ts` — 4 tests, all passing):

1. Emit a bundle from each emitter fixture (`minimal-monorepo`, `pnpm-workspace`, `yarn-pnp-workspace`, `check-with-finding`, `check-with-drift`); verify in-memory → `valid`.
2. Round-trip through disk (write `snapshot.json` + `records.ndjson`, read via `verifyAgpBundleDirectory`, verify) → `valid`.
3. Disk tamper: mutate `snapshot.snapshotDigest` → `tampered` + `SNAPSHOT_DIGEST_MISMATCH`.
4. Disk tamper: mutate a node record's `nodeId` without updating its hash → `tampered` + `PAYLOAD_HASH_MISMATCH`.

Manual smoke (Phase 26 of the mission):

```
$ node packages/cli/dist/bin.js inspect --json --json-schema=v2 > $TMP/report.json
$ node packages/agp-emitter/dist/cli.js --from $TMP/report.json --output $TMP/agp --deterministic --force
$ node packages/agp-verifier/dist/cli.js --bundle $TMP/agp
Verdict: valid    [exit 0]
$ sed -i 's/snapshotDigest:".../"snapshotDigest":"sha256:aaa..."/' $TMP/agp/snapshot.json
$ node packages/agp-verifier/dist/cli.js --bundle $TMP/agp
Verdict: tampered [exit 1]
```

The protocol trust loop works.

## 15. Validation Results

### `npm install`

```
added 1 package, changed 1 package, and audited 174 packages
```

Single workspace addition; no transitive dependency changes beyond what was already in the lockfile via the emitter.

### `npm run typecheck`

Passes for every package, including the new `packages/agp-verifier/tsconfig.json`.

### `npm run build`

```
DTS Build success in 573ms
ESM dist/cli.js   42.05 KB
ESM dist/index.js 37.13 KB
```

All workspaces build cleanly; the verifier produces ESM `dist/cli.js` + `dist/index.js`.

### `npm test`

```
Test Files  685 passed (685)
     Tests  2495 passed (2495)
```

Up from 679 / 2 437 before this pass (+ 6 files / + 58 tests, exactly the verifier suite). No existing test changed.

### Focused verifier tests

```
✓ packages/agp-verifier/tests/agp-verifier-valid.test.ts        (11 tests)
✓ packages/agp-verifier/tests/agp-verifier-invalid.test.ts      (11 tests)
✓ packages/agp-verifier/tests/agp-verifier-tamper.test.ts       (10 tests)
✓ packages/agp-verifier/tests/agp-verifier-cli.test.ts          (9 tests)
✓ packages/agp-verifier/tests/agp-verifier-conformance.test.ts  (13 tests)
✓ packages/agp-verifier/tests/agp-verifier-interop.test.ts      (4 tests)

Test Files  6 passed (6)
     Tests  58 passed (58)
```

### Focused emitter tests (no regression)

```
Test Files  5 passed (5)
     Tests  52 passed (52)
```

Identical to the pre-pass baseline.

### Pack dry-run

Not run (package is `private: true`; `npm pack` is intentionally not part of the validation flow).

## 16. Compatibility Statement

| Surface | Changed? |
| --- | --- |
| Arch-Engine JSON v1 | **No** |
| Arch-Engine JSON v2 | **No** |
| `@arch-engine/cli@1.4.0` runtime behavior | **No** (no source files modified) |
| Adapters (`adapter-monorepo`, `adapter-pnpm`, `adapter-yarn-pnp`) | **No** |
| `@arch-engine/agp-emitter` output bytes | **No** (no source files modified; all 52 emitter tests still pass) |
| AGP v1 schemas (`docs/agp/schemas/v1/*`) | **No** |
| AGP v1 conformance corpus (`docs/agp/conformance/v1/*`) | **No** |
| Public package versions | **No** (no version bump anywhere) |
| Git tags | **No** new tag |
| npm publish | **No** publish |

Confirmed by `git status --short` showing only `package.json`, `package-lock.json`, and the new `packages/agp-verifier/` tree + audit file.

## 17. Remaining Deltas

| Severity | Item | Notes |
| --- | --- | --- |
| **BLOCKER** | — | None |
| **HIGH** | — | None |
| **MEDIUM** | — | None |
| **LOW** | Real-repo verification trial not yet run | Next mission. The MVP test suite + emitter interop smoke prove the protocol loop; a 10+ public-repo verifier pass is the natural follow-up. |
| **LOW** | Conformance corpus uses placeholder hashes | Documented in `docs/agp/conformance/v1/README.md`. Valid fixtures resolve to `tampered` correctly under the current verifier; a corpus-rebuild tool (out of scope here) would update them to real digests. |
| **MICRO** | No `--schema-root` CLI flag | Programmatic API supports `options.schemaRoot`; the CLI relies on env (`AGP_VERIFIER_SCHEMA_ROOT`) or directory auto-discovery. Acceptable for a private MVP. |
| **MICRO** | No ajv-formats install | `validateFormats: false` keeps the suite lightweight; format-like constraints are already pinned in `common.schema.json` via `pattern`. |
| **MICRO** | `compareRecordsBySortOrder` follows emitter heuristics for `primaryKey` extraction | Independent re-implementation, but tracks the emitter's choices in `packages/agp-emitter/src/sort.ts` line-for-line. A future spec § upgrade should normalise this in the schema. |
| **MICRO** | No DSSE / Sigstore signature verification | Out of scope per mission; deferred to Phase E in the spec's implementation sequence. |

No `@arch-governance/*` references introduced anywhere.

## 18. Recommended Next Mission

**`ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_PASS`**

Use the same 11-repo trial corpus from `ARCH_ENGINE_AGP_BUNDLE_REAL_REPO_TRIAL_AUDIT.md`. For each of the 33 emitted bundles already proven to emit cleanly:

1. Run `agp-verify --bundle <bundle>` → expect verdict `valid`.
2. Apply each of the 8 tamper classes to a copy of the bundle → expect verdict `tampered`/`invalid` with the documented issue code.
3. Confirm no false-positives (no `valid` bundle gets flagged `invalid`).
4. Capture aggregate metrics into a new `audits/ARCH_ENGINE_AGP_VERIFIER_REAL_REPO_TRIAL_AUDIT.md`.

After that, if the verifier holds, the natural sequence is:

- `AGP_VERIFIER_MVP_HARDENING_PASS` (drop the `@arch-engine/agp-emitter` test-time dependency in favour of synthetic fixtures, tighten JCS number formatting, add an explicit `--schema-root` flag).
- The public CLI integration pass (`arch-engine emit-agp` + `arch-engine verify-agp` as documented in Phase D of the spec).

— end —
