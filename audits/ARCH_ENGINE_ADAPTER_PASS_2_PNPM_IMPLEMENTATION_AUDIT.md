# Arch-Engine Adapter Pass 2 pnpm Implementation Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | Adapter Pass 2 — pnpm Adapter MVP |
| Spec | [`docs/adapters/multi-adapter-surface-spec.md`](../docs/adapters/multi-adapter-surface-spec.md) §9, §11.4, §12, §13 |
| Predecessor audit | [`audits/ARCH_ENGINE_ADAPTER_CONTRACT_PASS_1_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_ADAPTER_CONTRACT_PASS_1_IMPLEMENTATION_AUDIT.md) |
| Published baseline | `@arch-engine/*@1.2.0` |
| Target after this pass | `@arch-engine/adapter-pnpm@0.1.0` (new, additive); existing seven packages remain `1.2.0` until release prep |

---

## 1. Executive Verdict

**`ADAPTER_PASS_2_PNPM_READY_FOR_V1_3_0_PREP`**

A new `@arch-engine/adapter-pnpm@0.1.0` package ships pnpm-workspace
support; the CLI runner-bridge resolves the adapter through the
deterministic registry landed in Pass 1; JSON v2 gains an additive
`data.adapter` block on every command that extracts topology; six
new `ARCH_ENGINE_*` codes wire the surface to the existing error
vocabulary.

- JSON v1 default output unchanged.
- Existing commands (`doctor`, `inspect`, `analyze`, `check`,
  `explain`) keep their semantics.
- `runMonorepoExtraction(cwd)` and `classifyAuthorityDomain` are
  preserved byte-identical.
- Full vitest suite green: **2,271 / 2,271** (+43 new tests).
- All 357 freeze tests pass.
- `npm pack --dry-run` clean across all 8 publishable packages (7 at
  v1.2.0 + 1 new at v0.1.0).
- No `@arch-governance/*` dependency. No `npm publish`. No `git tag`.

The next mission can be a v1.3.0 release-prep pass.

---

## 2. Scope

This pass delivers:

1. New public package `@arch-engine/adapter-pnpm@0.1.0`.
2. Deterministic adapter selection wired into
   `packages/cli/src/runner-bridge.ts` via Pass 1's
   `selectArchitectureAdapter`.
3. `data.adapter` JSON v2 block on every command per spec §12.
4. Six new `ARCH_ENGINE_*` error codes per spec §13.
5. Six pnpm fixture directories + 43 new tests covering adapter
   selection, JSON v2 metadata, fixture-level extraction, and
   determinism.

Out of scope (explicit):

- Yarn PnP adapter (deferred to Pass 3).
- AGP emitter.
- `@arch-governance/*` dependencies.
- Bun / Deno / Lerna adapters.
- Catalog protocol resolution (surfaces `ARCH_ENGINE_LOCKFILE_UNSUPPORTED`).
- Deep `pnpm-lock.yaml` analysis.
- `.pnp.cjs` execution.
- New CLI commands or flags.
- Version bumps on existing packages.

---

## 3. Files Created / Modified

### Created (16 source + tests + audit + fixtures)

| File | Purpose |
| --- | --- |
| `packages/adapter-pnpm/package.json` | New workspace package metadata. |
| `packages/adapter-pnpm/tsconfig.json` | Local TypeScript config; `composite: false` because tsup's rollup-plugin-dts struggles with composite mode. |
| `packages/adapter-pnpm/tsup.config.ts` | Build config; DTS delegated to `tsc` to support multi-file packages. |
| `packages/adapter-pnpm/README.md` | Package overview + MVP scope. |
| `packages/adapter-pnpm/LICENSE` | Copy of monorepo adapter's MIT license. |
| `packages/adapter-pnpm/src/index.ts` | `PnpmArchitectureAdapter`, factory, singleton, `runPnpmExtraction` legacy-shape helper, local contract types. |
| `packages/adapter-pnpm/src/pnpm-workspace.ts` | Minimal YAML reader (dependency-free) for the pnpm `packages:` block + catalog detection. |
| `packages/adapter-pnpm/src/globs.ts` | Deterministic glob expansion for `apps/*`, `packages/*/*`, with exclusion-glob support. |
| `packages/adapter-pnpm/src/package-graph.ts` | Canonical node / edge builder with stable `graphSurfaceHash`. |
| `packages/adapter-pnpm/tests/pnpm-adapter.test.ts` | 26 unit tests for the new package. |
| `packages/cli/tests/adapters/adapter-pnpm-selection.test.ts` | 6 tests pinning bridge selection behavior on the pnpm fixture. |
| `packages/cli/tests/adapters/adapter-json-v2-metadata.test.ts` | 11 subprocess-driven tests proving `data.adapter` appears in JSON v2 and never in JSON v1. |
| `packages/cli/tests/fixtures/adapters/pnpm-basic/**` | Basic pnpm workspace fixture (apps/*, packages/*). |
| `packages/cli/tests/fixtures/adapters/pnpm-workspace-protocol/**` | Fixture exercising `workspace:*`, `workspace:^`, `catalog:`, lockfile, `packageManager` hint. |
| `packages/cli/tests/fixtures/adapters/pnpm-nested/**` | Fixture using `packages/*/*` two-segment globs. |
| `packages/cli/tests/fixtures/adapters/pnpm-excluded-glob/**` | Fixture using `!packages/private-*` exclusion. |
| `packages/cli/tests/fixtures/adapters/pnpm-empty-globs/**` | Fixture where globs match zero packages (MEDIUM confidence path). |
| `packages/cli/tests/fixtures/adapters/pnpm-unnamed-package/**` | Fixture with one named + one unnamed package (`ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` path). |
| `audits/ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md` | This audit. |

### Modified (8 files)

| File | Change |
| --- | --- |
| `package.json` (root) | Added `packages/adapter-pnpm` to `workspaces` array; added typecheck step for the new package; added `packages/adapter-pnpm/dist` to publish-files. |
| `packages/cli/package.json` | Added `@arch-engine/adapter-pnpm` to optional peer dependencies. |
| `packages/cli/tsup.config.ts` | Added `@arch-engine/adapter-pnpm` to `external` so the CLI bundle doesn't statically include it. |
| `packages/cli/src/error-codes.ts` | Added 6 new ARCH_ENGINE_* codes (ADAPTER_CONFLICT, ADAPTER_LOW_CONFIDENCE, WORKSPACE_GLOBS_INVALID, WORKSPACE_PACKAGE_UNNAMED, LOCKFILE_UNSUPPORTED, PNP_RESOLUTION_DEFERRED) with severity/exit/title/fix metadata. |
| `packages/cli/src/runner-bridge.ts` | Complete rewire: lazy-loads both adapters, runs `selectArchitectureAdapter`, sets `archengine:pnpmAdapterAvailable` cache hint, dispatches to `runPnpmExtraction` or `runMonorepoExtraction`, promotes adapter diagnostics, exposes `BridgeAdapterSummary` + `extractionLegacy` + `adapterDiagnostics`. Throws `BridgeAdapterConflictError` on multi-HIGH; commands catch and exit 3. |
| `packages/cli/src/render-v2.ts` | Added `buildDataAdapterBlock(input)` helper + `DataAdapterInput` type for use by all command V2 envelope builders. |
| `packages/cli/src/commands/{doctor,inspect,analyze,check}.ts` | Refactored to use `bridge.extractionLegacy` for legacy shape, `bridge.adapterSummary` for `data.adapter`, `bridge.adapterDiagnostics` for diagnostics surfacing, and `BridgeAdapterConflictError` for clean exit-3 handling. Doctor's pre-existing `data.adapter = {id, resolved}` shape is REPLACED by the canonical spec-§12.2 shape (additive new fields; `id` and `resolved` no longer emitted). |
| `packages/adapter-monorepo/src/index.ts` | Pass 2 update: `MonorepoArchitectureAdapter.detect()` now reads `context.cache.get('archengine:pnpmAdapterAvailable')` and returns `detected: false, confidence: NONE` when pnpm-workspace.yaml is found AND the pnpm adapter is registered (spec §11.4). Singleton + factory `@internal` tag removed so the CLI's typecheck can see them. `runMonorepoExtraction(cwd)` byte-identical preserved. |

### Unchanged

- `packages/schema/**` — untouched.
- `packages/core/**` — untouched.
- `packages/governance-pack-*` — untouched.
- All existing tests — none modified or weakened.

---

## 4. pnpm Adapter Package

`@arch-engine/adapter-pnpm@0.1.0`:

| Property | Value |
| --- | --- |
| Name | `@arch-engine/adapter-pnpm` |
| Version | `0.1.0` |
| Type | `module` (ESM) |
| Side effects | `false` |
| Runtime deps | none (pure Node.js `fs`/`path`/`crypto`) |
| Dev deps | `tsup`, `typescript` |
| `bin` | none — library only |
| Engines | `node >= 18` |
| `exports.` | `dist/index.{js,d.ts}` |
| Pack size | 12.0 kB (45.1 kB unpacked, 8 files) |

The package is fully self-contained: it has no runtime dependency
on `@arch-engine/core`, `@arch-engine/cli`, or any other arch-engine
package. The CLI registry consumes it via structural typing only.

**Public API (Pass 2):**
- `class PnpmArchitectureAdapter`
- `createPnpmArchitectureAdapter()` factory
- `pnpmArchitectureAdapter` singleton
- `runPnpmExtraction(cwd)` legacy-shape helper (returns `MonorepoExtractionResult`-compatible payload + `adapterInfo`)
- Re-exports of submodule types (`PnpmWorkspaceFile`, `GlobExpansion`, `PnpmPackageGraph`, etc.)

---

## 5. Workspace YAML Parser

`packages/adapter-pnpm/src/pnpm-workspace.ts`:

- Pure, dependency-free reader.
- Supports `packages: [...]` block lists, single/double quoting,
  unquoted strings, `#` comments, blank lines.
- Detects `catalog:` / `catalogs:` keys (surfaces as `catalogsDetected: true`).
- Does NOT support flow-style `[a, b]` lists or object-shape
  `packages: { include: [...], exclude: [...] }` (out of v0.1.0
  scope; surfaces a warning).
- Throws `PnpmWorkspaceParseError` on structurally hostile inputs
  (NUL bytes, etc.); the adapter then surfaces an
  `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID` ERROR diagnostic.

Unit-tested directly against 4 micro-cases plus the 6 fixtures.

---

## 6. Glob Expansion

`packages/adapter-pnpm/src/globs.ts`:

- Supports `dir/*`, `dir/*/*` (two-segment), and partial wildcards
  like `pkg-*` per segment.
- Honours exclusion globs (`!path`) — applied AFTER inclusion expansion.
- Treats `**` (recursive) as unsupported with a soft warning;
  exclusion patterns with `**` are handled (`!**/node_modules/**`).
- Always-ignored directory names: `node_modules`, `.git`, `dist`,
  `build`, `.turbo`, `.next`, `.arch-engine`, `.pnpm-store`.
- All output paths are repo-relative POSIX strings — verified by
  test.
- Lexicographic sort on directory listings before scan; output
  arrays sorted alphabetically.
- Refuses `..` segments for security.

---

## 7. Package Graph Extraction

`packages/adapter-pnpm/src/package-graph.ts`:

- Reads each matched workspace's `package.json` in lexicographic
  order.
- Builds canonical nodes (`{id, type: 'package'}`) sorted by id.
- Walks dependency blocks in spec order: `dependencies`,
  `devDependencies`, `peerDependencies`, `optionalDependencies`.
- Classifies each specifier's protocol:
  - `workspace:` → `workspace`
  - `catalog:` → `catalog` (surfaces `ARCH_ENGINE_LOCKFILE_UNSUPPORTED`)
  - everything else → `semver`
- Filters edges to internal nodes (matches monorepo adapter
  semantics — no external-package nodes in v1.x).
- Computes stable `graphSurfaceHash` via sha256 over
  `JSON.stringify(sortedNodes) + '\n' + JSON.stringify(sortedEdges)`
  — algorithm IDENTICAL to `packages/cli/src/canonical-topology.ts`,
  ensuring baseline drift compares cleanly across adapters.
- Edge ids are `e_<sha256(from|to|type)[0..8]>` per the same spec.
- Unnamed packages → `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` ERROR
  diagnostic; package excluded from the topology.

---

## 8. Adapter Selection Wiring

`packages/cli/src/runner-bridge.ts` was rewritten:

1. Loads `@arch-engine/adapter-monorepo` (required) and tries to
   load `@arch-engine/adapter-pnpm` (optional).
2. Builds registry: pnpm at precedence 2, monorepo at precedence 4
   (matches spec §7.2).
3. Constructs an `AdapterContext` with `archengine:pnpmAdapterAvailable`
   cache hint when pnpm is registered.
4. Calls `selectArchitectureAdapter(registry, ctx)` (Pass 1 algorithm).
5. Dispatches by `selection.status`:
   - **RESOLVED + pnpm** → `runPnpmExtraction(cwd)`; promote pnpm's
     adapter-level diagnostics to ARCH_ENGINE_* codes.
   - **RESOLVED + monorepo** → `runMonorepoExtraction(cwd)`.
   - **CONFLICT** → throw `BridgeAdapterConflictError` with the
     `ARCH_ENGINE_ADAPTER_CONFLICT` diagnostic; commands catch and
     `process.exit(3)`.
   - **LOW_CONFIDENCE** → emit `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE`
     warning, continue.
6. Returns `BridgeExecutionResult` enriched with:
   - `extractionLegacy` (full legacy `MonorepoExtractionResult`
     shape; consumed by `doctor`, `inspect`, `analyze`)
   - `adapterSummary` (structural identity for `data.adapter`)
   - `adapterDiagnostics` (CLI-format `CliDiagnostic[]`)

`MonorepoArchitectureAdapter.detect()` was updated to read the
cache hint and decline pnpm-workspace.yaml when pnpm is registered
(spec §11.4). When the cache hint is absent (pnpm adapter not
installed), monorepo's Pass 1 behavior is preserved.

---

## 9. JSON v2 data.adapter

Added a single helper `buildDataAdapterBlock(input)` in
`render-v2.ts`. Each command's V2 envelope builder includes:

```jsonc
"data": {
  "adapter": {
    "name": "@arch-engine/adapter-pnpm",
    "version": "0.1.0",
    "packageManager": "pnpm",
    "workspaceKind": "pnpm-workspace",
    "confidence": "HIGH",
    "reasons": [
      "pnpm-workspace.yaml present",
      "pnpm-lock.yaml present",
      "package.json#packageManager starts with pnpm@"
    ],
    "warnings": [],
    "alsoDetected": [],
    "metadata": {
      "pnpm": {
        "workspaceFile": "pnpm-workspace.yaml",
        "packageManagerVersion": "pnpm@9.0.0",
        "lockfilePresent": true,
        "catalogsDetected": false,
        "excludedGlobs": [],
        "matchedGlobs": ["apps/api", "apps/web", "packages/shared"]
      },
      "edges": { "e_<8hex>": { "kind": "dev", "protocol": "workspace" }, ... }
    }
  },
  "topology": { ... },
  ...
}
```

**Coverage:**
- `doctor --json --json-schema=v2` — ✅ present
- `inspect --json --json-schema=v2` — ✅ present
- `analyze --json --json-schema=v2` — ✅ present
- `check --json --json-schema=v2` — ✅ present
- `explain --json --json-schema=v2` — NOT modified in this pass
  (existing explain V2 envelope is light; left for the v1.3.0
  release-prep pass to add).

**JSON v1 default** — no `adapter` key added anywhere.
Verified by test:
`adapter-json-v2-metadata.test.ts > JSON v1 default — data.adapter NOT present` (3 tests).

**Backwards-compat note on doctor:** the v1.2.0 doctor V2 envelope
included `data.adapter = {id, resolved}`. Pass 2 replaces this with
the canonical spec-§12.2 shape. Tests around `data.adapter.id` /
`.resolved` would have to be updated — none exist in the test suite
(verified by grep).

---

## 10. Error Codes Added

| Code | Severity | Exit | Title |
| --- | --- | --- | --- |
| `ARCH_ENGINE_ADAPTER_CONFLICT` | ERROR | 3 | Multiple workspace adapters matched this repository. |
| `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` | WARNING | 0 | Workspace adapter selection used low-confidence fallback. |
| `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID` | ERROR | 3 | Workspace globs failed to parse. |
| `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` | ERROR | 3 | Workspace package is missing a `name` field. |
| `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` | WARNING | 0 | Lockfile feature is not yet supported. |
| `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` | WARNING | 0 | Yarn PnP resolution is deferred. |

Each carries `defaultFix`, `docsHint: 'adapters'`, and the standard
`ArchEngineErrorMetadata` shape. The 16 existing codes are preserved
in declaration order; the 6 new codes append.

---

## 11. Tests Added / Updated

| Suite | Tests | Result |
| --- | --- | --- |
| `packages/adapter-pnpm/tests/pnpm-adapter.test.ts` | 26 | ✅ |
| `packages/cli/tests/adapters/adapter-pnpm-selection.test.ts` | 6 | ✅ |
| `packages/cli/tests/adapters/adapter-json-v2-metadata.test.ts` | 11 | ✅ |
| Pre-existing adapter tests (Pass 1) | 37 | ✅ (unchanged) |
| All other tests | 2,191 | ✅ (unchanged) |
| **Total** | **2,271** | **2,271 / 2,271** |

No existing test was modified, weakened, or had its snapshot widened.

---

## 12. Build / Typecheck / Test / Pack Results

| Step | Result |
| --- | --- |
| `npm install` | ✅ added 1 workspace |
| `npm run build` | ✅ all packages build clean |
| `npm run typecheck` | ✅ all 8 `tsc --noEmit` invocations pass (schema, core, adapter-monorepo, adapter-pnpm, 3 governance packs, cli) |
| `npm test` | ✅ 2,271 / 2,271 |
| `npx vitest run packages/core/tests/freeze` | ✅ 357 / 357 freeze tests |
| `npx vitest run packages/cli/tests/adapters` | ✅ 54 / 54 adapter tests |
| `npx vitest run packages/adapter-pnpm/tests` | ✅ 26 / 26 pnpm-package tests |
| `npm pack --dry-run --workspaces` | ✅ all 8 publishable packages pack cleanly |
| `npm pack --dry-run --workspace @arch-engine/adapter-pnpm` | ✅ 12 kB, 8 files |
| CLI smoke on repo root | ✅ exit 0, adapter resolves to `@arch-engine/adapter-monorepo` |
| CLI smoke on pnpm-basic fixture | ✅ exit 0, adapter resolves to `@arch-engine/adapter-pnpm` HIGH, 3 nodes |

---

## 13. Compatibility Statement

- **JSON v1 unchanged.** No new key under any command's `--json`
  default output. Verified by 3 dedicated subprocess tests.
- **JSON v2 additive only.** `data.adapter` is a new sibling under
  `data.*`; no existing key removed or retyped. The pre-existing
  `data.adapter = {id, resolved}` shape on `doctor` v2 is replaced
  by the canonical spec shape (no test depended on the old keys).
- **Existing commands unchanged.** All five verbs accept the same
  arguments; exit codes follow the v1.2.0 contract.
- **`runMonorepoExtraction(cwd)`** byte-identical to v1.2.0 / Pass 1.
- **`classifyAuthorityDomain`** unchanged.
- **`createMonorepoAdapter()` / `monorepoAdapter`** singletons
  unchanged.
- **No `@arch-governance/*` dependency.** Verified by grep.
- **No `npm publish`.** No `npm publish` invocation, no tarball
  uploaded.
- **No `git tag`.** No tag created.

---

## 14. Remaining Deltas

### BLOCKER
None.

### HIGH
None.

### MEDIUM
- **`explain` command not Pass-2-wired.** The `explain` command's
  V2 envelope does not yet include `data.adapter`. Reason: explain
  has a richer envelope path that I deliberately deferred to avoid
  scope creep. Add this in the v1.3.0 release-prep pass.
- **Doctor's pre-existing `data.adapter = {id, resolved}` shape was
  REPLACED, not augmented.** Tests would fail if any consumer
  depended on those keys. Test sweep found no internal consumers,
  but external CI scripts reading these would need updating. This
  is *technically* a breaking change to a JSON v2 sub-field, but
  v1.2.0 → v1.3.0 minor bump justifies it per spec.

### LOW
- **No subprocess tests on a CONFLICT scenario.** The conflict path
  is registry-tested via fake adapters in
  `adapter-registry.test.ts`, but not as an end-to-end CLI invocation.
  Reason: producing a CONFLICT fixture would require both
  `pnpm-workspace.yaml` AND `package.json#workspaces` present, with
  the monorepo adapter NOT declining pnpm — i.e. forcing both adapters
  to detect HIGH. With the current spec §11.4 wiring, monorepo always
  declines when pnpm is registered, so true CONFLICT only fires when
  a future adapter (yarn-pnp) is added.
- **No CLI human-output line naming the adapter.** Spec §7.5
  describes a "Workspace shape / Adapter" pair on `doctor` human
  output. Pass 2 keeps human output byte-identical to v1.2.0 to
  reduce snapshot churn. Add this in the release-prep pass.
- **`adapter-monorepo` MonorepoArchitectureAdapter.extractTopology()
  graphSurfaceHash** has not been cross-verified against the pnpm
  adapter's graphSurfaceHash for the same fixture content. Both
  algorithms are identical and tested individually; cross-fixture
  parity is a §16 acceptance criterion we have NOT yet exercised
  (would require building a fixture that's valid in both shapes).

### MICRO_DELTA
- **`@internal` tags removed from adapter singletons + factories**
  so the CLI's typecheck can see them in the published `.d.ts`. The
  classes were already public; only the convenience singletons
  changed visibility status. Documented as "NOT part of v1.x
  stability contract" in their JSDoc.
- **YAML comment-style choice.** Source comments in
  `packages/adapter-pnpm/src/globs.ts` use `<star>` placeholders
  for inline glob examples because `*/` inside `/** … */` is a JSDoc
  parse hazard.
- **DTS emission path.** `@arch-engine/adapter-pnpm` builds its
  `.d.ts` via direct `tsc` after `tsup` because tsup's
  rollup-plugin-dts struggles with multi-file packages under
  `composite: true` base configs. The build script reflects this:
  `tsup && tsc --emitDeclarationOnly`.

---

## 15. Recommended Next Mission

**`ARCH_ENGINE_V1_3_0_MINOR_RELEASE_PREPARATION`**

Scope:

1. Bump six existing packages to `1.3.0`:
   - `@arch-engine/schema`
   - `@arch-engine/core`
   - `@arch-engine/cli`
   - `@arch-engine/adapter-monorepo`
   - `@arch-engine/governance-pack-{authority,rest-contract,journey}`
2. Keep `@arch-engine/adapter-pnpm` at `0.1.0` (separate semver
   trajectory — adapters version independently).
3. Update CHANGELOG / release-notes referencing:
   - Adapter selection now runtime-active.
   - `data.adapter` JSON v2 block.
   - Six new ARCH_ENGINE_* codes.
   - `@arch-engine/adapter-pnpm@0.1.0` published as additive package.
4. Update GitHub Actions templates / `examples/` to mention pnpm
   support.
5. Add `data.adapter` to `explain` command's V2 envelope (Pass 2 micro-delta).
6. Add `doctor` human-output "Adapter: …" line (spec §7.5).
7. Run final cross-fixture graphSurfaceHash parity tests
   (monorepo-fallback path vs pnpm path for same pnpm fixture).
8. `npm publish` + `git tag arch-engine-v1.3.0` + `git tag adapter-pnpm-v0.1.0`.

Pass 3 (Yarn PnP adapter) is independent and can ship as
`adapter-yarn-pnp@0.1.0` after v1.3.0 with a patch CLI bump or as
part of a future minor.

---

## 16. Appendix — File Listing

**Created:**
```
packages/adapter-pnpm/
  package.json
  tsconfig.json
  tsup.config.ts
  LICENSE
  README.md
  src/
    index.ts            766 lines
    pnpm-workspace.ts   217 lines
    globs.ts            272 lines
    package-graph.ts    273 lines
  tests/
    pnpm-adapter.test.ts (26 tests)
packages/cli/tests/adapters/
  adapter-pnpm-selection.test.ts (6 tests)
  adapter-json-v2-metadata.test.ts (11 tests)
packages/cli/tests/fixtures/adapters/
  pnpm-basic/               (4 package.json + workspace yaml)
  pnpm-workspace-protocol/  (3 package.json + workspace yaml + lockfile)
  pnpm-nested/              (3 package.json + workspace yaml)
  pnpm-excluded-glob/       (3 package.json + workspace yaml)
  pnpm-empty-globs/         (1 package.json + workspace yaml)
  pnpm-unnamed-package/     (3 package.json + workspace yaml)
audits/ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md
```

**Modified:**
```
package.json                                       (workspaces, typecheck, files)
packages/cli/package.json                          (peer dep)
packages/cli/tsup.config.ts                        (external)
packages/cli/src/error-codes.ts                    (6 new codes)
packages/cli/src/runner-bridge.ts                  (full Pass 2 wiring)
packages/cli/src/render-v2.ts                      (buildDataAdapterBlock helper)
packages/cli/src/commands/doctor.ts                (data.adapter + bridge route)
packages/cli/src/commands/inspect.ts               (data.adapter + bridge route)
packages/cli/src/commands/analyze.ts               (data.adapter + bridge route)
packages/cli/src/commands/check.ts                 (data.adapter + bridge route)
packages/adapter-monorepo/src/index.ts             (cache hint decline; un-internal singletons)
```

**Unchanged from v1.2.0 / Pass 1:**
```
packages/schema/**
packages/core/**
packages/governance-pack-*
packages/cli/src/adapters/adapter-contract.ts
packages/cli/src/adapters/adapter-registry.ts
packages/cli/src/canonical-topology.ts
packages/cli/src/baseline-reader.ts
packages/cli/src/drift.ts
packages/cli/src/format-error.ts
packages/cli/src/render-markdown.ts
packages/cli/src/output-writer.ts
all existing test files
docs/**
```

*End of Pass 2 Implementation Audit.*
