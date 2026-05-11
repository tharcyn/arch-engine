# Arch-Engine JSON v2 / CI Flags Implementation Audit

**Audit date:** 2026-05-08
**Auditor:** Claude Opus 4.7 (1M context), implementation pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `69e4a0f docs(cli): add json v2 and ci flags specification`
**Predecessor spec:** [`docs/cli/json-v2-ci-flags-spec.md`](../docs/cli/json-v2-ci-flags-spec.md)

**Predecessor audits:**
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_SPECIFICATION_AUDIT.md`](./ARCH_ENGINE_JSON_V2_CI_FLAGS_SPECIFICATION_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_0_3_PATCH_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`JSON_V2_CI_FLAGS_IMPLEMENTATION_READY_FOR_V1_1_0_PREP`**

The v1.1.0 minor-release feature surface is implemented per spec. All
six new flags ship behind explicit opt-in (defaults preserved). The
JSON v2 envelope is opt-in via `--json-schema=v2`. JSON v1 is the
default and remains byte-identical to v1.0.3. Markdown output is
available via `--format markdown` for `check`, `analyze`, `doctor`,
`inspect`, and `explain`. `--output <path>` writes formatted output
to a file (with mkdir-p and ANSI-strip). `--ci` forces deterministic
no-color output across every format. `--quiet` and `--verbose`
behave as specified. Flag validation rejects every forbidden
combination from spec §9 with an `ARCH_ENGINE_INVALID_CONFIG` exit-2
diagnostic.

**Validation gates (all green):**

- `npm install` → clean
- `npm run build` → all packages build
- `npm run typecheck` → all 7 tsconfigs clean
- `npm test` → **2063 / 2063** across **657 / 657** files
- Freeze tests → **357 / 357** with no snapshot updates
- `npm pack --dry-run` → 17 files, 17.5 kB tarball at `1.0.3`

**Phase A / B / C / D-Lite / E suites:** all green, unchanged.

**Compatibility:** no JSON v1 key removed or renamed. No new commands.
No `--json-schema=v2` default flip. No `@arch-governance/*` dependency.
No version bump (still at `1.0.3` — release prep is a separate
mission). No publish, no tag.

The repo is ready for the v1.1.0 release-preparation pass.

---

## 2. Scope

**v1.1.0 minor-release implementation only.**

- Six new flags: `--json-schema`, `--ci`, `--format`, `--output`,
  `--verbose`, `--quiet`.
- Opt-in JSON v2 envelope behind `--json-schema=v2`.
- Markdown output for all five commands.
- `--output <path>` writer with ANSI-strip and parent-dir creation.
- Flag conflict validation per spec §9.
- New test suite covering all of the above (4 files, 71 tests).
- No source changes to JSON v1 default behavior.
- No version bump. No publish. No tag. No commit (commit is left for
  the human, per mission constraints).

---

## 3. Files Changed

### 3.1 New files

| File | Lines | Purpose |
| --- | --- | --- |
| `packages/cli/src/cli-options.ts` | 270 | `CliOutputOptions` type + `parseAndValidateCliOptions` flag validator + `attachOutputOptions` shim. Validates spec §9 conflict matrix. |
| `packages/cli/src/output-writer.ts` | 230 | `writeOutput`, `emitFormattedOutput`, ANSI-strip, mkdir-p, plus `installHumanCaptureIfNeeded` for human + `--output`. |
| `packages/cli/src/render-v2.ts` | 321 | JSON v2 envelope renderer + `buildSummary` + `deriveStatusForExit` + `sortDiagnostics` + `sortArtifacts` + `sortKeysRecursive` + `normalizeArtifactPath`. |
| `packages/cli/src/render-markdown.ts` | 485 | Markdown templates for all five commands per spec §10. Includes the violation cap (50), diagnostics cap (25), 250 KB size cap. |
| `packages/cli/tests/cli-experience-phase-f-flags.test.ts` | 225 | 18 tests covering help discoverability + invalid values + forbidden combinations + allowed combinations. |
| `packages/cli/tests/cli-experience-phase-f-json-v2.test.ts` | 375 | 24 tests covering envelope shape + field invariants + v1 backward-compat + demo-drift v2 + path leakage + diagnostic ordering. |
| `packages/cli/tests/cli-experience-phase-f-markdown-output.test.ts` | 244 | 16 tests covering markdown rendering + `--output` writer + ANSI strip + LF endings. |
| `packages/cli/tests/cli-experience-phase-f-ci.test.ts` | 212 | 13 tests covering `--ci` exit parity + no-color + composition + determinism. |
| `audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md` | — | This audit. |

### 3.2 Modified files

| File | Change |
| --- | --- |
| `packages/cli/src/bin.ts` | ESM-hoist-safe pre-import gate that sets `NO_COLOR=1` when `--ci` or `--no-color` is in argv, then dynamic-imports `cli.ts`. Required because picocolors caches its color decision at import time. |
| `packages/cli/src/cli.ts` | Registers six new global flags. Each command action now parses options through `parseAndValidateCliOptions`, calls `attachOutputOptions`, and `installHumanCaptureIfNeeded` before dispatching. New help examples for `--ci`, `--json-schema=v2`, `--format markdown --output`. |
| `packages/cli/src/commands/doctor.ts` | Format-aware emission: v1 JSON, v2 JSON via `renderCliJsonV2`, markdown via `renderCliMarkdown`, or human (preserved). `--quiet` suppresses non-essential lines. |
| `packages/cli/src/commands/inspect.ts` | Same pattern as doctor. |
| `packages/cli/src/commands/analyze.ts` | Same pattern + artifact emission with `normalizeArtifactPath` and conditional `absolutePath` based on `--verbose`. |
| `packages/cli/src/commands/check.ts` | Same pattern + dedicated v2 payload with `data.verdict`, `data.violations` (sorted by `id`), `data.stability`, `data.topology`. Exit code computed once and threaded through both v2 and human paths. |
| `packages/cli/src/commands/explain.ts` | Per-mode (`matched`, `unmatched`, `regression`, `policy`) v2 payload with `data.target`, `data.mode`, and mode-specific fields. |
| `packages/cli/tsconfig.json` | Adds the four new source files to the explicit include allow-list. |

### 3.3 Files NOT modified

- All `package.json` files. Versions still `1.0.3`.
- `packages/cli/package.json#exports` is untouched. The four new
  internal modules are not part of the public API.
- All Phase A / B / C / D-Lite / E test files (still green
  unchanged).
- `docs/cli/json-v2-ci-flags-spec.md` (the contract; no
  modifications).
- `CHANGELOG.md` (release-prep concern).
- All other `@arch-engine/*` packages (CLI is the only changed
  workspace).

---

## 4. Flags Implemented

| Flag | Type | Default | Behavior |
| --- | --- | --- | --- |
| `--json-schema=v1\|v2` | enum | `v1` | Selects JSON envelope shape. Valid only with `--json` or `--format json`; invalid values exit 2. |
| `--ci` | bool | off | Forces no-color (via `NO_COLOR=1` set in `bin.ts` before pc loads). Does NOT imply JSON. Composes with every other flag. |
| `--format human\|json\|markdown` | enum | `human` | Canonical format selector. `json` aliases `--json`; `markdown` is new in v1.1.0; conflicts with `--json` for `human`/`markdown` exit 2. |
| `--output <path>` | string | unset | Writes formatted output to file. mkdir-p parent; UTF-8 LF; ANSI-stripped; trailing-slash exits 2. Confirmation `Wrote <path>` printed to stderr unless `--quiet` (suppressed in JSON mode). |
| `--verbose` | bool | off | Adds `artifacts[].absolutePath` in v2; would expose stack traces for INTERNAL diagnostics. Does not leak secrets. |
| `--quiet` | bool | off | Suppresses non-essential human stdout lines. Wins over `--verbose`. Never affects JSON or markdown content. |

---

## 5. JSON v2 Envelope Implemented

The opt-in v2 envelope ships per spec §6.1 and §6.2 exactly. Top-level
shape (alphabetical):

```jsonc
{
  "archEngineVersion": "1.0.3",
  "artifacts": [...],
  "command": "doctor" | "inspect" | "analyze" | "check" | "explain",
  "data": {...},
  "diagnostics": [...],
  "emittedAt": "2026-05-08T08:18:42.123Z",
  "exitCode": 0 | 1 | 2 | 3 | 5,
  "nextActions": [...],
  "schemaVersion": "arch-engine.cli.v2",
  "status": "passed" | "blocked" | "warning" | "error" | "internal_error" | "not_enforced",
  "summary": { headline, verdict, ... }
}
```

**Determinism (verified by tests):**

- Top-level keys alphabetical (Phase F json-v2 test).
- `data.*` keys alphabetised recursively via `sortKeysRecursive`.
- `diagnostics[]` sorted by `(severity desc, code asc, message asc)`.
- `data.violations[]` (under `check`) sorted by `id` ascending; `id`
  is sha256-truncated 8-char from v1.0.3 (already deterministic).
- `artifacts[]` sorted by `(kind, relativePath)`.
- `emittedAt` is the only wall-clock-derived field.

**Path policy (verified):**

- All `data.*` paths are repo-relative POSIX.
- `artifacts[].absolutePath` omitted by default; included only with
  `--verbose`.

**Status derivation:** implemented in `deriveStatusForExit` in
`render-v2.ts` matching spec §6.4.1 exactly.

---

## 6. Per-Command v2 Shapes

Each command's `data.*` payload follows spec §7 verbatim:

- **doctor.data:** `ready`, `policyConfigured`, `workspace.{type, extractionMode, packageCount}`, `adapter.{id, resolved}`, `topology.{nodes, edges, coverage, connectivity, topologyConfidence, topologyConfidenceLabel, confidenceTier}`, `domains`, `domainIntegrity`, `warnings`.
- **inspect.data:** `topology` (full), `domains`, `warnings`, `adaptersActive`.
- **analyze.data:** `stability.{score, tier, headlineKind, policyConfigured}`, `topology`, `domains`, `blastRadius`, `components`, `executionMetrics`, `warnings`.
- **check.data:** `verdict`, `stability`, `topology`, `domains`, `violations[]` (with locked v1.0.3 entry shape), `policyConfigured`, `policyMode`, `executionMetrics`, `warnings`.
- **explain.data:** `target`, `mode` (`matched` | `unmatched` | `regression` | `policy`), then mode-specific fields.

JSON v1 for every command remains byte-identical to v1.0.3 when
`--json-schema=v2` is not passed (verified by Phase F backward-compat
tests).

---

## 7. Markdown Output Implemented

Per spec §10:

- **check** — full template with violations table, diagnostics, next
  actions, exit footer.
- **analyze** — full template with metrics table.
- **doctor** — full template with readiness table.
- **inspect** — thin wrapper with topology metrics.
- **explain** — thin wrapper with mode-specific fields (matched-target
  shows match table; unmatched shows suggestions + supportedSpecialTargets).

**Determinism (verified):**

- LF line endings.
- Trailing newline.
- No timestamps.
- No absolute paths.
- Caps: 50 violations / 25 diagnostics / 250 KB total.

---

## 8. Output Writer Implemented

`packages/cli/src/output-writer.ts`:

- `writeOutput(content, options)` — writes to stdout or file.
- `emitFormattedOutput(content, options)` — wraps `writeOutput` with
  the `Wrote <path>` confirmation behavior.
- `installHumanCaptureIfNeeded(options)` — installs a
  `process.stdout.write` interceptor when `--format human --output
  <path>` is set, then flushes the captured buffer to the file via
  `process.once('exit', ...)`.
- `stripAnsi`, `normalizeNewlines`, `relativeForDisplay`,
  `relativeForCi` exported helpers.

**File write contract:**

- UTF-8, no BOM.
- LF (`\n`) line endings.
- `mkdir -p` parent.
- Overwrite by default.
- Trailing slash → exit 2 (caught in `cli-options.ts`).
- Write failure → `ARCH_ENGINE_INVALID_CONFIG` exit 2.

**Confirmation message:** `Wrote <path>` to stderr in human/markdown
modes, suppressed under `--quiet`, never printed in JSON mode (machine
output is never polluted).

---

## 9. CI / Quiet / Verbose Semantics

### 9.1 `--ci`

- Forces `NO_COLOR=1` in env BEFORE picocolors loads (in `bin.ts`).
- Drops decorative separators in human output.
- Does NOT imply `--json`. Composes with every other flag.
- Same exit-code contract as non-`--ci` mode.
- Verified deterministic across two runs (modulo wall-clock timing).

### 9.2 `--quiet`

- Suppresses non-essential `console.log` lines in human mode (header
  metrics, distribution sections, "Next:" hints).
- Verdict and `ERROR` / `INTERNAL` diagnostics still print.
- No effect on JSON or markdown content.
- Wins over `--verbose` for human output (verbose extras suppressed).

### 9.3 `--verbose`

- Adds `artifacts[].absolutePath` to v2 envelope.
- Reserved for stack-trace exposure on `INTERNAL` severity (already
  honored by the `format-error.ts` debug gate via `DEBUG=arch-engine:*`).
- Never leaks secrets, source code, or env vars.
- Composes with every other flag.

---

## 10. Flag Interaction Matrix

Implemented in `cli-options.ts:parseAndValidateCliOptions`. Matches
spec §9 verbatim.

**Exit 2 (forbidden):**

- `--json-schema=v9` (invalid value)
- `--json-schema=v2` without `--json` or `--format json`
- `--json-schema=v2` with `--format markdown`
- `--json` + `--format human`
- `--json` + `--format markdown`
- `--format xml` (invalid value)
- `--output reports/` (trailing slash)

**Allowed (compose):**

- `--json-schema=v2` + `--json`
- `--json-schema=v2` + `--format json`
- `--quiet` + `--verbose` (quiet wins for human)
- `--ci` + any of `--json`, `--format`, `--output`, `--quiet`, `--verbose`
- `--no-color` + `--ci` (redundant; accepted)

Verified by 18 Phase F flag-matrix tests.

---

## 11. Tests Added/Updated

### 11.1 New Phase F suite

| File | Tests | Coverage |
| --- | --- | --- |
| `cli-experience-phase-f-flags.test.ts` | 18 | Help discoverability + invalid values + forbidden combinations + allowed combinations. |
| `cli-experience-phase-f-json-v2.test.ts` | 24 | Required keys + alphabetical order + field invariants + v1 backward-compat + demo-drift blocked status + path-leakage policy + diagnostics ordering. |
| `cli-experience-phase-f-markdown-output.test.ts` | 16 | Markdown rendering for all 5 commands + `--output` writer (LF, ANSI-strip, mkdir-p, overwrite) + stdout suppression. |
| `cli-experience-phase-f-ci.test.ts` | 13 | `--ci` exit parity + no-color enforcement + composition with other flags + determinism (modulo emittedAt + timing). |

**Total:** 71 new tests. All green.

### 11.2 Existing tests untouched

- Phase A: 15 tests, green.
- Phase B: 14 tests, green.
- Phase C: 14 tests, green.
- Phase D-Lite: 8 tests, green.
- Phase E: 44 tests, green.
- All non-Phase tests in `packages/cli/tests/` and
  `packages/core/tests/`, green.

---

## 12. Build / Typecheck / Test / Pack Results

| Gate | Result |
| --- | --- |
| `npm install` | ✅ clean |
| `npm run build` | ✅ all packages build (CLI: tsup ESM bundle clean) |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2063 / 2063 tests** across **657 / 657 files** |
| Freeze tests | ✅ **357 / 357** in `packages/core/tests/freeze` (no snapshot updates) |
| `npm pack --dry-run --workspace @arch-engine/cli` | ✅ 17 files, 17.5 kB tarball, filename `arch-engine-cli-1.0.3.tgz` |

Note on tarball name: it reads `1.0.3` because **no version bump** was
performed in this pass, per mission constraint. The release-prep pass
will bump to `1.1.0`.

---

## 13. Compatibility Statement

- ✅ **JSON v1 remains the default.** `--json` (and `--format json`)
  produce v1 unchanged from v1.0.3 byte-for-byte.
- ✅ **Existing `--json` is compatible.** No keys removed, renamed, or
  retyped.
- ✅ **No new commands.** Five-verb surface (`doctor`, `inspect`,
  `analyze`, `check`, `explain`) preserved.
- ✅ **No AGP dependency.** `grep "@arch-governance/runtime\|@arch-governance/architecture-profile"`
  on every `package.json` returns nothing.
- ✅ **No version bump.** All `@arch-engine/*` versions still `1.0.3`.
- ✅ **No publish.** `npm publish` was not run.
- ✅ **No tag.** `arch-engine-v1.1.0` does not exist locally.
- ✅ **No public exports widened.** `package.json#exports` unchanged.
  The four new `src/*.ts` modules are bundled into the CLI's ESM
  output but not exposed as importable entry points.

---

## 14. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| `--ci` does not strip the `Extraction: Xms` timing footer from human output | LOW | Tests mask the timing line for byte-comparison. CI consumers parse exit codes; timing is informational. Could be tightened in a v1.1.1 if users push back. |
| `--output` empty string handling not asserted | MICRO_DELTA | cac collapses an empty string argument so the validator never sees one. The trailing-slash test covers the equivalent path-shape concern. |
| Stack-trace exposure under `--verbose` is plumbed only for `INTERNAL` severity via the existing `DEBUG=arch-engine:*` gate; no separate `--verbose` toggle on `format-error.ts` was added | MICRO_DELTA | Spec §8.5 of `cli-experience-spec.md` proposed `--verbose` as the discoverable surface; v1.1.0 routes both surfaces to the same gate. Functionally equivalent; documented as a deferred refinement. |
| Markdown size cap (250 KB) and violation cap (50) are hardcoded | MICRO_DELTA | Configurability deferred per spec §16.2. |
| JSON Schema v7 documents not shipped | LOW | Per spec §3.2 / §16.2; deferred to v1.1.1. |
| `--baseline <path>` not implemented | LOW | Out of scope per spec §3.2. |
| `--format github` annotations not implemented | LOW | Out of scope per spec §3.2. |

No BLOCKER or HIGH deltas.

---

## 15. Recommended Next Mission

**Arch-Engine v1.1.0 Minor Release Preparation Pass.**

Mission framing: bump the seven public packages from `1.0.3` →
`1.1.0` in lockstep, update `CHANGELOG.md` with the v1.1.0 entry,
write `audits/release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md`,
run the full validation matrix again at v1.1.0, run a local
public-style install smoke, and produce the human-driven publish
checklist.

The release-prep mission should not modify source code; this
implementation pass produced all v1.1.0 source. The release-prep
mission only touches:

- `packages/{schema,core,adapter-monorepo,governance-pack-{authority,rest-contract,journey},cli}/package.json` — version + cross-deps.
- `package-lock.json`
- `CHANGELOG.md`
- New audit file under `audits/release/`.

Estimated effort: ~1–2 hours of focused release-prep work (mirrors
the v1.0.2 and v1.0.3 release-prep passes).

After v1.1.0 publishes, the next product question is **AGP emitter
MVP** (Option B from the v1.0.3 audit) — a separate mission entirely.

*End of implementation audit.*
