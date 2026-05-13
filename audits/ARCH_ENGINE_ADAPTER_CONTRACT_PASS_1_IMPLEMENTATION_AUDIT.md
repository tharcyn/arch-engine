# Arch-Engine Adapter Contract Pass 1 Implementation Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | Adapter Contract Pass 1 — Internal `ArchitectureAdapter` Interface |
| Predecessor docs | [`docs/adapters/multi-adapter-surface-spec.md`](../docs/adapters/multi-adapter-surface-spec.md), [`audits/ARCH_ENGINE_MULTI_ADAPTER_SURFACE_SPECIFICATION_AUDIT.md`](./ARCH_ENGINE_MULTI_ADAPTER_SURFACE_SPECIFICATION_AUDIT.md) |
| Current published baseline | `@arch-engine/*@1.2.0` |
| Target after this pass | unchanged — still `@arch-engine/*@1.2.0` (no version bump) |

---

## 1. Executive Verdict

**`ADAPTER_CONTRACT_PASS_1_READY_FOR_PASS_2`**

The internal `ArchitectureAdapter` contract and registry are
landed, `@arch-engine/adapter-monorepo` conforms to the new shape
structurally, and the existing v1.2.0 public surface remains
byte-identical for CLI consumers. Build, typecheck, pack, and the
full 2,228-test vitest suite pass.

Pass 1 is the zero-observable-behavior-change foundation the
multi-adapter spec calls for. Pass 2 (pnpm adapter MVP, `data.adapter`
JSON v2 block, six new error codes) can now begin without
re-architecting the contract surface.

---

## 2. Scope

This audit covers **the Pass 1 implementation only**:

- Internal contract & registry **types** added to `@arch-engine/cli`
  internals — not exported from any public package index.
- `@arch-engine/adapter-monorepo` refactor — adds a class conforming
  structurally to the contract; preserves every existing public
  export byte-identical.
- Unit tests for contract, registry, and adapter-monorepo
  compatibility.
- Implementation audit (this file).

Pass 1 explicitly does NOT:

- Wire the registry into the CLI runtime path (deferred — Pass 2
  bundles this with the pnpm adapter).
- Surface adapter identity to JSON v2 (no `data.adapter` block).
- Introduce any new `ARCH_ENGINE_*` codes.
- Add a new public package.
- Change any CLI output.
- Bump any version.

---

## 3. Files Created / Modified

### Created (4 files)

| File | Purpose |
| --- | --- |
| `packages/cli/src/adapters/adapter-contract.ts` | Internal `ArchitectureAdapter`, `AdapterContext`, `AdapterDetectionResult`, `AdapterTopologyResult`, `AdapterCapabilitySummary`, `AdapterDiagnostic` types + `createAdapterContext` + `isArchitectureAdapter` guard. |
| `packages/cli/src/adapters/adapter-registry.ts` | `RegisteredArchitectureAdapter` + `selectArchitectureAdapter()` deterministic selection algorithm + `registerArchitectureAdapter` factory. |
| `packages/cli/tests/adapters/adapter-contract.test.ts` | Contract structural tests — 9 tests pinning shape of `createAdapterContext`, `isArchitectureAdapter`, and the four key result types. |
| `packages/cli/tests/adapters/adapter-registry.test.ts` | Registry selection tests — 13 tests covering single-adapter, confidence ordering, precedence tie-break, name tie-break, multi-HIGH conflict, empty/no-detection cases, deterministic replay, and factory shape. |
| `packages/cli/tests/adapters/adapter-monorepo-compat.test.ts` | Adapter compatibility tests — 15 tests proving legacy free-function preservation, new class structural conformance, deterministic replay, and legacy ↔ structural cross-equality. |
| `audits/ARCH_ENGINE_ADAPTER_CONTRACT_PASS_1_IMPLEMENTATION_AUDIT.md` | This audit. |

### Modified (2 files)

| File | Change |
| --- | --- |
| `packages/adapter-monorepo/src/index.ts` | Added `MonorepoArchitectureAdapter` class + `createMonorepoArchitectureAdapter` factory + `monorepoArchitectureAdapter` singleton. Extracted the existing extraction pipeline into a single internal function (`runInternalExtraction`) consumed by both the legacy free function and the new class. The legacy free function `runMonorepoExtraction(cwd)` is preserved byte-identical (verified by tests). Added internal `Pass 1` types (`MonorepoAdapterContext`, `MonorepoAdapterDetectionResult`, etc.) marked `@internal` so they do not widen the v1.x public freeze. One small bug fix surfaced: the new sourceFiles path resolution correctly handles the repo-root case where `path.relative(cwd, cwd) === ''` — old free-function logic never used this path. |
| `packages/cli/tsconfig.json` | Added `src/adapters/adapter-contract.ts` and `src/adapters/adapter-registry.ts` to the `include` list so typecheck and CLI bundling pick them up. |

### Not Modified

- `packages/cli/src/runner-bridge.ts` — still uses the legacy
  `runMonorepoExtraction(cwd)` path. The registry exists but is
  not yet wired here; that lands in Pass 2.
- `packages/cli/src/commands/*.ts` — unchanged.
- `packages/cli/src/render-v2.ts` — no `data.adapter` block.
- `packages/cli/src/error-codes.ts` — no new `ARCH_ENGINE_*` codes.
- All `package.json` files — no version bump, no new dependency.

---

## 4. Contract Implemented

The `ArchitectureAdapter` interface in
`packages/cli/src/adapters/adapter-contract.ts` matches the
locked shape in `multi-adapter-surface-spec.md` §6.1–§6.4:

```ts
interface ArchitectureAdapter extends AdapterIdentity {
  readonly adapterName: string;
  readonly adapterVersion: string;
  detect(context: AdapterContext): AdapterDetectionResult;
  extractTopology(context: AdapterContext): AdapterTopologyResult;
  explain?(): AdapterCapabilitySummary;
}
```

Supporting types:

| Type | Purpose |
| --- | --- |
| `AdapterIdentity` | `{ adapterName, adapterVersion }` — base identity. |
| `AdapterContext` | `{ cwd, cache }` — read-only context per invocation. Pass 1 keeps it minimal (no pre-resolved file helpers yet) to avoid contract churn during implementation. |
| `AdapterConfidence` | `'HIGH' \| 'MEDIUM' \| 'LOW' \| 'NONE'`. |
| `AdapterPackageManager` | `'pnpm' \| 'yarn' \| 'npm' \| 'yarn-pnp' \| 'unknown'`. |
| `AdapterDiagnostic` | Narrower than `CliDiagnostic`; adapters need not depend on the CLI's error-codes table. |
| `AdapterDetectionResult` | `{ adapterName, detected, confidence, workspaceKind, packageManager, reasons, warnings, diagnostics }`. |
| `AdapterCanonicalNode`, `AdapterCanonicalEdge`, `AdapterSignalPayload` | Building blocks for `AdapterTopologyResult`. |
| `AdapterTopologyResult` | `{ graphSurfaceVersion, graphSurfaceHash, nodes, edges, signals, coverage, confidence, sourceFiles, adapterMetadata, diagnostics }`. |
| `AdapterCapabilitySummary` | Locked `executesRepositoryCode: false` per spec §6.1 invariant. |

Helpers:

- `createAdapterContext(cwd)` — returns a fresh context with an
  isolated cache map.
- `isArchitectureAdapter(candidate)` — structural type-guard for
  loaded modules; verifies presence and callability of required
  methods.

**Internal-only.** None of these types are re-exported from any
`@arch-engine/cli` or `@arch-engine/adapter-monorepo` public
`index.ts`. The contract is consumed structurally by the registry
and by tests; no external consumer can depend on it through the
public API.

---

## 5. Registry Implemented

`packages/cli/src/adapters/adapter-registry.ts` ships the
deterministic selection algorithm locked in
`multi-adapter-surface-spec.md` §7.

```
1. Run detect() against every registered adapter.
2. Keep results where detected === true.
3. Sort by (confidence DESC, declaredPrecedence ASC, adapterName ASC).
4. Pick the top entry; classify status:
     HIGH only      → RESOLVED
     HIGH × N>1     → CONFLICT (top still selected)
     MEDIUM only    → RESOLVED
     LOW only       → LOW_CONFIDENCE
     nothing        → NONE (selected = null)
```

Public API (internal-only):

- `RegisteredArchitectureAdapter` — wraps an adapter with its
  declared precedence number.
- `AdapterSelectionStatus = 'RESOLVED' | 'CONFLICT' | 'LOW_CONFIDENCE' | 'NONE'`.
- `AdapterSelectionResult` — `{ status, selected, detection, runnersUp[], allDetections[] }`.
- `selectArchitectureAdapter(adapters, ctx)` — the algorithm.
- `registerArchitectureAdapter(adapter, precedence)` — factory.

Determinism: every test in `adapter-registry.test.ts` calls the
selector twice and asserts byte-identical results. The selector
itself is pure (no I/O, no `Date.now()`, no mutation of inputs).

**Wiring status:** the registry exists and is exercised by tests
but is NOT yet imported by `runner-bridge.ts` or any CLI command.
Pass 2 connects it.

---

## 6. Monorepo Adapter Refactor

`packages/adapter-monorepo/src/index.ts` was reorganised into
three layers:

1. **Public (v1.x freeze, unchanged):**
   - `runMonorepoExtraction(cwd) → MonorepoExtractionResult`
   - `classifyAuthorityDomain(route) → AuthorityDomain`
   - `createMonorepoAdapter()`, `monorepoAdapter`
   - Types: `ExtractionMetadata`, `MonorepoExtractionResult`,
     `RouteServiceMapping`, `AuthorityDomain`

2. **Internal extraction pipeline (new, single source of truth):**
   - `probeWorkspace(cwd)` — workspace shape probe with byte-identical
     behaviour to v1.2.0's `detectWorkspace` + parsing logic.
   - `runInternalExtraction(cwd)` — the full extraction state. Both
     `runMonorepoExtraction` and `MonorepoArchitectureAdapter.extractTopology`
     consume this. One pipeline, two output shapes — keeps legacy
     and structural outputs deterministically consistent.

3. **Pass 1 structural surface (new):**
   - `MonorepoArchitectureAdapter` class with `adapterName`,
     `adapterVersion`, `detect()`, `extractTopology()`, `explain()`.
   - `createMonorepoArchitectureAdapter()` factory.
   - `monorepoArchitectureAdapter` pre-built singleton.
   - Internal types (`MonorepoAdapterContext`,
     `MonorepoAdapterDetectionResult`,
     `MonorepoAdapterTopologyResult`, etc.) declared locally so this
     package has **no dependency on `@arch-engine/cli`**. The CLI's
     registry consumes the class structurally.

### Preservation of `runMonorepoExtraction`

The legacy free function:

- Returns the exact same `MonorepoExtractionResult` keys in the
  same order.
- Returns `metadata.workspaceType` and `metadata.extractionMode`
  values byte-identical to v1.2.0.
- Returns `metadata.coverage`, `metadata.connectivity`,
  `metadata.topologyConfidence` as the same literals.
- Returns `adjacencyMap` keyed and sorted identically.
- Returns `routeServiceMap.forward` with the same package name →
  `backend_route` mapping (including `'.'` for the root package).
- Returns `edgesByAdapter.local_fs` as the same array shape (with
  `confidence: 'namespace_inferred'`, `adapter_id: 'local_fs'`).
- Returns `authorityCrossings: []` exactly.

Verified by `adapter-monorepo-compat.test.ts` and by the
before/after CLI output diff (see §7).

### Class behaviour summary

| Method | Behaviour |
| --- | --- |
| `detect(ctx)` | Reads `pnpm-workspace.yaml` or `package.json#workspaces` (same probe as legacy). Returns confidence `HIGH` for pnpm, `HIGH` for yarn-npm, `LOW` for single-package fallback. |
| `extractTopology(ctx)` | Runs `runInternalExtraction`, sorts nodes/edges canonically, computes `graphSurfaceHash` via the same sha256 algorithm as `packages/cli/src/canonical-topology.ts`, returns the full `AdapterTopologyResult`. |
| `explain()` | Returns a capability summary with `executesRepositoryCode: false` and a note about Pass 1 transitional behavior. |

### Pass 1 transitional decision

The monorepo adapter currently still claims `pnpm-workspace.yaml`
with `HIGH` confidence — same as v1.2.0. Spec §11.4 says this
transitions to "declined / LOW confidence" only once
`@arch-engine/adapter-pnpm` ships in Pass 2. Pass 1 preserves
v1.2.0 behaviour exactly to satisfy the
"zero observable behavior change" requirement.

---

## 7. Behavior Preservation

Before/after CLI capture from the repository root (yarn-npm
workspace) and from `examples/demo-drift`:

| Capture | File pair | Diff |
| --- | --- | --- |
| `doctor` human | `arch-doctor-before.txt` ↔ `arch-doctor-after.txt` | **identical** |
| `inspect` human | `arch-inspect-before.txt` ↔ `arch-inspect-after.txt` | **identical** |
| `analyze` human | `arch-analyze-before.txt` ↔ `arch-analyze-after.txt` | only timing fields (Extraction/Pipeline/Total ms) differ — wall-clock variance |
| `check` human | `arch-check-before.txt` ↔ `arch-check-after.txt` | only timing fields differ — wall-clock variance |
| `doctor --json` (v1 default) | raw diff | **byte-identical** |
| `inspect --json --json-schema=v2` | raw diff → `emittedAt` only | after normalising `emittedAt` and timing fields: **byte-identical** |
| `check --json --json-schema=v2` | raw diff → `emittedAt` + `totalMs` | after normalisation: **byte-identical** |
| `demo-drift check` human | `arch-demo-check-before.txt` ↔ `arch-demo-check-after.txt` | **identical** |
| `demo-drift check --json --json-schema=v2` | raw diff → `emittedAt` + timing | after normalisation: **byte-identical** |

Normalisation algorithm (per `multi-adapter-surface-spec.md` §8
"no wall-clock in identity" carve-out): set `emittedAt` to a
constant and zero out `data.executionMetrics.{extractionMs,pipelineMs,totalMs}`
before comparison.

Conclusion: **no meaningful CLI output change.** Every difference
is a wall-clock measurement that would have varied even without
the refactor.

### Exit code preservation

| Command | Before | After |
| --- | --- | --- |
| `doctor` (repo root) | 0 | 0 |
| `inspect` (repo root) | 0 | 0 |
| `analyze` (repo root) | 0 | 0 |
| `check` (repo root) | 0 | 0 |
| `check` (demo-drift, expected violation) | 1 | 1 |
| `check --json --json-schema=v2` (demo-drift) | 1 | 1 |

---

## 8. Tests Added / Updated

### Added: `packages/cli/tests/adapters/adapter-contract.test.ts` (9 tests)

- `createAdapterContext` returns isolated cache.
- `isArchitectureAdapter` accepts conforming objects, rejects
  malformed objects (null/undefined/missing-fields).
- Detection result shape with all fields populated.
- Topology result canonical shape (graphSurfaceVersion 1.0.0,
  64-hex hash, sorted nodes/edges, signals carrier).
- Capability summary with locked `executesRepositoryCode: false`.

### Added: `packages/cli/tests/adapters/adapter-registry.test.ts` (13 tests)

- Single adapter: RESOLVED at HIGH, LOW_CONFIDENCE at LOW, NONE
  when not detected.
- HIGH beats MEDIUM beats LOW regardless of registration order.
- MEDIUM wins when no HIGH exists.
- Lower declared precedence wins ties at equal confidence.
- Alphabetical name tie-break at equal confidence + precedence.
- Multiple HIGH → CONFLICT with correct selection.
- Empty registry → NONE.
- All-undetected → NONE.
- Deterministic replay across invocations.
- `registerArchitectureAdapter` factory wraps correctly.

### Added: `packages/cli/tests/adapters/adapter-monorepo-compat.test.ts` (15 tests)

- Legacy public surface: top-level keys, metadata shape, adjacency
  map, route service map, edges by adapter — all locked.
- `classifyAuthorityDomain` returns documented values for every
  prefix.
- `createMonorepoAdapter` and `monorepoAdapter` singleton both
  expose `runMonorepoExtraction`.
- New class exposes `adapterName === '@arch-engine/adapter-monorepo'`
  and `adapterVersion === '1.2.0'`.
- Factory + singleton both produce `MonorepoArchitectureAdapter`
  instances.
- Singleton structurally satisfies `isArchitectureAdapter`.
- `detect()` returns `HIGH` confidence + `package-json-workspaces`
  workspaceKind on the repo root.
- `extractTopology()`: canonical shape, sorted nodes/edges, edge
  ids match `e_<8hex>`, signals carry workspace metadata,
  sourceFiles all relative POSIX.
- Deterministic replay: two invocations produce byte-identical
  output.
- `explain()` capability summary with `executesRepositoryCode: false`.
- Diagnostics array empty in Pass 1 (no new ARCH_ENGINE_* surfacing).
- adapterMetadata empty in Pass 1 (no JSON v2 surfacing).
- Cross-check: legacy adjacencyMap keys equal canonical node ids.
- Cross-check: legacy edge count equals canonical edge count.

**Total Pass 1 tests added: 37.** All passing. No existing tests
modified or weakened.

---

## 9. Build / Typecheck / Test / Pack Results

| Step | Result |
| --- | --- |
| `npm run build` (initial sanity) | ✅ all 7 publishable packages + 4 internal adapters + action all build clean |
| `npm run typecheck` | ✅ all 7 `tsc --noEmit` passes pass (schema, core, adapter-monorepo, 3 governance packs, cli) |
| `npx vitest run packages/cli/tests/adapters` | ✅ 37 / 37 tests pass |
| `npx vitest run packages/core/tests/freeze` | ✅ 357 / 357 tests pass across 162 freeze test files |
| `npm test` (full suite) | ✅ 2,228 / 2,228 tests pass across 665 test files in 53.7 s |
| `npm pack --dry-run --workspaces` | ✅ all 7 public packages pack cleanly at v1.2.0 |

No test suites modified to make them pass. No snapshot widenings.
No freeze-test changes.

---

## 10. Compatibility Statement

- **No CLI output change.** Verified by diff of doctor / inspect /
  analyze / check / demo-drift outputs in human and JSON v1 / JSON
  v2 modes. Only volatile fields (`emittedAt`, timing ms) differ
  between runs, which is true of any two consecutive CLI runs.
- **No JSON v1 shape change.** Doctor `--json` is byte-identical.
- **No JSON v2 shape change.** Inspect / check `--json --json-schema=v2`
  identical after normalising volatile fields.
- **No `data.adapter` block yet.** Pass 1 deliberately does not
  surface adapter identity to JSON v2; that lands with Pass 2.
- **No new public package.** Zero new entries under
  `package.json#workspaces` published; no new `@arch-engine/*`
  package on the wire.
- **No version bump.** All 7 packages still on v1.2.0.
- **No `npm publish`.** No `git tag` created. No `npm publish`
  invocation.
- **No `@arch-governance/*` dependency.** Confirmed by grep against
  every `package.json`.
- **No new public exports widen the v1.x freeze.** The internal
  contract lives at `packages/cli/src/adapters/*` and is excluded
  from any `package.json#exports` map. The
  `MonorepoArchitectureAdapter` class is exported from
  `@arch-engine/adapter-monorepo` so the CLI registry can consume
  it structurally; however the class is documented as Pass-1
  transitional and not part of the v1.x freeze guarantee — future
  minor releases may refine its method signatures.
- **No AGP emitter.** No `@arch-engine/agp-emitter` package created;
  no AGP record emission code; no `@arch-governance/*` import.

---

## 11. Remaining Deltas

### BLOCKER

None.

### HIGH

None.

### MEDIUM

- **Registry not yet wired to the CLI runtime.** Pass 1 ships the
  registry behind a private API; Pass 2 must thread it through
  `runner-bridge.ts` so adapter selection becomes the runtime
  path. This is deferred by design — pulling it forward without an
  alternative adapter would silently change which code runs
  without changing the result, which adds risk for zero benefit.

### LOW

- **`MonorepoArchitectureAdapter` is publicly exported from
  `@arch-engine/adapter-monorepo`.** The class is part of the
  ESM-published surface (declared in the `index.d.ts`). We chose
  to expose it because (a) Pass 1's CLI tests need to import it
  via the package boundary, and (b) it lets the future
  `runner-bridge` use the class without re-defining the contract
  there. The class is documented in JSDoc as Pass 1 transitional;
  consumers SHOULD NOT depend on its exact method shape staying
  stable through future minor releases.
- **Pass 1 internal types are exported with `@internal` JSDoc
  markers.** The adapter package's `tsconfig.json` has
  `stripInternal: true`, so these markers cause the `.d.ts` to
  omit the types from the type-system surface even though the
  values are reachable at runtime through the named export. Net
  effect: TS consumers see the public freeze; JS consumers can
  reach internals but at their own risk.

### MICRO_DELTA

- **One-line fix in path resolution:** the new `sourceFiles`
  capture had to special-case the root-package case where
  `path.relative(cwd, cwd) === ''`. The legacy
  `runMonorepoExtraction` already handled this for the
  `backend_route` field via `relative || '.'`. The fix is identical
  in spirit. No legacy output is affected — only the new adapter's
  `sourceFiles` array, which is not user-visible in Pass 1.
- **`runInternalExtraction` adds a tiny piece of work** (push
  manifest paths into `sourceFiles`) that was not in v1.2.0's
  free function. This work is internal-only — never surfaces to
  `runMonorepoExtraction`'s legacy output. Cost: O(N) array
  operations on already-iterated paths; trivially below the
  noise floor of existing extraction wall-clock time (1–3 ms total
  on this repo).

---

## 12. Recommended Next Mission

**`ARCH_ENGINE_ADAPTER_PASS_2_PNPM_ADAPTER_MVP`**

Concrete next steps per spec §15.2:

1. Create the new public package
   `@arch-engine/adapter-pnpm@0.1.0` (additive; not part of the
   existing v1.x freeze of the seven published packages).
2. Implement the pnpm-specific
   `class PnpmArchitectureAdapter implements ArchitectureAdapter`
   per spec §9 — pnpm-workspace.yaml parsing with brace expansion,
   exclusion globs, `workspace:*` protocol detection, full set of
   `dependencies` / `devDependencies` / `peerDependencies` /
   `optionalDependencies` edge kinds.
3. Wire the registry into `packages/cli/src/runner-bridge.ts` so
   selection runs through `selectArchitectureAdapter`. Pass 1's
   monorepo adapter stays the fallback; pnpm wins by precedence
   when detected.
4. Add `data.adapter` JSON v2 block per spec §12 — sibling under
   `data.*` with `name`, `version`, `confidence`, `reasons`,
   `alsoDetected`, `metadata`.
5. Add the six new `ARCH_ENGINE_*` error codes per spec §13 to
   `packages/cli/src/error-codes.ts` (`ARCH_ENGINE_ADAPTER_CONFLICT`,
   `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE`,
   `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID`,
   `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED`,
   `ARCH_ENGINE_LOCKFILE_UNSUPPORTED`,
   `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED`).
6. Adapter-monorepo's `detect()` transitions to `decline pnpm` /
   "let the pnpm adapter win" per spec §11.4.
7. Bump `@arch-engine/cli` to **1.3.0** (minor; new JSON v2 surface,
   new error codes, additive registry behaviour). The other six
   published packages stay on v1.2.0 unless they actively consume
   the new contract.
8. Add Phase H integration tests covering selection precedence,
   `data.adapter` presence, JSON v1 unchanged, `doctor` human
   output naming the chosen adapter.

Pass 2 is the milestone that delivers user-visible value: pnpm
repos that previously fell back to the limited line-based parser
now extract topology with full protocol awareness.

---

## 13. Appendix — File Listing

**Created:**
```
packages/cli/src/adapters/adapter-contract.ts
packages/cli/src/adapters/adapter-registry.ts
packages/cli/tests/adapters/adapter-contract.test.ts
packages/cli/tests/adapters/adapter-registry.test.ts
packages/cli/tests/adapters/adapter-monorepo-compat.test.ts
audits/ARCH_ENGINE_ADAPTER_CONTRACT_PASS_1_IMPLEMENTATION_AUDIT.md
```

**Modified:**
```
packages/adapter-monorepo/src/index.ts
packages/cli/tsconfig.json
```

**Unchanged from v1.2.0:**
```
all package.json files
all governance-pack-* sources
packages/cli/src/runner-bridge.ts
packages/cli/src/commands/*.ts
packages/cli/src/render-v2.ts
packages/cli/src/render-markdown.ts
packages/cli/src/error-codes.ts
packages/cli/src/canonical-topology.ts
packages/cli/src/baseline-reader.ts
packages/cli/src/drift.ts
docs/**
all existing test files
```

*End of Pass 1 Implementation Audit.*
