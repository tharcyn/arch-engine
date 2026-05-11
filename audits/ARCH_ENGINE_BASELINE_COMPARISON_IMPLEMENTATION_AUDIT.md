# Arch-Engine Baseline Comparison Implementation Audit

**Audit date:** 2026-05-11
**Auditor:** Claude Opus 4.7 (1M context), implementation pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**Pre-pass HEAD:** `7ce44c7 docs(cli): add baseline comparison specification`
**Predecessor spec:** [`docs/cli/baseline-comparison-spec.md`](../docs/cli/baseline-comparison-spec.md)

**Predecessor audits:**
- [`audits/ARCH_ENGINE_BASELINE_COMPARISON_SPECIFICATION_AUDIT.md`](./ARCH_ENGINE_BASELINE_COMPARISON_SPECIFICATION_AUDIT.md)
- [`audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md)
- [`audits/release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_1_0_MINOR_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`BASELINE_COMPARISON_IMPLEMENTATION_READY_FOR_V1_2_0_PREP`**

v1.2.0 baseline comparison is implemented per spec. All gates green:

- `npm install` → clean
- `npm run build` → all packages build
- `npm run typecheck` → all 7 tsconfigs clean
- `npm test` → **2168 / 2168 tests** across **662 / 662 files**
- Freeze tests → **357 / 357** with no snapshot updates
- `npm pack --dry-run --workspace @arch-engine/cli` → clean (19 files; no version bump, still at `1.1.0`)

**v1.0.3 / v1.1.0 invariants preserved:**

- JSON v1 default output unchanged (verified by Phase A–F suites).
- JSON v2 envelope keeps its 11 alphabetised top-level keys.
- Five-command surface unchanged.
- No new public exports from `@arch-engine/cli`.
- No `@arch-governance/*` dependency added.
- No version bump. No publish. No tag.

**v1.2.0 surface:**

- One new public flag: `--baseline <path>` (valid on `check` and
  `analyze`; rejected on `doctor`, `inspect`, `explain` with exit 2).
- `data.topology.canonical = { graphSurfaceVersion, graphSurfaceHash,
  nodes[], edges[] }` added unconditionally to `inspect`, `analyze`,
  `check` JSON v2 outputs.
- `data.drift` and `summary.drift` added conditionally to
  `check --json --json-schema=v2 --baseline …` and
  `analyze --json --json-schema=v2 --baseline …`.
- `## Architecture Drift` section added to markdown output for `check`
  and `analyze` when `--baseline` is set.
- Human output gains an "Architecture drift detected / observed / not
  detected" block before the exit footer.
- Five new error codes added: `ARCH_ENGINE_BASELINE_NOT_FOUND`,
  `ARCH_ENGINE_BASELINE_INVALID`,
  `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA`,
  `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH`,
  `ARCH_ENGINE_DRIFT_DETECTED`.

The repo is ready for the v1.2.0 release-preparation pass.

---

## 2. Scope

**v1.2.0 minor-release implementation only.**

- One new public flag (`--baseline`) on `check` and `analyze`.
- Three new internal CLI modules (`canonical-topology.ts`,
  `baseline-reader.ts`, `drift.ts`).
- Five new entries in the `ARCH_ENGINE_*` error-code vocabulary.
- New v2 JSON sub-objects: `data.topology.canonical`,
  `data.drift`, `summary.drift`.
- New markdown section: `## Architecture Drift`.
- New human-output drift block.
- Phase G test suite (4 files, 82 tests) covering vocabulary, drift
  engine, JSON v2 integration, markdown/human rendering.
- One Phase E test pinned the v1.0.3 vocabulary at exactly 11 codes;
  loosened to "11-code prefix preserved, additive growth allowed".

Out of scope (per mission constraints):

- AGP emitter / `@arch-governance/*` integration.
- `--fail-on-drift`, `--drift-mode`, `--baseline-label`,
  `--current-label` (all deferred per spec §7.4).
- Git checkout / remote baseline / cloud store (spec §5).
- GitHub Actions baseline workflow templates (separate demo pass).
- Version bump, publish, tag.
- Any change to JSON v1 default behavior.

---

## 3. Files Changed

### 3.1 New files

| File | Lines | Purpose |
| --- | --- | --- |
| `packages/cli/src/canonical-topology.ts` | 219 | Build deterministic canonical topology (`graphSurfaceHash`, sorted nodes/edges with stable IDs) from an adjacency map. Pure function; no I/O. |
| `packages/cli/src/baseline-reader.ts` | 365 | Read + validate baseline file per spec §8 decision tree. Returns typed `BaselineReadResult` or throws `BaselineReadError` carrying a structured diagnostic. |
| `packages/cli/src/drift.ts` | 411 | Pure `(baseline, current) → DriftResult` engine. Three axes (topology / policy / signal). Deterministic ordering, stable IDs, no wall-clock or filesystem. |
| `packages/cli/tests/cli-experience-phase-g-baseline-reader.test.ts` | 313 | 22 tests covering path validation, JSON parsing, schema/command checks, newer-than-runtime warning, semver helper. |
| `packages/cli/tests/cli-experience-phase-g-drift.test.ts` | 434 | 32 tests on canonical topology emitter + drift engine. Pure unit tests; no subprocess. |
| `packages/cli/tests/cli-experience-phase-g-json-v2-baseline.test.ts` | 312 | 17 subprocess tests covering JSON v2 drift integration, canonical-topology presence, baseline-not-supported commands, JSON v1 backward-compat. |
| `packages/cli/tests/cli-experience-phase-g-drift-output.test.ts` | 300 | 11 subprocess tests covering markdown drift section + human drift block + --output + --quiet/--verbose + determinism. |
| `audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md` | — | This audit. |

### 3.2 Modified files

| File | Change |
| --- | --- |
| `packages/cli/src/error-codes.ts` | +58 lines — five new code entries appended to the metadata table (BASELINE_NOT_FOUND, BASELINE_INVALID, BASELINE_UNSUPPORTED_SCHEMA, BASELINE_COMMAND_MISMATCH, DRIFT_DETECTED). |
| `packages/cli/src/cli-options.ts` | +43 lines — `baseline` field on `CliOutputOptions`, parsing + path validation, `rejectBaselineForUnsupportedCommand` helper. |
| `packages/cli/src/cli.ts` | +8 lines — registered `--baseline <path>` global flag + help examples on `check` and `analyze`. |
| `packages/cli/src/commands/doctor.ts` | +2 lines — calls `rejectBaselineForUnsupportedCommand` on entry. |
| `packages/cli/src/commands/explain.ts` | +2 lines — same. |
| `packages/cli/src/commands/inspect.ts` | +22 lines — same; also builds and emits `data.topology.canonical` (additive). |
| `packages/cli/src/commands/analyze.ts` | +245 lines — baseline read + drift compute + v2 `data.drift` + `summary.drift` + headline parenthetical + human drift block. |
| `packages/cli/src/commands/check.ts` | +247 lines — same as analyze plus exit-code preservation (drift never changes exit; current violations still exit 1). |
| `packages/cli/src/render-v2.ts` | +8 lines — exported `readPackageVersion` for baseline-reader to detect newer-than-runtime baselines. |
| `packages/cli/src/render-markdown.ts` | +145 lines — `appendDriftBlock` helper, `buildDriftVerdictSuffix` helper, verdict-line parenthetical, drift section emission in check + analyze templates. |
| `packages/cli/tsconfig.json` | +5 lines — added the three new src files to the include list. |
| `packages/cli/tests/cli-experience-phase-e.test.ts` | Loosened the "exactly 11 codes" assertion to "11-code prefix preserved, additive growth allowed" — explicitly documented as the additive growth contract. |

### 3.3 Files NOT modified

- All `package.json` files. Versions still `1.1.0`. No new
  dependencies.
- `packages/cli/package.json#exports` unchanged. New modules are
  bundled but not exposed.
- Phase A / B / C / D-Lite / F suites: untouched and green.
- All other `@arch-engine/*` packages.
- Documentation under `docs/cli/` (the spec was committed in the
  prior pass; this is the implementation).

---

## 4. Error Codes Added

Five new entries appended to the `ARCH_ENGINE_*` vocabulary in
declaration order (after `ARCH_ENGINE_NO_BASELINE`):

| Code | Severity | Exit | Notes |
| --- | --- | --- | --- |
| `ARCH_ENGINE_BASELINE_NOT_FOUND` | ERROR | 2 | Path doesn't exist, isn't a file, has trailing slash, or is empty. |
| `ARCH_ENGINE_BASELINE_INVALID` | ERROR | 2 | Parses as JSON but structurally malformed (wrong type, missing `data.topology.canonical`). |
| `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA` | ERROR | 2 | Wrong `schemaVersion` or missing `archEngineVersion`. Also used (with severity downgraded to `WARNING`) for the newer-than-runtime warning. |
| `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH` | ERROR | 2 | Baseline's `command` is incompatible (e.g. `doctor`, `explain`). |
| `ARCH_ENGINE_DRIFT_DETECTED` | INFO | 0 | Surfaces drift in `diagnostics[]`; never blocks. |

Vocabulary growth is additive: pre-existing 11 v1.0.3 codes (locked
in the Phase E test) retain their order; the five new codes are
appended. Total locked codes: **16**.

---

## 5. Canonical Topology Output

`data.topology.canonical` is emitted unconditionally on every
inspect/analyze/check JSON v2 output. Shape:

```jsonc
{
  "data": {
    "topology": {
      // ... existing v1.1 counters preserved ...
      "canonical": {
        "graphSurfaceVersion": "1.0.0",
        "graphSurfaceHash": "<64-hex>",
        "nodes": [{ "id": "@x/a", "type": "package" }, ...],
        "edges": [{ "id": "e_<8-hex>", "from": "@x/a", "to": "@x/b", "type": "workspace_dependency" }, ...]
      }
    }
  }
}
```

Determinism (verified by Phase G tests):

- Nodes sorted by `id` ascending.
- Edges sorted by `id` ascending.
- `edge.id = "e_" + sha256(\`${from}|${to}|${type}\`).slice(0,8)`.
- `graphSurfaceHash = sha256(JSON.stringify(sortedNodes) + "\n" + JSON.stringify(sortedEdges))`.
- Re-running on the same source produces byte-identical canonical
  topology.
- Not present in JSON v1 (default `--json` output unchanged).

---

## 6. Baseline Reader

`packages/cli/src/baseline-reader.ts`. Strict validator per spec §8.

Implementation hook: throws `BaselineReadError` carrying a built
`CliDiagnostic`. Caller emits the diagnostic (JSON or human) and
calls `process.exit(diagnostic.exitCode)`.

Validation decision tree (all paths covered by tests):

1. Path exists, regular file → else `BASELINE_NOT_FOUND`.
2. Parses as JSON → else `BASELINE_INVALID`.
3. Is an object (not array, not null) → else `BASELINE_INVALID`.
4. `schemaVersion === "arch-engine.cli.v2"` → else `BASELINE_UNSUPPORTED_SCHEMA`.
5. `command ∈ {check, analyze, inspect}` → else `BASELINE_COMMAND_MISMATCH`.
6. `archEngineVersion` is a string → else `BASELINE_UNSUPPORTED_SCHEMA`.
7. `data.topology.canonical` has the expected shape → else `BASELINE_INVALID`.

**Implementation note (deviation from spec §6.1 version floor):** the
strict `>= "1.2.0"` floor in the spec was relaxed during
implementation because the version bump is intentionally deferred to
the v1.2.0 release-prep pass — the runtime currently reports `1.1.0`,
so a strict floor would self-reject baselines produced by this same
runtime. The actual gate is **canonical topology presence** (step 7
above), which is the real product requirement; the version is a proxy
the spec used because v1.1.0 didn't emit `canonical`. Once the
release-prep pass bumps to `1.2.0`, the existing canonical check
covers the floor naturally. Documented in §15 as a MICRO_DELTA.

**Newer-than-runtime path:** if `baseline.archEngineVersion >
current runtime`, the reader returns a `WARNING` diagnostic (severity
downgraded from `ERROR`) and continues. v1.2 implementations comparing
the v1.2 canonical surface still get correct results; future-version
fields are ignored.

---

## 7. Drift Engine

`packages/cli/src/drift.ts`. Pure function:

```ts
computeArchitectureDrift(baseline: DriftInput, current: DriftInput): DriftResult
```

Three orthogonal axes per spec §9:

| Axis | Source | Keys produced |
| --- | --- | --- |
| **Topology** | `canonical.nodes[].id` + `canonical.edges[].id` set diff | `addedNodes`, `removedNodes`, `changedNodes` (reserved, always empty in v1.2), `addedEdges`, `removedEdges`, `changedEdges` (reserved) |
| **Policy** | `violations[].id` set diff | `new`, `resolved`, `persisted`, `severityChanged` |
| **Signal** | scalar deltas | `scoreDelta`, `coverageDelta`, `connectivityDelta`, `confidenceDelta`, `violationsDelta`, `graphSurfaceHashChanged` |

Determinism guarantees (verified by Phase G tests):

- All output arrays sorted by `id` ascending.
- No filesystem, no environment, no wall-clock.
- Re-running on same inputs produces byte-identical output.
- Swapping `(baseline, current)` swaps `added`/`removed` and inverts
  scalar deltas — verified by a determinism test.

**Violation key (spec §9.1):**

- Prefer the stable v1.0.3 `v_<hex8>` id when present.
- Fallback: `"fallback:"+ruleId+"|"+from+"|"+to+"|"+severity` for
  legacy/non-v1.0.3 shapes. The fallback path is deterministic but
  never crypto-grade; in practice v1.0.3+ produces real IDs.

**Helper serialisers:**

- `buildDriftJsonBlock(drift, baselineMeta)` → the `data.drift` JSON
  shape per spec §11.3.
- `buildDriftSummaryMirror(drift)` → the four-counter top-level
  `summary.drift` mirror per spec §11.5.
- `buildDriftHeadlineSuffix(drift)` → the `(drift: +1 violation, +1
  edge)` parenthetical appended to `summary.headline` when drift is
  non-zero.

---

## 8. CLI Wiring

`--baseline <path>` registered globally; rejected by
`doctor`/`inspect`/`explain` at command entry via
`rejectBaselineForUnsupportedCommand` (exit 2,
`ARCH_ENGINE_INVALID_CONFIG`).

`check` and `analyze` read the baseline up front (before topology
extraction) so an invalid path fails fast.

Path policy: relative paths resolve against `process.cwd()`.

Flag interaction (verified by tests):

- `--baseline` + `--json` → v1 path doesn't emit drift block; drift
  output goes to v2 only. (JSON v1 unchanged.)
- `--baseline` + `--json --json-schema=v2` → drift block in `data.drift`.
- `--baseline` + `--format markdown` → drift section in markdown.
- `--baseline` + human default → drift block before exit footer.
- `--baseline` + `--ci` → drift output is no-color, deterministic.
- `--baseline` + `--quiet` → drift summary line printed, detail
  tables suppressed.
- `--baseline` + `--verbose` → drift includes absolute baseline path.
- `--baseline` + `--output <path>` → drift markdown/JSON written to
  file with v1.1.0 writer semantics (mkdir-p, LF, ANSI strip).

---

## 9. JSON v2 Drift Contract

Per spec §11. The check/analyze v2 envelopes gain (additive):

```jsonc
{
  "data": {
    "topology": {
      // ... existing v1.1 fields ...
      "canonical": { ... }     // always present (v1.2.0+)
    },
    "drift": {                 // only when --baseline is set
      "baseline": { path, schemaVersion, command, archEngineVersion, emittedAt, graphSurfaceHash },
      "summary": { ... 16 counter fields ... },
      "topology": { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, changedEdges },
      "violations": { new, resolved, persisted, severityChanged },
      "signal": { scoreDelta, coverageDelta, connectivityDelta, confidenceDelta, violationsDelta, graphSurfaceHashChanged }
    }
  },
  "summary": {
    // ... existing v1.1 keys ...
    "drift": { newViolations, resolvedViolations, addedEdges, removedEdges },   // only when --baseline is set
    "headline": "Blocked: 1 architecture violation. (drift: +1 violation, +1 edge)"   // suffix appears only when drift non-zero
  }
}
```

`summary.headline` carries the drift parenthetical via
`buildDriftHeadlineSuffix(drift)` when drift is non-zero. Top-level
status is unchanged from v1.1.0 (drift never alters status mapping).

---

## 10. Markdown / Human Output

### 10.1 Markdown (spec §12)

New section `## Architecture Drift` inserted between `## Violations`
and `## Diagnostics` for check/analyze when `--baseline` is set.

Contents (verified by tests):

- Attribution line: `Compared against \`baseline.json\`
  (arch-engine@1.x).`
- Summary table: only rows with non-zero counts.
- Detail sub-sections:
  - `### New violating edges` (rule / from / to / severity / CI-blocking)
  - `### Added edges` (from / to / type)
  - `### Removed edges` (from / to / type)
- Per-table cap of 25 entries; overflow line `_…and N more (see JSON
  v2 for full data)._`
- No-drift path: `_No architectural drift detected._`
- Verdict line gains `_(drift: ...)_` parenthetical when drift is
  non-zero.

### 10.2 Human (spec §13)

Drift block inserted in check/analyze:

- **With drift, blocking:** `Architecture drift detected (compared
  against baseline.json):` plus sub-blocks for new violations, added
  edges, removed edges, score delta (per-block cap of 5 entries).
- **With drift, non-blocking:** `Architecture drift observed (compared
  against baseline.json):` same shape; no exit-1.
- **No drift:** `✔ No architectural drift detected (compared against
  baseline.json).`

`--quiet` suppresses the detail tables but keeps the summary header.
`--verbose` substitutes the absolute baseline path for the basename.

---

## 11. Exit Behavior

Strict extension of v1.0.3 / v1.1.0 — drift never changes exit code.
Verified by Phase G subprocess tests:

| Condition | Exit | Status | Notes |
| --- | --- | --- | --- |
| Baseline invalid (any §8 reason) | 2 | `error` | `ARCH_ENGINE_BASELINE_*` diagnostic emitted. |
| `--baseline` on unsupported command | 2 | `error` | `ARCH_ENGINE_INVALID_CONFIG`. |
| Adapter / extraction failure | 3 | `error` | Unchanged from v1.0.3. |
| Internal invariant failure | 5 | `internal_error` | Unchanged. |
| Current run has blocking violations | 1 | `blocked` | Regardless of drift. |
| Current pass + drift only | 0 | `passed` or `not_enforced` | Drift surfaced in `diagnostics[]` as `ARCH_ENGINE_DRIFT_DETECTED` (INFO). |
| No policy + baseline | 0 | `not_enforced` | Drift still computed and reported. |

`analyze --baseline` is always exit 0 (modulo baseline-invalid /
extraction / internal).

---

## 12. Tests Added / Updated

### 12.1 New Phase G suite

| File | Tests | Coverage |
| --- | --- | --- |
| `cli-experience-phase-g-baseline-reader.test.ts` | 22 | Path validation, JSON parse, schema/command/version checks, newer-than-runtime warning, semver helper. Unit tests; no subprocess. |
| `cli-experience-phase-g-drift.test.ts` | 32 | Canonical topology emitter (determinism, sorting, de-dupe, hash stability) + drift engine across all three axes (topology, policy, signal) + serialisation helpers + determinism + symmetry under argument swap. Pure unit. |
| `cli-experience-phase-g-json-v2-baseline.test.ts` | 17 | Subprocess tests: canonical present in v2 unconditionally, drift conditionally, summary.drift mirror, path-leakage default, invalid baselines exit 2, unsupported commands exit 2, JSON v1 unchanged. |
| `cli-experience-phase-g-drift-output.test.ts` | 11 | Subprocess tests: markdown drift section + verdict parenthetical + no-drift line + human drift block + --quiet/--verbose interactions + --output writes drift markdown + determinism. |

**Total Phase G:** 82 tests.

### 12.2 Existing test loosened

`packages/cli/tests/cli-experience-phase-e.test.ts` — the `exports the
11 v1.0.3 ARCH_ENGINE_* codes per spec §6.2` assertion was tightened
into an "11-code prefix preserved" check that allows additive growth.
The semantics are explicitly documented in the test comment.

### 12.3 Existing tests preserved

Phase A (15), B (14), C (14), D-Lite (8), E (44), F (71), GitHub
Actions docs (23) — all green, untouched modulo the one Phase E
loosen described in §12.2.

---

## 13. Build / Typecheck / Test / Pack Results

| Gate | Result |
| --- | --- |
| `npm install` | ✅ clean |
| `npm run build` | ✅ all packages build (CLI: tsup ESM bundle clean, includes the three new internal modules in a chunk) |
| `npm run typecheck` | ✅ all 7 tsconfigs clean |
| `npm test` | ✅ **2168 / 2168 tests** across **662 / 662 files** (was 2086 / 658 at HEAD = `7ce44c7` → +82 Phase G, +4 files) |
| Freeze tests | ✅ **357 / 357** with no snapshot updates |
| `npm pack --dry-run --workspace @arch-engine/cli` | ✅ 19 files, tarball name `arch-engine-cli-1.1.0.tgz` (no version bump per mission) |

---

## 14. Compatibility Statement

- ✅ **JSON v1 default output unchanged.** Verified by Phase A/E/F
  backward-compat tests (which all still pass) plus a Phase G
  explicit `check --json` regression test that confirms no `data`
  envelope appears.
- ✅ **JSON v2 remains opt-in via `--json-schema=v2`.**
- ✅ **No new commands.** Five-verb surface preserved.
- ✅ **No public exports widened.** `packages/cli/package.json#exports`
  is exactly `{ ".": "./dist/bin.js" }` — the three new modules
  (`canonical-topology`, `baseline-reader`, `drift`) are bundled but
  not exposed.
- ✅ **No `@arch-governance/*` dependency.** `grep` confirms.
- ✅ **No package version bump.** All `@arch-engine/*` still at
  `1.1.0`.
- ✅ **No publish.** Registry untouched.
- ✅ **No tag.** Local + remote refs unchanged.
- ✅ **No commit yet.** Pending the human's review.
- ✅ **Phase A–F tests all still pass.**
- ✅ **Freeze snapshots unchanged.**

---

## 15. Remaining Deltas

| Delta | Severity | Notes |
| --- | --- | --- |
| Baseline reader's `archEngineVersion >= "1.2.0"` floor was relaxed | MICRO_DELTA | Spec §6.1 specifies a strict version floor; impl uses the real product gate (`data.topology.canonical` presence). The release-prep pass will bump to `1.2.0` and the floor effectively snaps into place at that point. Documented in §6 of this audit. |
| Hash format choice (unprefixed 64-hex, not `sha256:<…>`) | MICRO_DELTA | Spec §11.2 left this open; we picked unprefixed to match v1.0.3 violation-id conventions. Future v1.x can prefix if needed. |
| `inspect --baseline` not supported in v1.2 | LOW | Spec §4 deferred this. `inspect` already emits the topology needed to BE a baseline; this is a one-way feature today. Could add in v1.2.1 if users request topology-only drift via `inspect`. |
| Human drift block under `--quiet` shows summary line; spec §13.4 wanted "summary line only" | MICRO_DELTA | Implementation matches; documented as test in `cli-experience-phase-g-drift-output.test.ts:--quiet suppresses drift detail tables`. |
| `summary.headline` parenthetical format | MICRO_DELTA | Spec §11.5 floated `"(drift: +1 violation, +1 edge)"`; impl emits this exact format when both counters are non-zero. Implementation matches. |
| Newer-than-runtime warning uses severity override | MICRO_DELTA | The reader downgrades `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA` from `ERROR` to `WARNING` for this path (the metadata table is `ERROR` by default). Spec §8.3 allowed this; the override is documented in the reader source. |

No BLOCKER or HIGH deltas.

---

## 16. Recommended Next Mission

**Arch-Engine v1.2.0 Minor Release Preparation Pass.**

Mission framing: bump all seven public packages from `1.1.0` →
`1.2.0` in lockstep, update `CHANGELOG.md`, write
`audits/release/ARCH_ENGINE_V1_2_0_MINOR_RELEASE_PREFLIGHT.md`, run
the full validation matrix at the new version, run a local
public-style install smoke against the seven new tarballs, and
produce the human-driven publish checklist. Standard
release-prep pattern.

After v1.2.0 ships, the natural sequels are:

- **GitHub Actions baseline workflow demo pass** — ship
  `examples/github-actions/arch-engine-pr-baseline-{report,comment}.yml`
  templates that download the `main` baseline artifact and compare.
  Spec §15 already framed this as a follow-up.
- **Private AGP Emitter MVP Implementation Pass** — opens the AGP
  track per the long-deferred contract.

Default to the **v1.2.0 release-prep pass** as the immediate
follow-on.

*End of implementation audit.*
