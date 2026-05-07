# Arch-Engine CLI v1.0.3 JSON / Error-Language Implementation Audit

**Audit date:** 2026-05-07
**Auditor:** Claude Opus 4.7 (1M context), implementation pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `06422ca docs(cli): add json and error language specification`
**Tag:** `arch-engine-v1.0.2` at `ea44dc9`
**Predecessor spec:**
- [docs/cli/json-error-language-spec.md](../docs/cli/json-error-language-spec.md)

**Predecessor audits:**
- [audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md](./ARCH_ENGINE_JSON_ERROR_LANGUAGE_SPECIFICATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_A_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_B_IMPLEMENTATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_PHASE_C_DEMO_OUTPUT_CALIBRATION_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md](./ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md)
- [audits/ARCH_ENGINE_CLI_V1_0_2_PRE_RELEASE_DOC_CLEANUP_AUDIT.md](./ARCH_ENGINE_CLI_V1_0_2_PRE_RELEASE_DOC_CLEANUP_AUDIT.md)

---

## 1. Executive Verdict

**`CLI_V1_0_3_JSON_ERROR_LANGUAGE_READY_FOR_RELEASE_PREP`**

The patch-safe JSON / error-language polish layer specified in
`docs/cli/json-error-language-spec.md` lands as additive code only.

- Build is green. Typecheck is green. Full test suite is **1992 / 1992**
  passing across **653 / 653** test files. **44 new tests** in
  `cli-experience-phase-e.test.ts` cover §15.1–§15.6 of the spec
  (vocabulary, rendering, debug gate, process-level diagnostics,
  stack-trace policy, path normalisation, determinism, JSON
  backward-compat).
- `npm pack --dry-run` succeeds at the existing v1.0.2 metadata
  (filename `arch-engine-cli-1.0.2.tgz`, 16 files, 17.5 kB tarball).
- Phase A / B / C / D-Lite invariants all still hold; no test from
  prior phases changed status.
- Five public command names, top-level JSON keys for v1.0.2, exit
  codes, package exports, and dependency tree are byte-for-byte
  unchanged. Every change is **additive**.
- No new public exports from `@arch-engine/cli`. The two new CLI
  internal modules (`error-codes.ts`, `format-error.ts`) are unwired
  from `package.json#exports` and reachable only via the bin entry
  point.
- No version bump. No publish. No tag. No `@arch-governance/*`
  dependency. No `--json-schema=v2` flag (deferred to v1.1.0).

The repo is ready for the v1.0.3 release-preparation pass.

---

## 2. Scope

**Patch-safe additive polish only.**

- No new CLI commands, no new flags.
- No public API surface changes (no new exports from
  `@arch-engine/core` or `@arch-engine/cli`).
- No JSON shape changes that remove or rename existing keys. Three
  classes of additive fields:
  - `diagnostics: []` on every command's `--json` output
    (`doctor`, `inspect`, `analyze`, `check`, `explain`).
  - `violations: []` on `check --json` (always present; populated
    when policy violations exist).
  - `artifactRelativePath` on `check --json` (POSIX, repo-relative
    counterpart to the existing absolute `artifactPath`).
- No version bump. `@arch-engine/*` versions remain at `1.0.2`.
- No npm publish. No git tag. No git commit (per mission instructions).
- No AGP emitter implementation, no `@arch-governance/*` dependency.
- No freeze snapshot updated.
- No README rewrite.
- No new public package.
- No tests weakened or removed.

---

## 3. Items Addressed (per spec §16.1)

| # | Spec Criterion | Status |
| --- | --- | --- |
| 1 | `packages/cli/src/error-codes.ts` exists and exports the 11 `ARCH_ENGINE_*` codes per §6.2. | ✅ Phase 3 |
| 2 | `packages/cli/src/format-error.ts` exists and renders §7.1 shape for every code. | ✅ Phase 4 |
| 3 | Every existing v1.0.2 JSON key is present in v1.0.3 with the same value type. | ✅ Phase 6 + Phase E `JSON backward-compat` tests |
| 4 | Every command's `--json` output includes `diagnostics: []` (additive). | ✅ Phase 6 |
| 5 | `check --json` always includes `violations: []` (empty on pass; populated on block). | ✅ Phase 7 |
| 6 | `check --json` includes both `artifactPath` (absolute) and `artifactRelativePath` (repo-relative). | ✅ Phase 7 |
| 7 | Process-level tests in §15.2 all pass. | ✅ Phase 10 |
| 8 | Stack-trace tests in §15.4 pass. | ✅ Phase 10 |
| 9 | Path-normalization tests in §15.5 pass. | ✅ Phase 10 |
| 10 | Determinism tests in §15.6 pass. | ✅ Phase 10 |
| 11 | Phase A / B / C / D-Lite invariants hold (existing test files still green). | ✅ Phase 11 — full suite green |
| 12 | No new public exports from `@arch-engine/cli`. | ✅ Phase 13 — `package.json#exports` untouched |
| 13 | No new dependencies in any `package.json`. | ✅ Phase 13 — `git diff --stat` shows zero `package.json` changes |
| 14 | `npm run build`, `npm run typecheck`, `npm test`, `npm pack --dry-run` all pass. | ✅ Phase 11 |

Mission phase mapping:

| Phase | Description | Status |
| --- | --- | --- |
| 1 | Confirm repo state | ✅ |
| 2 | Read spec and inspect CLI | ✅ |
| 3 | Add `error-codes.ts` | ✅ — 220 lines, 11 codes locked |
| 4 | Add `format-error.ts` | ✅ — 306 lines, full renderer + JSON serializer |
| 5 | Wire `cli.ts` catch block | ✅ — top-level catch routes to structured renderer; unknown errors → `INTERNAL_INVARIANT_FAILED` (exit 5) |
| 6 | Add `diagnostics: []` to JSON outputs | ✅ — every JSON path on all 5 commands updated |
| 7 | Verify `violations: []` and `artifactRelativePath` in `check --json` | ✅ — `buildViolationsJson()` + `toRepoRelative()` helpers in check.ts |
| 8 | Update per-command error paths | ✅ — `Topology extraction failed` path in check.ts now uses `ARCH_ENGINE_ADAPTER_NOT_FOUND` (exit 3 preserved) |
| 9 | Update docs cross-references | ✅ — readiness matrix gains v1.0.3 section; experience spec §7/§8/§13.1 cross-link to JSON/Error-Language spec |
| 10 | Tests | ✅ — `cli-experience-phase-e.test.ts` (694 lines, 44 tests) |
| 11 | Validation | ✅ — see §6 |
| 12 | Implementation audit | ✅ — this document |
| 13 | Final hygiene | ✅ — see §7 |
| 14 | Final report | ✅ — handed to user as session summary |

---

## 4. Files Created or Modified

### 4.1 New files

| File | Purpose | Lines |
| --- | --- | --- |
| `packages/cli/src/error-codes.ts` | Single source of truth for the 11 `ARCH_ENGINE_*` codes, severity vocabulary, exit-code contract, metadata table. Internal — not exported from `@arch-engine/cli`. | 220 |
| `packages/cli/src/format-error.ts` | Structured human renderer (`Title / Problem / Fix / Exit / Docs`), JSON serializer (`diagnosticToJson`), debug gate (`isDebugEnabled`), unknown-error mapper (`diagnosticFromUnknownError`). | 306 |
| `packages/cli/tests/cli-experience-phase-e.test.ts` | Phase E test suite covering §15.1–§15.6 of the JSON / error-language spec. 44 tests. | 694 |
| `audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md` | This audit. | — |

### 4.2 Modified files

| File | Change |
| --- | --- |
| `packages/cli/src/cli.ts` | Top-level catch routes to `diagnosticFromUnknownError` → `emitDiagnosticHuman` → `process.exit(5)`. Stack traces hidden by default; surfaced when `DEBUG=arch-engine:*` is set. |
| `packages/cli/src/commands/doctor.ts` | Builds `diagnostics[]` array (POLICY_NOT_FOUND when no policy; TOPOLOGY_LOW_SIGNAL when below floor) and includes it in `--json` output. |
| `packages/cli/src/commands/inspect.ts` | Builds `diagnostics[]` array (TOPOLOGY_LOW_SIGNAL when applicable) and includes it in `--json` output. |
| `packages/cli/src/commands/analyze.ts` | Builds `diagnostics[]` array (POLICY_NOT_FOUND, TOPOLOGY_LOW_SIGNAL) and includes it in `--json` output alongside Phase A's `policyConfigured` / `headlineKind`. |
| `packages/cli/src/commands/check.ts` | Adds `diagnostics: []`, `violations: []`, `artifactRelativePath` to `--json`. Adds `buildViolationsJson()` and `toRepoRelative()` helpers. Structurises the `Topology extraction failed` fatal path via `ARCH_ENGINE_ADAPTER_NOT_FOUND`. |
| `packages/cli/src/commands/explain.ts` | Adds `diagnostics: []` to all 7 `--json` paths (matched-target, unknown-target, low-signal, regression-no-baseline, regression-success, policy-not-found, policy-success). Surfaces `ARCH_ENGINE_TARGET_NOT_FOUND`, `ARCH_ENGINE_NO_BASELINE`, `ARCH_ENGINE_POLICY_NOT_FOUND`, `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL` per scenario. |
| `packages/cli/tsconfig.json` | Adds `src/error-codes.ts` and `src/format-error.ts` to the explicit include allow-list. |
| `docs/cli/cli-readiness-matrix.md` | Adds v1.0.3 polish section listing additive `diagnostics[]`, `violations[]`, `artifactRelativePath`. Cross-links to JSON / Error-Language spec. |
| `docs/cli/cli-experience-spec.md` | Adds v1.0.3 implementation note in §7 (JSON envelope) and §8 (error language); v1.0.3 line item in §13.1 (patch-release-safe). |

### 4.3 Files unchanged

- All `package.json` files. Versions still `1.0.2`.
- `packages/cli/package.json#exports` is untouched. `error-codes.ts` and
  `format-error.ts` are not part of the public API surface.
- All other tests in `packages/cli/tests/` and `packages/core/tests/`.

---

## 5. JSON Shape Diff (v1.0.2 → v1.0.3)

For every command, **all v1.0.2 keys are preserved with the same value
type.** The only changes are additive:

### `doctor --json`

```diff
 {
   "environment": "...",
   "extractionMode": "...",
   ...
   "warnings": [],
   "autoInitialized": false,
   "hasPolicyFile": false,
+  "diagnostics": [
+    {
+      "code": "ARCH_ENGINE_POLICY_NOT_FOUND",
+      "severity": "INFO",
+      "title": "No policy configured.",
+      "message": "No policy file is configured yet ...",
+      "fix": "Add `arch-policy.yml` ...",
+      "ciBlocking": false,
+      "docsHint": "policies"
+    }
+  ]
 }
```

### `inspect --json`

```diff
 {
   "nodes": ...,
   ...
   "adaptersActive": ["adapter-monorepo"],
+  "diagnostics": []
 }
```

### `analyze --json`

```diff
 {
   "score": ...,
   ...
   "policyConfigured": false,
   "headlineKind": "...",
+  "diagnostics": [...]
 }
```

### `check --json`

```diff
 {
   "score": ...,
   ...
   "artifactPath": "/abs/path/to/.arch-engine/stability-score.json",
   "policyConfigured": ...,
   "headlineKind": "...",
+  "diagnostics": [...],
+  "violations": [
+    {
+      "id": "v_<8-hex>",
+      "ruleId": "...",
+      "edge": { "from": "...", "to": "...", "type": "workspace_dependency" },
+      "severity": "...",
+      "ciBlocking": true,
+      "category": "...",
+      "code": "ARCH_ENGINE_BLOCKING_VIOLATION"
+    }
+  ],
+  "artifactRelativePath": ".arch-engine/stability-score.json"
 }
```

### `explain --json`

Variant-by-variant additive `diagnostics: []`. See spec §10.5 for
the full table; selected paths surface code-specific diagnostics
(TARGET_NOT_FOUND, NO_BASELINE, POLICY_NOT_FOUND, TOPOLOGY_LOW_SIGNAL)
or empty arrays when the path is a clean informational success.

---

## 6. Validation Results

### 6.1 Build

```
$ npm run build
... all packages build clean ...
@arch-engine/cli build OK in 15ms
```

### 6.2 Typecheck

```
$ npx tsc --noEmit -p packages/cli/tsconfig.json
(no output — clean)
```

### 6.3 Test suite

```
$ npm test
Test Files  653 passed (653)
Tests       1992 passed (1992)
Duration    36.89s
```

CLI-only:

```
Test Files  84 passed (84)
Tests       381 passed (381)
```

The new Phase E suite contributes **44 / 381** CLI tests. Pre-existing
337 tests stayed green with no modification.

### 6.4 Pack dry-run

```
$ npm pack --dry-run
arch-engine-cli-1.0.2.tgz   17.5 kB    16 files
```

The tarball name reflects the unchanged v1.0.2 version. The published
file list is unchanged from v1.0.2 (only `dist/` and `package.json`).

### 6.5 CLI smoke tests

`demo-drift` fixture, `check --json`:

- ✅ exit code `1` (matches v1.0.2 + Phase D-Lite contract).
- ✅ `violations.length === 1` with the spec-shaped entry.
- ✅ `violations[0].id === "v_f6766b5c"` (deterministic sha256-truncated form).
- ✅ `violations[0].edge.from === "@demo-drift/frontend"`,
  `to === "@demo-drift/payments"`,
  `type === "workspace_dependency"`.
- ✅ `violations[0].severity === "error"`,
  `ciBlocking === true`,
  `category === "explicit_forbid"`,
  `code === "ARCH_ENGINE_BLOCKING_VIOLATION"`.
- ✅ `artifactRelativePath === ".arch-engine/stability-score.json"` (POSIX, repo-relative, no leading `/`).
- ✅ `diagnostics` includes `ARCH_ENGINE_BLOCKING_VIOLATION`.

`sample-monorepo` fixture, `doctor --json`:

- ✅ exit code `0`.
- ✅ `diagnostics` includes `ARCH_ENGINE_POLICY_NOT_FOUND` (severity `INFO`).
- ✅ All v1.0.2 keys preserved verbatim.

---

## 7. Hygiene

| Check | Result |
| --- | --- |
| No `dist/` checked in | ✅ — `git status` shows none |
| No tarballs checked in | ✅ |
| No `@arch-governance/*` runtime dependencies added | ✅ — `package.json` files untouched |
| No `--json-schema=v2` flag added | ✅ — deferred to v1.1.0 per spec §16.2 |
| No version bumps | ✅ — all packages still at `1.0.2` |
| No `package.json` modifications | ✅ — `git diff --stat` shows zero `package.json` lines changed |
| No public exports widened | ✅ — `package.json#exports` unchanged; new modules not exported |
| Stack traces hidden by default | ✅ — Phase E §15.4 tests pass |
| Existing tests untouched | ✅ — no test file modified |

---

## 8. Open Items / Known Gaps

1. **`--min-coverage` failure path is not structurised.** The
   `check --min-coverage 0.99` failure on a low-signal fixture still
   uses the v1.0.2 plain-text path (`Fix: lower --min-coverage, ...`)
   and exits `3`. The existing message already follows the spec's
   Title/Fix/Exit shape stylistically, and routing it through the
   structured renderer would require either changing the exit code
   (breaking) or introducing a new error code. Deferred until a
   minor release where exit-code semantics can move.

2. **`explain` regression-success and policy-success JSON paths emit
   empty `diagnostics: []`.** Per spec §10.5, `explain` is
   informational; the `violations[]` field on `explain policy --json`
   is the authoritative violation surface, so duplicating those
   violations as `BLOCKING_VIOLATION` diagnostics would double-count.
   This is a deliberate choice, not a gap.

3. **Stack-trace gating uses `DEBUG=arch-engine:*`, not a
   `--verbose` flag.** Per spec §8.5, `--verbose` is reserved for
   v1.1.0. v1.0.3 honors the existing convention only.

4. **The cli-experience-spec.md error-code exit-code table remains
   stale** for `ARCH_ENGINE_GRAPH_SHAPE_INVALID` (spec says exit 4)
   and `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED` (spec says exit 4).
   The implementation uses exit 5 for both, matching the JSON /
   Error-Language spec which is now the source of truth (per the
   note added to §8 in this pass). Correcting the older spec
   in-place is left to a future docs cleanup.

None of these are blockers for shipping v1.0.3 as a patch.

---

## 9. Sign-Off

The v1.0.3 JSON / error-language polish layer is implemented per spec.
All acceptance gates from spec §16.1 pass. The repo is ready for the
v1.0.3 release-preparation pass.

**Next pass (separate human-driven mission):**

- Bump `@arch-engine/{schema,core,cli,adapter-monorepo,governance-pack-*}`
  to `1.0.3` in lockstep.
- Update CHANGELOGs.
- Tag `arch-engine-v1.0.3`.
- Publish to npm.

*End of audit.*
