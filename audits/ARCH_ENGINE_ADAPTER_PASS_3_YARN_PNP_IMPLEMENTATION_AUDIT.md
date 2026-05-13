# Arch-Engine Adapter Pass 3 Yarn PnP Implementation Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context) |
| Date | 2026-05-13 |
| Mission | Adapter Pass 3 — Yarn PnP MVP implementation pass |
| Predecessor (release) | [`audits/release/ARCH_ENGINE_V1_3_1_PATCH_RELEASE_PREFLIGHT.md`](./release/ARCH_ENGINE_V1_3_1_PATCH_RELEASE_PREFLIGHT.md) |
| Predecessor (Pass 2) | [`audits/ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md`](./ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md) |
| Spec reference | [`docs/adapters/multi-adapter-surface-spec.md`](../docs/adapters/multi-adapter-surface-spec.md) §6, §7, §10, §11.4 |

---

## 1. Executive Verdict

**`ADAPTER_PASS_3_YARN_PNP_READY_FOR_RELEASE_PREP`**

The new `@arch-engine/adapter-yarn-pnp@0.1.0` package is implemented,
wired into the CLI's deterministic registry at precedence 3, fully
tested, and verified end-to-end against six dedicated fixtures plus
the existing pnpm and monorepo fixtures. All v1.3.1 contracts are
preserved:

- JSON v1 byte-shape unchanged.
- JSON v2 envelope shape unchanged. The only new content is a
  `data.adapter.metadata.yarnPnp` sub-block when the yarn-pnp
  adapter is selected.
- Adapter selection for pre-existing fixtures (pnpm-basic, repo
  root, single-package fallback) is byte-identical to v1.3.1.
- `graphSurfaceHash` for every pre-existing fixture is byte-identical
  to v1.3.1.
- No new CLI commands, flags, or `ARCH_ENGINE_*` error codes.
- `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` (already in the v1.3.0
  vocabulary) is now actively used by the new adapter.

Validation: full repo build, typecheck, and `npm test` (674 files,
**2373 tests**, up from 2300 in v1.3.1) all pass. All 162 freeze
test files (357 tests) pass. The thirteen adapter test files (181
tests, including 73 new Pass 3 tests) all pass.

No npm publish performed. No git tag created. Package versions are
ready for a v1.4.0-style minor release.

---

## 2. Scope

Yarn PnP MVP — implementation only.

In scope:
- New `@arch-engine/adapter-yarn-pnp@0.1.0` package.
- Adapter registered at precedence 3 between pnpm@2 and monorepo@4.
- Detection from PnP file presence; topology from
  `package.json#workspaces`.
- `workspace:`, `portal:`, `link:` protocol awareness.
- Cache-hint protocol additions to keep pnpm winning when both
  signals are present (and to keep monorepo declining
  yarn-pnp+workspaces repos).
- `@arch-engine/adapter-monorepo` patch bump (1.3.0 → 1.3.1) with
  the yarn-pnp cache-hint check. Required for the new adapter to
  avoid `ARCH_ENGINE_ADAPTER_CONFLICT` on yarn-pnp+workspaces repos.

Out of scope (explicitly NOT implemented):
- Execution or import of `.pnp.cjs` / `.pnp.loader.mjs`.
- Invocation of `yarn` or any package-manager binary.
- Full PnP resolver parity (deferred — surfaced as
  `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` INFO/WARNING diagnostic).
- Reading `node_modules/`, `.yarn/cache`, `.yarn/unplugged`,
  `.yarn/install-state.gz`.
- AGP emitter.
- New CLI commands or flags.
- JSON v1 changes.
- JSON v2 default flip.
- npm publish.
- Git tag.
- Bumps to packages outside the directly affected set
  (`@arch-engine/schema`, `@arch-engine/core`, the three governance
  packs, `@arch-engine/cli`).

---

## 3. Files Created / Modified

### Created (Yarn PnP adapter package)

- [`packages/adapter-yarn-pnp/package.json`](../packages/adapter-yarn-pnp/package.json)
- [`packages/adapter-yarn-pnp/tsconfig.json`](../packages/adapter-yarn-pnp/tsconfig.json)
- [`packages/adapter-yarn-pnp/tsup.config.ts`](../packages/adapter-yarn-pnp/tsup.config.ts)
- [`packages/adapter-yarn-pnp/LICENSE`](../packages/adapter-yarn-pnp/LICENSE) (MIT, copied from adapter-pnpm)
- [`packages/adapter-yarn-pnp/README.md`](../packages/adapter-yarn-pnp/README.md)
- [`packages/adapter-yarn-pnp/src/index.ts`](../packages/adapter-yarn-pnp/src/index.ts)
- [`packages/adapter-yarn-pnp/src/yarn-workspaces.ts`](../packages/adapter-yarn-pnp/src/yarn-workspaces.ts)
- [`packages/adapter-yarn-pnp/src/globs.ts`](../packages/adapter-yarn-pnp/src/globs.ts)
- [`packages/adapter-yarn-pnp/src/package-graph.ts`](../packages/adapter-yarn-pnp/src/package-graph.ts)
- [`packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts`](../packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts) (41 tests)

### Created (Fixtures under packages/cli/tests/fixtures/adapters)

- `yarn-pnp-basic/` — HIGH happy path (3 packages, `.pnp.cjs`, `.yarnrc.yml: nodeLinker: pnp`, `packageManager: yarn@4.0.2`)
- `yarn-pnp-workspace-protocol/` — workspace:* / portal: / link: protocols + Corepack-style `yarn@4.1.0+sha256.deadbeef`
- `yarn-pnp-object-workspaces/` — object-form `workspaces.packages`
- `yarn-pnp-empty-globs/` — MEDIUM (globs match nothing)
- `yarn-pnp-unnamed-package/` — `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED`
- `yarn-pnp-loader-only/` — `.pnp.loader.mjs` only (no `.pnp.cjs`)
- `yarn-pnp-with-pnpm-workspace-conflict/` — both `pnpm-workspace.yaml` and `.pnp.cjs`; pnpm wins via the decline protocol.

### Created (CLI integration tests)

- [`packages/cli/tests/adapters/adapter-yarn-pnp-selection.test.ts`](../packages/cli/tests/adapters/adapter-yarn-pnp-selection.test.ts) (10 tests)
- [`packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts`](../packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts) (13 tests)
- [`packages/cli/tests/adapters/adapter-yarn-pnp-cli-smoke.test.ts`](../packages/cli/tests/adapters/adapter-yarn-pnp-cli-smoke.test.ts) (9 tests)

### Modified

- [`package.json`](../package.json) — added `packages/adapter-yarn-pnp` to `workspaces`, added it to the `typecheck` script, added `packages/adapter-yarn-pnp/dist` to the published files list.
- [`package-lock.json`](../package-lock.json) — npm-install side effect (new workspace symlink).
- [`packages/cli/package.json`](../packages/cli/package.json) — added optional peer `@arch-engine/adapter-yarn-pnp: ^0.1.0` with `peerDependenciesMeta.*.optional: true`. CLI version unchanged (still 1.3.1).
- [`packages/cli/tsup.config.ts`](../packages/cli/tsup.config.ts) — added the new package to the `external` array so the CLI bundle still imports it dynamically at runtime.
- [`packages/cli/src/runner-bridge.ts`](../packages/cli/src/runner-bridge.ts) — added `tryLoadYarnPnpAdapter`, registry entry at precedence 3, `archengine:yarnPnpAdapterAvailable` cache-hint hook, and a yarn-pnp dispatch branch parallel to the pnpm branch (legacy-shape mapping + diagnostic promotion + JSON v2 `data.adapter` summary).
- [`packages/adapter-monorepo/package.json`](../packages/adapter-monorepo/package.json) — version bumped 1.3.0 → 1.3.1 (required for the new yarn-pnp cache-hint check).
- [`packages/adapter-monorepo/src/index.ts`](../packages/adapter-monorepo/src/index.ts) — added yarn-pnp cache-hint check in `MonorepoArchitectureAdapter.detect()` that declines `package.json#workspaces` repos when a `.pnp.cjs` / `.pnp.loader.mjs` is present AND `archengine:yarnPnpAdapterAvailable === true`. Adapter-version constant aligned to `1.3.1`.
- [`packages/cli/tests/adapters/adapter-monorepo-compat.test.ts`](../packages/cli/tests/adapters/adapter-monorepo-compat.test.ts) — one-line update: adapterVersion assertion bumped from `'1.2.0'` to `'1.3.1'` to track the constant.
- [`README.md`](../README.md) — added `@arch-engine/adapter-yarn-pnp` to the package table, the install snippet, and a new "Yarn Berry / Plug'n'Play support (preview MVP)" section.
- [`examples/github-actions/README.md`](../examples/github-actions/README.md) — added a "Works with Yarn Berry / Plug'n'Play (preview MVP)" subsection mirroring the existing pnpm guidance.

### Not modified

- `@arch-engine/schema`, `@arch-engine/core`, the three governance packs, `packages/cli/src/error-codes.ts`, `packages/cli/src/render-v2.ts`, `packages/cli/src/adapters/adapter-contract.ts`, `packages/cli/src/adapters/adapter-registry.ts`, and the existing pnpm/monorepo test files (other than the version-constant tracking fix).

---

## 4. Yarn PnP Adapter Package

Public surface:

| Export | Kind | Notes |
| --- | --- | --- |
| `YarnPnpArchitectureAdapter` | class | Conforms structurally to `ArchitectureAdapter`. `adapterName = 'yarn-pnp'`, `adapterVersion = '0.1.0'`. |
| `createYarnPnpArchitectureAdapter()` | factory | Fresh instance per call. |
| `yarnPnpArchitectureAdapter` | singleton | Pre-built instance the CLI registry reads structurally. |
| `runYarnPnpExtraction(cwd)` | legacy-shape helper | Returns `YarnPnpExtractionResult | null`. Mirrors `runPnpmExtraction` / `runMonorepoExtraction` so the CLI bridge can consume the same downstream shape. |
| Re-exports | types + sub-module fns | `normaliseManifest`, `deriveYarnVersion`, `readYarnrc`, `expandWorkspaceGlobs`, `buildYarnPnpPackageGraph`, `edgeIdFor`, plus the per-package type declarations. |

Internal modules:

- `src/yarn-workspaces.ts` — root `package.json` normaliser (array + object workspaces), `packageManager` parser, `.yarnrc.yml` `nodeLinker` reader.
- `src/globs.ts` — same algorithm as `adapter-pnpm/src/globs.ts` with extended `ALWAYS_IGNORE` set to include `.yarn`.
- `src/package-graph.ts` — canonical (nodes, edges, surface hash) builder with `workspace:`/`portal:`/`link:`/`semver` protocol classification and portal/link → workspace-path resolution.

No runtime dependencies. No `@arch-engine/cli` import. `tsup` builds an ESM bundle; `tsc` emits declarations.

---

## 5. Safety Model

The v0.1.0 adapter satisfies the v1.x adapter determinism contract
exactly:

| Invariant | Enforced by |
| --- | --- |
| No `.pnp.cjs` execution | The adapter never invokes `require()` / `import()` on any repository-controlled path. `.pnp.cjs` and `.pnp.loader.mjs` are checked via `fs.existsSync` only. |
| No `.pnp.cjs` import | Same — no dynamic `import()` from the adapter. |
| No yarn invocation | No `child_process` use anywhere in the adapter package. |
| No package-manager binary execution | Same. |
| No `node_modules` read | The glob expander's `ALWAYS_IGNORE` set excludes `node_modules` at every depth. |
| No `.yarn/cache` read | `ALWAYS_IGNORE` includes `.yarn`, which covers `cache`, `unplugged`, and `install-state.gz`. |
| No network | No `node:http`, `node:https`, or `node:net` import. |
| No repo mutation | No `fs.writeFileSync` / `fs.unlinkSync` / `fs.mkdirSync` anywhere in the adapter. Only `fs.readFileSync` and `fs.existsSync` / `fs.readdirSync` / `fs.statSync`. |
| Deterministic output | Lexicographic sort on directory listings, edge ids, source-file paths; `graphSurfaceHash` is `sha256(JSON(nodes) \n JSON(edges))` matching the canonical-topology algorithm. |
| Relative POSIX paths | All `sourceFiles`, `packagePaths`, `matchedGlobs`, `excludedGlobs` are relative POSIX. No absolute-path leakage (tested). |
| `executesRepositoryCode: false` | Explicitly returned by `explain()`. Asserted by tests. |

The "no .pnp.cjs execution" guarantee is testable structurally: the
`.pnp.cjs` fixture files contain only a JS comment with no module
side effects, so any attempt to execute them would still be a no-op
— but the adapter source contains no path that could trigger such
execution.

---

## 6. Detection Model

| Confidence | Condition |
| --- | --- |
| **HIGH** | `.pnp.cjs` OR `.pnp.loader.mjs` exists AND `package.json#workspaces` is present AND globs match at least one workspace package. |
| **MEDIUM** | PnP file exists AND `package.json#workspaces` is present AND globs match zero packages. |
| **LOW** | PnP file exists AND (`package.json` unreadable OR no `workspaces` field OR empty `workspaces`). |
| **NONE** | No `.pnp.cjs` and no `.pnp.loader.mjs` at the repository root. |

Cache-hint protocol additions (mirrored from Pass 2):

- yarn-pnp adapter **declines** when `.pnp.cjs` AND `pnpm-workspace.yaml` are both present AND `archengine:pnpmAdapterAvailable === true`. This makes pnpm win without `ARCH_ENGINE_ADAPTER_CONFLICT`.
- monorepo adapter **declines** when `package.json#workspaces` is present AND a PnP file is also present AND `archengine:yarnPnpAdapterAvailable === true`. This makes yarn-pnp win without conflict.

Selection precedence:

| # | Adapter | Wins on |
| --- | --- | --- |
| 2 | `@arch-engine/adapter-pnpm` | `pnpm-workspace.yaml` present |
| 3 | `@arch-engine/adapter-yarn-pnp` | `.pnp.cjs` / `.pnp.loader.mjs` present (and no `pnpm-workspace.yaml`) |
| 4 | `@arch-engine/adapter-monorepo` | Fallback: yarn-classic / npm workspaces, single-package, or any of the above when the dedicated adapter is not installed |

---

## 7. Workspace Parsing

`readYarnRootManifest(cwd)` reads `package.json` exactly once and
normalises both supported `workspaces` shapes:

```jsonc
// array form
{ "workspaces": ["packages/*", "apps/*"] }

// object form
{
  "workspaces": {
    "packages": ["packages/*"],
    "nohoist": ["**/some-pkg"]
  }
}
```

Both produce the same internal `globs` list. `nohoist` is recorded
into adapter metadata implicitly via `workspacesObjectForm: true`
(PnP makes hoisting moot, so we do not model `nohoist` semantics).

`deriveYarnVersion(hint)` parses `packageManager: "yarn@<x.y.z>[+sha]"`:
- `"yarn@4.0.2"` → `"4.0.2"`
- `"yarn@4.1.0+sha256.deadbeef"` → `"4.1.0"` (Corepack `+<sha>` stripped)
- `"pnpm@9.0.0"` → `null`
- absent → `null`

`readYarnrc(cwd)` does a narrow line-based scan for `nodeLinker:`
(no full YAML dependency) and recognises `pnp` / `node-modules` /
`pnpm` / unknown.

---

## 8. Package Graph Extraction

`buildYarnPnpPackageGraph(cwd, matchedDirs)`:

1. **First pass** — read each `<dir>/package.json`, collect `(rel, name, raw)` for named workspace packages. Unnamed packages emit `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` (ERROR) — same severity as adapter-pnpm.
2. Build a `pathToName` index so `portal:<path>` / `link:<path>` can resolve to workspace package names without re-traversing the filesystem.
3. **Second pass** — for each named workspace package, classify each dependency specifier:
   - `workspace:*`, `workspace:^`, `workspace:~`, `workspace:<semver>` → `workspace` protocol.
   - `portal:<path>` → `portal` protocol; resolve `<path>` (POSIX-normalise relative to the consuming package's directory) against the workspace path index.
   - `link:<path>` → same as `portal:` for resolution; classified as `link`.
   - anything else → `semver`.
4. Edges retained only when source and target are both workspace packages. Edge id is `e_<sha256(from|to|workspace_dependency)[0..8]>` — identical to adapter-pnpm and adapter-monorepo so cross-adapter baselines line up.
5. Unresolved `portal:`/`link:` specifiers are surfaced as `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` INFO diagnostics.
6. `graphSurfaceHash = sha256(JSON(nodes) || "\n" || JSON(edges))` — the canonical algorithm.

---

## 9. Adapter Selection Wiring

`packages/cli/src/runner-bridge.ts` (Pass 3 diff):

- Added `tryLoadYarnPnpAdapter()` — mirrors `tryLoadPnpmAdapter`. Returns `null` when the package isn't installed.
- Registered the singleton at precedence 3.
- Sets `archengine:yarnPnpAdapterAvailable` on the adapter context when the package loads.
- New dispatch branch: when the selected adapter is `yarn-pnp` AND the module is present, call `runYarnPnpExtraction(cwd)`; otherwise fall back to monorepo (defensive — should be unreachable in practice).
- The branch builds the same `BridgeAdapterSummary` shape used by the pnpm branch, with `packageManager: 'yarn'` and `workspaceKind: 'yarn-pnp'`. The `metadata` block carries the adapter's `metadata.yarnPnp`, `metadata.edges`, `graphSurfaceHash`, and `sourceFiles`.
- Adapter-level diagnostics are promoted to CLI diagnostics using the existing `buildDiagnostic` helper (no new error-code registrations).

`packages/adapter-monorepo/src/index.ts` (Pass 3 diff):

- New cache-hint check (`archengine:yarnPnpAdapterAvailable`) that declines `yarn-npm` workspaceType when a PnP file is detected at the root AND the yarn-pnp adapter is registered.
- Adapter-version constant bumped `1.2.0` → `1.3.1` to track the package.json version. (The old constant had drifted; this aligns it.)

---

## 10. JSON v2 data.adapter

Sample envelope slice on `yarn-pnp-basic`:

```jsonc
{
  "name": "@arch-engine/adapter-yarn-pnp",
  "version": "0.1.0",
  "packageManager": "yarn",
  "workspaceKind": "yarn-pnp",
  "confidence": "HIGH",
  "reasons": [
    ".pnp.cjs present",
    ".yarnrc.yml present",
    ".yarnrc.yml#nodeLinker is pnp",
    "package.json#packageManager identifies yarn",
    "package.json#workspaces is set"
  ],
  "warnings": [],
  "alsoDetected": [],
  "metadata": {
    "yarnPnp": {
      "packageManagerVersion": "4.0.2",
      "pnpFilePresent": true,
      "pnpLoaderPresent": false,
      "yarnrcPresent": true,
      "nodeLinker": "pnp",
      "workspacesPresent": true,
      "workspacesObjectForm": false,
      "rawGlobs": ["apps/*", "packages/*"],
      "excludedGlobs": [],
      "matchedGlobs": ["apps/api", "apps/web", "packages/shared"]
    },
    "edges": {
      "e_<hex8>": { "kind": "dependency", "protocol": "workspace" }
    }
  }
}
```

JSON v1 default output remains flat and free of any new keys
(verified by `JSON v1 default — yarn-pnp does NOT add an adapter
key` tests).

---

## 11. Diagnostics

This pass adds no new `ARCH_ENGINE_*` codes. The vocabulary stays
at the 22 codes locked in v1.3.0. The yarn-pnp adapter uses three
existing codes:

| Code | Severity (CLI) | Use |
| --- | --- | --- |
| `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` | WARNING (`ciBlocking: false`) | Always surfaced when a PnP file is present, explaining that PnP resolver parity is intentionally deferred. Also surfaced for each unresolved `portal:`/`link:` reference. |
| `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID` | WARNING / INFO | Empty workspaces, malformed shape, or glob-related parser warnings. |
| `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` | ERROR | Workspace package missing a `name` field — same severity as adapter-pnpm. |

The CLI promotes adapter-emitted diagnostics to its canonical
severity via the existing error-codes table.

---

## 12. Tests Added / Updated

### Added

- **`packages/adapter-yarn-pnp/tests/yarn-pnp-adapter.test.ts`** — 41 tests covering identity, detect (HIGH/MEDIUM/LOW/NONE), extractTopology (nodes, edges, protocols, diagnostics, determinism, source-file invariants), `adapterMetadata.yarnPnp` shape (incl. Corepack `+sha` stripping and `null` absence), `explain()` safety invariants, the legacy-shape `runYarnPnpExtraction`, and unit tests for `normaliseManifest` / `deriveYarnVersion` / `expandWorkspaceGlobs` / `buildYarnPnpPackageGraph`.
- **`packages/cli/tests/adapters/adapter-yarn-pnp-selection.test.ts`** — 10 tests pinning the three-adapter registry behavior: yarn-pnp wins HIGH on yarn-pnp fixtures, monorepo declines via cache hint, pnpm wins on the conflict fixture, deterministic replay, back-compat path when yarn-pnp isn't installed.
- **`packages/cli/tests/adapters/adapter-yarn-pnp-json-v2-metadata.test.ts`** — 13 tests pinning the JSON v2 `data.adapter` shape, packageManagerVersion serialisation (incl. Corepack-stripped), object-form workspaces metadata, cross-command stability, absolute-path absence, and JSON v1 invariance.
- **`packages/cli/tests/adapters/adapter-yarn-pnp-cli-smoke.test.ts`** — 9 tests pinning the user-visible surfaces: doctor human output with `Adapter selected: @arch-engine/adapter-yarn-pnp`, inspect/analyze/check exit codes, explain modes, and pre-existing pnpm/monorepo doctor output regression.

### Updated

- **`packages/cli/tests/adapters/adapter-monorepo-compat.test.ts`** — single-line update: the `adapterVersion` assertion now expects `'1.3.1'` to track the bumped constant. Comment explains the bump rationale.

### Not weakened

No existing test was relaxed, deleted, or skipped. The full suite
grew from 2300 to **2373 tests** (+73).

---

## 13. Build / Typecheck / Test / Pack Results

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm install` | up to date |
| Build | `npm run build` | all 18 workspace packages built (incl. new `@arch-engine/adapter-yarn-pnp`) |
| Typecheck | `npm run typecheck` | exit 0 across 9 tsconfig projects (was 8 in v1.3.1) |
| Full tests | `npm test` | **674 files, 2373 tests passed, 0 failed** |
| Focused adapter tests | `npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests packages/adapter-yarn-pnp/tests` | **12 files, 181 tests passed** |
| Freeze tests | `npx vitest run packages/core/tests/freeze` | **162 files, 357 tests passed** |
| Root pack | `npm pack --dry-run` | clean (`arch-engine-1.0.0.tgz`, 94 files — root private) |
| New adapter pack | `npm --workspace @arch-engine/adapter-yarn-pnp pack --dry-run` | `arch-engine-adapter-yarn-pnp-0.1.0.tgz`, 14.3 kB, 8 files |
| Bumped adapter pack | `npm --workspace @arch-engine/adapter-monorepo pack --dry-run` | `arch-engine-adapter-monorepo-1.3.1.tgz`, 5.6 kB, 5 files |
| Unchanged adapter pack | `npm --workspace @arch-engine/adapter-pnpm pack --dry-run` | `arch-engine-adapter-pnpm-0.1.1.tgz`, 12.2 kB, 8 files |
| CLI pack | `npm --workspace @arch-engine/cli pack --dry-run` | `arch-engine-cli-1.3.1.tgz`, 36.4 kB, 18 files (CLI version unchanged) |

Smoke (against `packages/cli/dist/bin.js`):

- Repo root: `Adapter selected: @arch-engine/adapter-monorepo (HIGH adapter confidence)` ✅
- `pnpm-basic`: `Adapter selected: @arch-engine/adapter-pnpm (HIGH adapter confidence)` ✅
- `yarn-pnp-basic`: `Adapter selected: @arch-engine/adapter-yarn-pnp (HIGH adapter confidence)`, JSON v2 `metadata.yarnPnp.packageManagerVersion === "4.0.2"`, `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` surfaces ✅
- `yarn-pnp-object-workspaces`: yarn-pnp adapter HIGH, 2 nodes / 1 edge ✅
- `yarn-pnp-with-pnpm-workspace-conflict`: pnpm wins (precedence 2 + yarn-pnp decline protocol) ✅

---

## 14. Compatibility Statement

| Surface | v1.3.1 | After Pass 3 | Compatibility |
| --- | --- | --- | --- |
| JSON v1 default `--json` envelope | flat object | flat object, identical keys | **unchanged** |
| JSON v2 envelope top-level keys | as documented | same | **unchanged** |
| `data.adapter` block shape | `name, version, packageManager, workspaceKind, confidence, reasons, warnings, alsoDetected, metadata` | same | **unchanged** |
| `data.adapter.metadata.*` | adapter-specific sub-blocks (`pnpm`) | adapter-specific sub-blocks (`pnpm`, `yarnPnp` added when yarn-pnp is selected) | **additive** |
| Adapter selection on `pnpm-basic` | `@arch-engine/adapter-pnpm` HIGH | identical | **unchanged** |
| Adapter selection on repo root | `@arch-engine/adapter-monorepo` HIGH | identical | **unchanged** |
| Adapter selection on single-package repos | `@arch-engine/adapter-monorepo` LOW | identical | **unchanged** |
| `graphSurfaceHash` per pre-existing fixture | byte-stable | byte-identical to v1.3.1 (verified by re-run) | **unchanged** |
| `ARCH_ENGINE_*` vocabulary | 22 codes | 22 codes (no new codes) | **unchanged** |
| CLI flags / commands | as in v1.3.1 | same | **unchanged** |
| Node engines | `>=18.0.0` | `>=18.0.0` | **unchanged** |
| AGP dependency | absent | absent | **unchanged** |
| Package versions bumped | (none in this pass) | `@arch-engine/adapter-monorepo` 1.3.0 → 1.3.1 (required for yarn-pnp cache-hint protocol); new `@arch-engine/adapter-yarn-pnp@0.1.0` | **strict patch + new package** |
| CLI version | 1.3.1 | 1.3.1 (unchanged) | **unchanged** |
| CLI peer dependencies | `^1.3.0` adapter-monorepo, `^0.1.1` adapter-pnpm | added optional `^0.1.0` adapter-yarn-pnp; existing ranges unchanged | **additive optional peer** |
| npm publish | (n/a, not performed in this pass) | not performed | **no publish** |
| Git tag | (n/a, not performed in this pass) | not performed | **no tag** |

The patch is consumer-safe: any consumer of v1.3.1 with only
`@arch-engine/cli` and `@arch-engine/adapter-monorepo@^1.3.0`
installed sees byte-identical behavior. The monorepo adapter's
yarn-pnp decline check is a no-op when the yarn-pnp adapter is not
loaded (no cache hint is set).

---

## 15. Remaining Deltas

No deltas of severity HIGH or MEDIUM.

- **MICRO_DELTA**: `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` is registered in `packages/cli/src/error-codes.ts` as `WARNING` severity. The adapter emits the diagnostic as INFO; the CLI promotes it to WARNING via the canonical metadata table. This means `summary.warnings` is `1` on every yarn-pnp run and `status` is `warning` (rather than `passed`) on doctor/inspect/analyze when no policy is configured. The diagnostic is still `ciBlocking: false` and exit code stays 0, so adoption is not blocked — but a future polish pass could consider downgrading this code's canonical severity to INFO if the always-emitted nature feels noisy in real-repo trials.
- **LOW**: The yarn-pnp adapter does not yet honour `nohoist` semantics, brace expansion, or `**` glob expansion — same scope deferrals as adapter-pnpm v0.1.0.

No BLOCKER deltas.

---

## 16. Recommended Next Mission

**`ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL`**

Justification:
- Pass 3 introduces a new precedence-3 adapter and a cross-adapter cache-hint protocol that, while structurally tested in isolation, has not yet been exercised against real-world Yarn Berry / PnP repositories.
- A real-repo trial against representative PnP repos (e.g. `vercel/next.js`, `nrwl/nx`, `babel/babel`-PnP-branches, `yarnpkg/berry` itself) would validate the detection and extraction model against the real shape of the ecosystem and surface any P0/P1/P2 deltas before release prep.
- The trial template established by `audits/ARCH_ENGINE_V1_3_0_REAL_REPO_ADAPTER_TRIAL.md` is reusable. Expected outcome: one of `STRONG_SIGNAL` / `MIXED_SIGNAL` / `WEAK_SIGNAL`, with P3 polish items folded into the next release-prep pass.

### Alternative

**`ARCH_ENGINE_V1_4_0_MINOR_RELEASE_PREPARATION_PASS`** — go directly to release preparation with the polish items collected in §15. Suitable if the team is comfortable trusting the structural test coverage at face value and prefers to surface real-repo issues post-release as a v1.4.x patch.

---

## 17. Commands Run

```bash
# Phase 0 — preflight
git status --short
git log --oneline --decorate -n 30
git tag --list "arch-engine-v1.3.1"
git ls-remote --tags origin "arch-engine-v1.3.1" "adapter-pnpm-v0.1.1"
npm view @arch-engine/cli@1.3.1 version
npm view @arch-engine/adapter-pnpm@0.1.1 version

# Phase 3 — package skeleton
mkdir -p packages/adapter-yarn-pnp/{src,tests}
cp packages/adapter-pnpm/LICENSE packages/adapter-yarn-pnp/LICENSE

# Phase 7 — CLI wiring
$EDITOR package.json packages/cli/package.json packages/cli/tsup.config.ts
$EDITOR packages/cli/src/runner-bridge.ts
$EDITOR packages/adapter-monorepo/package.json packages/adapter-monorepo/src/index.ts
npm install

# Phase 13 — validation
npm run build
npm run typecheck
npm test
npx vitest run packages/cli/tests/adapters packages/adapter-pnpm/tests packages/adapter-yarn-pnp/tests
npx vitest run packages/core/tests/freeze
npm pack --dry-run
npm --workspace @arch-engine/adapter-yarn-pnp pack --dry-run
npm --workspace @arch-engine/adapter-monorepo pack --dry-run
npm --workspace @arch-engine/adapter-pnpm pack --dry-run
npm --workspace @arch-engine/cli pack --dry-run

# Smoke checks (against built CLI)
node packages/cli/dist/bin.js doctor
(cd packages/cli/tests/fixtures/adapters/pnpm-basic && node …/bin.js doctor)
(cd packages/cli/tests/fixtures/adapters/yarn-pnp-basic && node …/bin.js doctor)
(cd packages/cli/tests/fixtures/adapters/yarn-pnp-basic && node …/bin.js inspect --json --json-schema=v2)
(cd packages/cli/tests/fixtures/adapters/yarn-pnp-object-workspaces && node …/bin.js doctor)
(cd packages/cli/tests/fixtures/adapters/yarn-pnp-with-pnpm-workspace-conflict && node …/bin.js doctor)
```

No `npm publish` was run. No git tag was created. No release-prep
commit was made.

---

*End of Adapter Pass 3 Yarn PnP Implementation Audit.*
