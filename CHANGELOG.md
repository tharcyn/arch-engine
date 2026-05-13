# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

## [1.4.0] — 2026-05-13

Minor release. Adds first-class **Yarn Berry / Plug'n'Play
workspace support** via a new optional adapter package,
`@arch-engine/adapter-yarn-pnp@0.1.0`. The adapter is a safe
package.json-shape extractor: it never executes `.pnp.cjs`,
never invokes `yarn`, never installs anything, and never reads
`node_modules` or `.yarn/cache`. The CLI's deterministic adapter
registry now picks the right adapter (pnpm at precedence 2,
yarn-pnp at precedence 3, monorepo at precedence 4) without
surfacing `ARCH_ENGINE_ADAPTER_CONFLICT` on overlapping signals.

Real-repo trial verdict against 11 public OSS repos covering
Yarn PnP, Yarn Berry `nodeLinker: node-modules`, Yarn classic,
pnpm workspaces, and single-package layouts:
`YARN_PNP_REAL_REPO_TRIAL_STRONG_SIGNAL` — **11/11 correct
adapter selections, 0 P0/P1/P2 issues, 0 path leaks, 0 repo
mutations**.

Packages bumped:

- `@arch-engine/cli`: `1.3.1` → `1.4.0`
- `@arch-engine/adapter-monorepo`: `1.3.0` → `1.3.1` (yarn-pnp
  cache-hint decline protocol added; behavior unchanged when
  the yarn-pnp adapter is not loaded).
- `@arch-engine/adapter-yarn-pnp`: **new package** at `0.1.0`.

Other packages (`@arch-engine/adapter-pnpm@0.1.1`,
`@arch-engine/core@1.3.0`, `@arch-engine/schema@1.3.0`, the
three governance packs) are unchanged at their v1.3.x
versions — no source there was touched.

### Added

- Added `@arch-engine/adapter-yarn-pnp@0.1.0` — a new optional
  adapter package for Yarn Berry / Plug'n'Play workspaces.
  Detects PnP signals (`.pnp.cjs`, `.pnp.loader.mjs`,
  `.yarnrc.yml`) by file presence only. Extracts topology from
  `package.json#workspaces` (array form or object form, both
  supported), resolving `workspace:`, `portal:`, and `link:`
  protocols on `dependencies`, `devDependencies`,
  `peerDependencies`, and `optionalDependencies`. Pure-fs read;
  no execution of repo-controlled code.
- Added registry wiring for the yarn-pnp adapter at precedence
  3, between `@arch-engine/adapter-pnpm` (precedence 2) and the
  `@arch-engine/adapter-monorepo` fallback (precedence 4).
- Added JSON v2 `data.adapter.metadata.yarnPnp` sub-block when
  the yarn-pnp adapter is selected. Fields:
  `packageManagerVersion` (parsed bare yarn version, Corepack
  `+sha` stripped, or `null`), `pnpFilePresent`,
  `pnpLoaderPresent`, `yarnrcPresent`, `nodeLinker`,
  `nodeLinkerSource` (provenance enum — `"yarnrc"` /
  `"inferred_from_pnp_file"` / `"absent"`),
  `workspacesPresent`, `workspacesObjectForm`, `rawGlobs`,
  `excludedGlobs`, `matchedGlobs`.
- Wired `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` (added to the
  vocabulary in v1.3.0 in anticipation of this release) as a
  non-blocking diagnostic that surfaces whenever a PnP file is
  present, explaining that full PnP resolver parity is
  intentionally deferred and that topology is extracted from
  `package.json#workspaces` only.
- Added 12 fixtures under `packages/cli/tests/fixtures/adapters/`
  covering Yarn PnP basic, workspace-protocol, object-form,
  empty-globs, unnamed-package, loader-only, and
  pnpm-conflict-coexistence cases.
- Added 73+ structural tests in
  `packages/adapter-yarn-pnp/tests/` and
  `packages/cli/tests/adapters/` covering detection, extraction,
  determinism, safety invariants, and the v0.1.1-trust-polish
  `nodeLinkerSource` provenance contract.
- Added Yarn PnP support sections to the root `README.md` and
  the GitHub Actions example.
- Added real-repo trial audit
  (`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`)
  and release hygiene audit
  (`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_RELEASE_HYGIENE_AUDIT.md`).
- Added `.gitignore` rule for
  `packages/cli/tests/fixtures/**/.arch-engine/` so the CLI's
  auto-init runtime artifacts no longer dirty the working tree
  on every test run.

### Changed

- `@arch-engine/adapter-monorepo` now declines to claim a
  `package.json#workspaces` repository when a `.pnp.cjs` /
  `.pnp.loader.mjs` is also present AND the yarn-pnp adapter is
  registered. Avoids `ARCH_ENGINE_ADAPTER_CONFLICT` without
  changing behaviour for consumers who do not install the new
  adapter (the cache-hint check is a no-op when the hint is
  absent). Adapter version constant aligned to `1.3.1`.
- `@arch-engine/cli` `peerDependencies` extended to include
  `@arch-engine/adapter-yarn-pnp: ^0.1.0` (optional via
  `peerDependenciesMeta`). The `@arch-engine/adapter-monorepo`
  peer range tightened from `^1.3.0` to `^1.3.1` to ensure the
  yarn-pnp cache-hint decline is available when the v1.4.0 CLI
  runs.

### Trust polish (v0.1.1 of `@arch-engine/adapter-yarn-pnp`, included)

- `data.adapter.metadata.yarnPnp.nodeLinker` now reports
  `"pnp"` (rather than `null`) on repositories that ship a
  `.pnp.cjs` / `.pnp.loader.mjs` but have no explicit
  `nodeLinker:` declaration in `.yarnrc.yml` — matching Yarn
  Berry's documented default. A new sibling
  `nodeLinkerSource: "inferred_from_pnp_file"` / `"yarnrc"` /
  `"absent"` makes the provenance auditable.

### Compatibility

- JSON v1 output unchanged.
- JSON v2 envelope shape unchanged at the top level. The only
  new content is the `data.adapter.metadata.yarnPnp` sub-block
  (additive; absent on non-yarn-pnp adapter selections) and the
  new `nodeLinkerSource` field within it.
- `graphSurfaceHash` for every pre-existing fixture / repo is
  byte-identical to v1.3.1 (verified by the parity tests and
  the real-repo trial replay check).
- Adapter selection on `pnpm-basic`, the repo root, and all
  single-package fixtures is byte-identical to v1.3.1.
- 22-code `ARCH_ENGINE_*` vocabulary unchanged. The
  `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` code locked in v1.3.0
  is now actively used by the new adapter — no new codes added.
- No new CLI commands or flags.
- No AGP dependency.
- Node engines unchanged (`>=18.0.0`).
- Exit codes unchanged.

### Trial Evidence

- 12 candidates probed, 11 tested (rushstack dropped — no root
  `package.json`).
- 11/11 correct adapter selections (8 CORRECT_HIGH, 3 CORRECT_LOW).
- 0 P0 / 0 P1 / 0 P2 / 1 P3 (fixed by hygiene pass) issues.
- 0 absolute-path leaks across 33 JSON outputs.
- 0 source-file mutations across 11 cloned repos.
- `graphSurfaceHash` deterministic on replay for `yarnpkg/berry`.
- See [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md).

### Safety model

The Yarn PnP MVP **never**:

- executes `.pnp.cjs` or `.pnp.loader.mjs`
- invokes `yarn` or any other package-manager binary
- runs `npm install` / `pnpm install` / `yarn install`
- opens network sockets
- reads `node_modules/`, `.yarn/cache`, `.yarn/unplugged`,
  `.yarn/install-state.gz`
- mutates the target repository
- emits absolute paths or wall-clock-derived data in JSON v2

These invariants are pinned by structural tests and verified
against the only real Yarn PnP repository in mainstream OSS
today (`yarnpkg/berry` itself).

### Migration

- **Existing v1.3.1 users** of `@arch-engine/cli` with the
  monorepo or pnpm adapters: no action required. v1.4.0 is
  fully backward-compatible with all v1.3.x consumer code.
- **Yarn Berry / PnP users**: install the new adapter alongside
  the CLI:
  ```bash
  npm install --save-dev \
    @arch-engine/cli@1.4.0 \
    @arch-engine/adapter-monorepo@1.3.1 \
    @arch-engine/adapter-pnpm@0.1.1 \
    @arch-engine/adapter-yarn-pnp@0.1.0
  ```

## [1.3.1] — 2026-05-13

Patch release. Trust-polish follow-up to the v1.3.0 real-repo
adapter trial (verdict: `REAL_REPO_ADAPTER_TRIAL_STRONG_SIGNAL`).
Three small fixes that improve the message quality and metadata
determinism of the adapter surface introduced in v1.3.0. No new
commands, no new flags, no JSON v1 change, no adapter-selection
change, no `graphSurfaceHash` change, no AGP dependency.

Packages bumped:

- `@arch-engine/cli`: `1.3.0` → `1.3.1`
- `@arch-engine/adapter-pnpm`: `0.1.0` → `0.1.1`

All other packages (`@arch-engine/core`, `@arch-engine/schema`,
`@arch-engine/adapter-monorepo`, the three governance packs) are
unchanged at `1.3.0` — no source in those packages was touched by
this patch.

### Fixed

- Clarified `doctor` human output by distinguishing
  adapter-selection confidence from topology coverage signal.
  The previous wording emitted two distinct "Confidence" labels
  (one about which adapter was chosen and how confidently; one
  about how much of the workspace topology was extracted), which
  on single-package fallback runs read as a contradiction.
  Output now reads `Adapter selected: <name> (<X> adapter
  confidence)` and `Topology signal: <X> (<description>)`.
  Icons and exit semantics unchanged.
- Improved `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` fix guidance to
  call out the `pnpm-lock.yaml`-without-`pnpm-workspace.yaml`
  edge case, the npm/yarn `workspaces`-field requirement, and the
  fact that the warning is informational on legitimate
  single-package repositories. Severity, exit code, ciBlocking,
  code name, and title are unchanged.
- Stabilized `data.adapter.metadata.pnpm.packageManagerVersion`
  serialization in JSON v2. The field is now always present (no
  longer sometimes-absent), always the bare version string
  (e.g. `"9.0.0"` rather than the raw `"pnpm@9.0.0"` hint), and
  `null` when the root `package.json#packageManager` is absent
  or does not identify pnpm. Parses Corepack-style `+<sha>`
  integrity suffixes deterministically. No new I/O — still
  read-only from the root `package.json` already loaded by the
  adapter. No pnpm execution, no network, no `node_modules` read,
  no `.pnpm-store` read.

### Compatibility

- JSON v1 output unchanged.
- JSON v2 envelope shape unchanged. The only delta inside the
  envelope is the deterministic `data.adapter.metadata.pnpm.packageManagerVersion`
  value/presence described above.
- Adapter selection behavior unchanged (precedence, cache-hint
  protocol, confidence classification, `CONFLICT`/`LOW_CONFIDENCE`/
  `RESOLVED`/`NONE` statuses all byte-identical to v1.3.0).
- `graphSurfaceHash` unchanged for every fixture.
- No new commands or flags.
- No new `ARCH_ENGINE_*` error codes; `ARCH_ENGINE_*` vocabulary
  remains the 22-code set locked in v1.3.0.
- No AGP dependency added.
- `@arch-engine/cli` `peerDependencies["@arch-engine/adapter-pnpm"]`
  bumped from `^0.1.0` to `^0.1.1`. Range remains optional via
  `peerDependenciesMeta`.

## [1.3.0] — 2026-05-13

Minor release. Lights up runtime **adapter selection** and ships the
first additive workspace adapter — `@arch-engine/adapter-pnpm@0.1.0`
— for pnpm-managed repositories. Adds a new JSON v2 `data.adapter`
metadata block on every topology-extracting command, surfaces the
chosen adapter on `doctor`'s human output, and grows the
`ARCH_ENGINE_*` vocabulary by six adapter-related codes. All v1.2.0
defaults are preserved exactly: JSON v1 remains the default for
`--json`, the five-command surface is unchanged, no existing JSON
keys were removed or renamed, no AGP dependency was added.
Consumers of `@arch-engine/*@1.2.0` can upgrade with no code
changes; opt-in to richer pnpm extraction by installing
`@arch-engine/adapter-pnpm`.

### Added

- Added `@arch-engine/adapter-pnpm@0.1.0` — a new public adapter
  package handling pnpm workspaces declared via `pnpm-workspace.yaml`.
  Pure-fs read, dependency-free at runtime, deterministic glob
  expansion, exclusion-glob support, and protocol awareness for
  `workspace:*`, `workspace:^`, `workspace:~`, `workspace:<version>`
  on all four dependency kinds (`dependencies`, `devDependencies`,
  `peerDependencies`, `optionalDependencies`). Never executes
  `pnpm`, never reads `node_modules/` or `.pnpm-store/`, never opens
  network sockets, never mutates the user's repository.
- Added an internal `ArchitectureAdapter` contract at
  `packages/cli/src/adapters/adapter-contract.ts` and a deterministic
  adapter registry at `packages/cli/src/adapters/adapter-registry.ts`.
  Both are internal — not exported from any public package index.
  The registry implements spec §7 selection: probe every adapter,
  sort by `(confidence DESC, declaredPrecedence ASC, adapterName ASC)`,
  classify status as `RESOLVED` / `CONFLICT` / `LOW_CONFIDENCE` / `NONE`.
- Added runtime adapter selection in `packages/cli/src/runner-bridge.ts`.
  The bridge lazily loads both adapters, builds the registry (pnpm at
  precedence 2, monorepo at precedence 4), sets a cache hint so the
  monorepo adapter declines `pnpm-workspace.yaml` when pnpm is
  registered, runs `selectArchitectureAdapter`, and dispatches to the
  chosen adapter. CONFLICT throws `BridgeAdapterConflictError` and
  commands exit 3.
- Added `data.adapter` JSON v2 metadata block per spec §12.2 on
  `doctor`, `inspect`, `analyze`, `check`, and `explain` (matched,
  unmatched, and `policy` modes). Carries
  `{ name, version, packageManager, workspaceKind, confidence,
    reasons[], warnings[], alsoDetected[], metadata{} }`. Adapter
  identity does NOT affect `graphSurfaceHash`.
- Added `doctor` human verdict-header line:
  `✔ Adapter: <name> (<HIGH|MEDIUM|LOW> confidence)`. Slots between
  "Workspace type resolved as" and "Packages detected"; survives
  `--quiet`; uses yellow `⚠` for LOW.
- Added six new `ARCH_ENGINE_*` error codes (vocabulary grows
  additively from 16 to 22):
  - `ARCH_ENGINE_ADAPTER_CONFLICT` (ERROR, exit 3)
  - `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` (WARNING, exit 0)
  - `ARCH_ENGINE_WORKSPACE_GLOBS_INVALID` (ERROR, exit 3)
  - `ARCH_ENGINE_WORKSPACE_PACKAGE_UNNAMED` (ERROR, exit 3)
  - `ARCH_ENGINE_LOCKFILE_UNSUPPORTED` (WARNING, exit 0)
  - `ARCH_ENGINE_PNP_RESOLUTION_DEFERRED` (WARNING, exit 0)
- Added 59 new adapter-focused tests under
  `packages/cli/tests/adapters/` and `packages/adapter-pnpm/tests/`
  covering: adapter contract structural shape, registry selection
  branches, monorepo-adapter Pass 1 compatibility, pnpm adapter
  package behaviour (26 unit tests), CLI selection wiring, JSON v2
  `data.adapter` presence across commands, `doctor` human Adapter
  line, `explain` regression-mode honest omission, `graphSurfaceHash`
  intersection parity with documented root-asymmetry pin.
- Added six pnpm fixture directories under
  `packages/cli/tests/fixtures/adapters/`: `pnpm-basic`,
  `pnpm-workspace-protocol`, `pnpm-nested`, `pnpm-excluded-glob`,
  `pnpm-empty-globs`, `pnpm-unnamed-package`.
- Added "pnpm workspace support (preview)" subsection to root
  `README.md` and a "Works with pnpm workspaces (v1.3.0+)" subsection
  to `examples/github-actions/README.md` with opt-in install snippet.
- Added implementation audits at
  `audits/ARCH_ENGINE_ADAPTER_CONTRACT_PASS_1_IMPLEMENTATION_AUDIT.md`,
  `audits/ARCH_ENGINE_ADAPTER_PASS_2_PNPM_IMPLEMENTATION_AUDIT.md`,
  and
  `audits/ARCH_ENGINE_ADAPTER_PASS_2B_RELEASE_SURFACE_COMPLETION_AUDIT.md`.

### Changed

- CLI topology extraction now goes through deterministic adapter
  selection at runtime. `pnpm-workspace.yaml` resolves through
  `@arch-engine/adapter-pnpm` when installed; falls back to
  `@arch-engine/adapter-monorepo`'s line-based pnpm parser otherwise
  with `ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE` advisory.
- `@arch-engine/adapter-monorepo` internally refactored to implement
  the structural `ArchitectureAdapter` shape. The public free
  function `runMonorepoExtraction(cwd)` and singletons
  `monorepoAdapter` / `createMonorepoAdapter()` are byte-identical
  to v1.2.0. New singleton `monorepoArchitectureAdapter` exposed for
  the registry; NOT part of the v1.x stability contract.
- `doctor` v2 envelope's pre-existing `data.adapter = {id, resolved}`
  shape is replaced by the canonical spec-§12.2 shape (additive new
  fields; no test depended on the old keys; verified by grep).
- The CLI's `ARCH_ENGINE_*` error-code vocabulary grows from 16 to
  22. The v1.0.3 / v1.2.0 codes are preserved verbatim and in the
  same order; v1.3.0 only appends.

### Compatibility

- JSON v1 output remains the default for `--json` and is
  byte-identical to v1.2.0.
- JSON v2 changes are strictly additive: `data.adapter` is a new
  sibling under `data.*`; no existing key removed or retyped.
- The five-command surface (`doctor`, `inspect`, `analyze`,
  `check`, `explain <target>`) is unchanged.
- No new CLI commands.
- No new CLI flags.
- `runMonorepoExtraction(cwd)` and `classifyAuthorityDomain(route)`
  on `@arch-engine/adapter-monorepo` remain byte-identical to
  v1.2.0.
- `@arch-engine/adapter-pnpm` is published independently at
  `0.1.0`. It is an optional peer dependency of `@arch-engine/cli`
  and is loaded lazily — the CLI works without it (falls back to
  the monorepo adapter's pnpm-workspace handling).
- `graphSurfaceHash` is canonical-only; adapter identity does not
  affect the hash. Cross-adapter parity holds on the intersection
  of glob-matched packages; a single root-inclusion asymmetry between
  the monorepo and pnpm adapters is documented and pinned by test.
- `explain regression` mode intentionally does NOT emit
  `data.adapter` — it reads a saved artifact and never runs adapter
  selection. The renderer's `adapterSummary?` parameter makes the
  absence intentional, not accidental.
- No AGP dependency. `@arch-engine/agp-emitter` and the
  `@arch-governance/*` packages remain outside the v1.x runtime
  bundle.
- All previous freeze snapshots accepted with no snapshot updates.
- Phase A / B / C / D-Lite / E / F / G suites all still green;
  no test loosened in this release.

## [1.2.0] — 2026-05-11

Minor release. Adds cross-run **architecture drift detection** via
the new `--baseline <path>` flag on `check` and `analyze`, plus a
deterministic canonical-topology surface emitted unconditionally in
JSON v2. All v1.1.0 defaults are preserved exactly: JSON v1 remains
the default for `--json`, the five-command surface is unchanged, no
existing JSON keys were removed or renamed, no AGP dependency was
added. Consumers of `@arch-engine/*@1.1.0` can upgrade with no code
changes; opt-in to v1.2.0 baseline comparison by passing the new
flag.

### Added

- Added `--baseline <path>` for cross-run architecture drift
  detection. Valid on `check` (primary) and `analyze` (secondary).
  Rejected on `doctor`, `inspect`, `explain` with exit 2
  (`ARCH_ENGINE_INVALID_CONFIG`). The baseline file must be a prior
  Arch-Engine JSON v2 envelope (`schemaVersion:
  "arch-engine.cli.v2"`) emitted by `check`, `analyze`, or
  `inspect` with `data.topology.canonical` present.
- Added `data.topology.canonical` to every JSON v2 output on
  `inspect`, `analyze`, and `check`. Carries a deterministic
  workspace topology: `{ graphSurfaceVersion: "1.0.0",
  graphSurfaceHash: "<64-hex>", nodes[], edges[] }`. Nodes sorted by
  `id` ascending; edges sorted by `id` ascending with stable
  `e_<8-hex>` ids derived from `(from, to, type)`; `graphSurfaceHash`
  is the sha256 of the canonical serialisation. Always present in
  v2; never present in v1.
- Added deterministic architecture-drift detection across three
  orthogonal axes:
  - **Topology** — `addedNodes`, `removedNodes`, `addedEdges`,
    `removedEdges`, plus reserved `changedNodes` / `changedEdges`
    for forward compatibility.
  - **Policy** — `new`, `resolved`, `persisted`, `severityChanged`
    violations keyed by the v1.0.3 stable `v_<hex8>` id.
  - **Signal** — `scoreDelta`, `coverageDelta`, `connectivityDelta`,
    `confidenceDelta`, `violationsDelta`,
    `graphSurfaceHashChanged`.
- Added `data.drift` to JSON v2 output when `--baseline` is set.
  Contains `baseline` (metadata), `summary` (counter rollup),
  `topology`, `violations`, and `signal` sub-objects per spec §11.3.
  Drift arrays sorted by id; deltas computed at full numeric
  precision; null-on-missing for baseline-side scalars.
- Added `summary.drift` counter mirror to JSON v2 when `--baseline`
  is set: `{ newViolations, resolvedViolations, addedEdges,
  removedEdges }`. Top-level `summary.headline` gains a `(drift:
  +N violation, +N edge)` parenthetical when drift is non-zero.
- Added `## Architecture Drift` section to markdown output for
  `check` and `analyze` when `--baseline` is set. Includes a summary
  table (only non-zero rows), per-table caps of 25 entries, and
  sub-sections for New violating edges / Added edges / Removed
  edges. No-drift path emits `_No architectural drift detected._`.
  Verdict line gains `_(drift: ...)_` parenthetical.
- Added human-readable architecture drift block to `check` and
  `analyze` (before the exit footer). Variants:
  - **With drift, blocking:** "Architecture drift detected".
  - **With drift, non-blocking:** "Architecture drift observed".
  - **No drift:** "✔ No architectural drift detected".
  Per-block cap of 5 entries. `--quiet` keeps the summary line but
  suppresses detail tables. `--verbose` substitutes the absolute
  baseline path for the basename.
- Added five new `ARCH_ENGINE_*` error codes (vocabulary grows
  additively to 16 total):
  - `ARCH_ENGINE_BASELINE_NOT_FOUND` (ERROR, exit 2)
  - `ARCH_ENGINE_BASELINE_INVALID` (ERROR, exit 2)
  - `ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA` (ERROR, exit 2; downgrades to WARNING for the newer-than-runtime path)
  - `ARCH_ENGINE_BASELINE_COMMAND_MISMATCH` (ERROR, exit 2)
  - `ARCH_ENGINE_DRIFT_DETECTED` (INFO, exit 0; surfaces drift in `diagnostics[]` without blocking)
- Added 82 new Phase G tests across four files
  (`cli-experience-phase-g-{baseline-reader, drift, json-v2-baseline, drift-output}.test.ts`)
  covering baseline path validation, JSON parsing, schema/command
  checks, drift across all three axes, JSON v2 integration,
  canonical-topology presence, markdown drift section, human drift
  block, --quiet/--verbose interactions, determinism, and JSON v1
  backward-compatibility.
- Added three new internal CLI modules:
  `packages/cli/src/canonical-topology.ts` (deterministic
  emitter), `packages/cli/src/baseline-reader.ts` (strict
  validator), and `packages/cli/src/drift.ts` (pure drift engine).
- Added implementation audit at
  `audits/ARCH_ENGINE_BASELINE_COMPARISON_IMPLEMENTATION_AUDIT.md`
  and design spec at `docs/cli/baseline-comparison-spec.md`.

### Changed

- JSON v2 summaries can now include drift counters when baseline
  comparison is active (`summary.drift`).
- Markdown reports now include the `## Architecture Drift` section
  when a baseline is supplied.
- Human `check` and `analyze` outputs now surface a drift block
  before the exit footer when a baseline is supplied.
- The CLI's `ARCH_ENGINE_*` error-code vocabulary grows from 11 to
  16. The v1.0.3 11-code floor is preserved verbatim and in the
  same order; v1.2.0 only appends.
- `readPackageVersion` is now exported from
  `packages/cli/src/render-v2.ts` (internal helper; not part of
  the package's public `exports` map).

### Compatibility

- JSON v1 output remains the default for `--json` and is
  byte-identical to v1.1.0 / v1.0.3.
- JSON v2 remains opt-in only via `--json-schema=v2`.
- Canonical topology is in JSON v2 only; never in JSON v1.
- Drift surfaces in JSON v2 only; v1 consumers see no drift fields.
- Drift alone never fails CI. The exit code is computed strictly
  from the current run's state.
- Current blocking violations still exit `1` (unchanged from
  v1.1.0).
- Invalid baselines exit `2` with a structured
  `ARCH_ENGINE_BASELINE_*` diagnostic.
- The five-command surface (`doctor`, `inspect`, `analyze`,
  `check`, `explain <target>`) is unchanged.
- No new public exports from `@arch-engine/cli` or any other
  workspace. The three new internal modules are bundled into the
  CLI's ESM output but not exposed.
- No AGP dependency. `@arch-engine/agp-emitter` and the
  `@arch-governance/*` packages remain outside the v1.x runtime
  bundle.
- All previous freeze snapshots accepted with no snapshot updates.
- Phase A / B / C / D-Lite / E / F suites all still green;
  one Phase E test loosened from "exactly 11 codes" to "11-code
  v1.0.3 prefix preserved, additive growth allowed" (documented in
  the test).

## [1.1.0] — 2026-05-11

Minor release. Adds six new CLI flags and an opt-in JSON v2 output
envelope. All v1.0.x defaults are preserved exactly: JSON v1 remains
the default for `--json`, the five-command surface is unchanged, no
existing JSON keys were removed or renamed, no AGP dependency was
added. Consumers of `@arch-engine/*@1.0.3` can upgrade with no code
changes; opt-in to v1.1.0 features by passing the new flags.

### Added

- Added `--json-schema=v1|v2` for opt-in JSON v2 output. Default
  remains `v1`. `v2` requires `--json` or `--format json`; otherwise
  exits 2 with `ARCH_ENGINE_INVALID_CONFIG`.
- Added `--ci` for deterministic CI-friendly output. Forces
  `NO_COLOR=1` ahead of `picocolors` (via `bin.ts` pre-import gate
  with dynamic import). Does NOT imply `--json`. Composes with every
  other flag.
- Added `--format human|json|markdown`. `human` is the default;
  `json` aliases `--json`; `markdown` is new in v1.1.0 and ships
  for all five commands.
- Added `--output <path>`. Writes the formatted output to a file
  instead of stdout. mkdir-p the parent directory; UTF-8; LF line
  endings; ANSI-stripped when writing to file; overwrite on every
  run. Trailing slash exits 2.
- Added `--verbose`. Adds detail to human/markdown output and
  includes `artifacts[].absolutePath` in JSON v2. Never leaks
  secrets.
- Added `--quiet`. Suppresses non-essential human stdout (header
  metrics, distribution sections, "Next:" hints). Verdict and
  ERROR/INTERNAL diagnostics still print. No effect on JSON or
  markdown content. Wins over `--verbose` for human output.
- Added the JSON v2 envelope (`schemaVersion: "arch-engine.cli.v2"`)
  with 11 alphabetised top-level keys: `archEngineVersion`,
  `artifacts`, `command`, `data`, `diagnostics`, `emittedAt`,
  `exitCode`, `nextActions`, `schemaVersion`, `status`, `summary`.
  Status enum: `passed | blocked | warning | error | internal_error
  | not_enforced`.
- Added markdown output for `check`, `analyze`, `doctor`, `inspect`,
  and `explain`. Deterministic ordering, no timestamps, no absolute
  paths, capped at 50 violations / 25 diagnostics / 250 KB total.
  Suitable for PR-comment posting.
- Added deterministic ordering rules in JSON v2: top-level keys
  alphabetised; `data.*` keys alphabetised recursively;
  `diagnostics[]` sorted by `(severity desc, code asc, message
  asc)`; `data.violations[]` (check) sorted by `id` ascending;
  `artifacts[]` sorted by `(kind, relativePath)`.
- Added path-safety policy: all paths in `data.*` are
  repo-relative POSIX; `artifacts[].absolutePath` omitted by
  default and surfaced only under `--verbose`.
- Added 71 new Phase F tests across four files
  (`cli-experience-phase-f-{flags,json-v2,markdown-output,ci}.test.ts`)
  covering vocabulary, envelope shape, field invariants, JSON v1
  backward-compat, demo-drift blocked verdict, path-leakage policy,
  diagnostic ordering, markdown rendering, output writer, ANSI
  stripping, LF normalisation, CI determinism, and the full flag
  interaction matrix.
- Added implementation audit at
  `audits/ARCH_ENGINE_JSON_V2_CI_FLAGS_IMPLEMENTATION_AUDIT.md`
  and design spec at `docs/cli/json-v2-ci-flags-spec.md`.

### Changed

- CLI output can now be routed to markdown or a file without
  changing the existing command surface.
- `--ci` forces no-color deterministic output but does not imply
  `--json`.
- The structured error renderer from v1.0.3 now honours the JSON
  conflict-error mode: validation failures under `--json` (or
  `--format json`) emit a `{ diagnostics: [...] }` envelope to
  stdout instead of the human Title/Problem/Fix/Exit/Docs template
  on stderr.
- JSON v1 remains the default for `--json`. `--json-schema=v1` is
  explicitly accepted as a no-op alias of the default for forward
  compatibility.

### Compatibility

- Existing five commands (`doctor`, `inspect`, `analyze`, `check`,
  `explain`) are unchanged.
- Existing JSON v1 output remains the default for `--json`.
- JSON v2 is opt-in only via `--json-schema=v2`.
- No existing JSON v1 keys removed or renamed. The Phase A
  (`policyConfigured`, `headlineKind`), Phase B
  (`supportedSpecialTargets`), and Phase 7
  (`diagnostics`, `violations`, `artifactRelativePath`) additive
  fields are preserved verbatim.
- No new public exports from `@arch-engine/cli` or any other
  workspace. The four new internal modules (`cli-options.ts`,
  `output-writer.ts`, `render-v2.ts`, `render-markdown.ts`) are
  bundled into the CLI's ESM output but not exposed as importable
  entry points.
- No AGP dependency. `@arch-engine/agp-emitter` and the
  `@arch-governance/*` packages remain outside the v1.x runtime
  bundle.
- All previous freeze snapshots accepted with no snapshot updates.
- Phase A / B / C / D-Lite / E test suites all still green with
  zero changes.

## [1.0.3] — 2026-05-07

Patch release. The frozen v1.0.x public API surface is preserved exactly;
freeze tests pass without snapshot updates. All v1.0.2 JSON keys are
preserved verbatim; every v1.0.3 JSON change is **additive**. Consumers of
`@arch-engine/*@1.0.2` can upgrade with no code changes.

### Added

- Added internal `ARCH_ENGINE_*` error-code vocabulary for structured CLI
  diagnostics (`packages/cli/src/error-codes.ts`). Eleven codes locked per
  `docs/cli/json-error-language-spec.md` §6.2 with severity, exit-code,
  title, default fix, and `ciBlocking` metadata. Internal — not exported
  from `@arch-engine/cli`.
- Added structured human error formatting using
  `Title / Problem / Fix / Exit / Docs` shape
  (`packages/cli/src/format-error.ts`). `INFO` severity uses
  `Next:` instead of `Fix:` and omits the `Exit` line.
- Added additive `diagnostics: []` array to every command's `--json`
  output (`doctor`, `inspect`, `analyze`, `check`, `explain`). Always
  present; populated with `ARCH_ENGINE_POLICY_NOT_FOUND`,
  `ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL`, `ARCH_ENGINE_TARGET_NOT_FOUND`,
  `ARCH_ENGINE_NO_BASELINE`, or `ARCH_ENGINE_BLOCKING_VIOLATION` per
  scenario.
- Added additive `violations: []` array to `check --json`. Each entry
  carries a stable `id` (sha256-truncated 8-char), `ruleId`, `edge`,
  `severity`, `ciBlocking`, `category`, and `code`.
- Added additive `artifactRelativePath` to `check --json` for path-safe
  machine consumption. POSIX-normalised; never absolute; sibling to the
  existing absolute `artifactPath`.
- Added stable violation IDs for `check --json` violation entries: a
  re-run on the same fixture produces byte-identical IDs.
- Added 44 new tests in `packages/cli/tests/cli-experience-phase-e.test.ts`
  covering vocabulary, rendering, debug gate, process-level diagnostics,
  stack-trace policy, path normalisation, determinism, and JSON
  backward-compatibility per spec §15.1–§15.6.
- Added implementation audit at
  `audits/ARCH_ENGINE_JSON_ERROR_LANGUAGE_IMPLEMENTATION_AUDIT.md`.

### Fixed

- Structured top-level unknown CLI failures as
  `ARCH_ENGINE_INTERNAL_INVARIANT_FAILED`. The CLI's top-level catch now
  routes any unhandled throw through the structured renderer, exits with
  code `5`, and never leaks a raw stack trace by default.
- Hid stack traces by default while preserving a debug toggle:
  `DEBUG=arch-engine:*` (or `DEBUG=*`) re-enables stack frame output for
  bug investigation. Matches the existing v1.0.x convention; centralised
  in `format-error.ts`.
- Improved `check` JSON output so blocking violations include rule, edge,
  severity, and code in a structured `violations[]` entry rather than
  only the artifact-side count. Human output is unchanged.
- Improved `explain --json` diagnostics for no-baseline /
  target-not-found / no-policy / low-signal situations: each emits the
  appropriate `ARCH_ENGINE_*` diagnostic with severity `INFO` while
  preserving every existing JSON key.
- Structurised the `Topology extraction failed` fatal path in
  `arch-engine check` as `ARCH_ENGINE_ADAPTER_NOT_FOUND` (severity
  `ERROR`, exit `3`). Exit code unchanged; rendering now follows the
  `Title / Problem / Fix / Exit / Docs` template.

### Compatibility

- No existing JSON keys were removed or renamed.
- No commands or flags were added.
- No AGP dependency was added.
- No public exports widened. `error-codes.ts` and `format-error.ts` are
  internal CLI modules; `package.json#exports` for `@arch-engine/cli`
  remains exactly `{ ".": "./dist/bin.js" }`.
- JSON v2 envelope (`schemaVersion`, `command`, `version`, `emittedAt`,
  `status`, `summary`, `nextActions`) and `--json-schema=v2` flag remain
  deferred to a future minor release.
- All existing v1.0.2 `check --json` keys (`score`, `stabilityTier`,
  `artifactPath`, `policyConfigured`, `headlineKind`, etc.) preserved
  verbatim with the same value types.
- Phase A / B / C / D-Lite invariants pinned by Phase A–D test files all
  still hold.
- All previous freeze snapshots accepted with no snapshot updates.

## [1.0.2] — 2026-05-07

Patch release. The frozen v1.0.x public API surface is preserved exactly;
freeze tests pass without snapshot updates. Consumers of `@arch-engine/*@1.0.1`
can upgrade with no code changes other than the CI exit-code note below.

### Fixed

- Removed misleading command-name echoes (`arch-engine doctor`,
  `arch-engine inspect`, `arch-engine check`, `arch-engine explain …`) from
  human CLI output.
- Removed hardcoded stale `Arch Engine CLI v1.0.0` and `Schema runtime v1.0.0`
  diagnostic strings from `arch-engine doctor`.
- Calibrated `arch-engine analyze` and `arch-engine check` so a healthy
  no-policy fixture is no longer labelled `Stability Score: CRITICAL` —
  the headline now reads `No policy configured — topology captured but not
  evaluated.` when no policy file is present.
- Removed the `Stability Score: CRITICAL` + `✔ Verification complete. No
  blocking violations.` contradiction from `arch-engine check`'s no-policy
  output.
- Every command's human output now ends with exactly one
  `Next: …` / `Fix: …` / `Exit N: …` line.
- Root `arch-engine --help` now leads with the product promise
  *"Catch architecture drift before merge."*, lists the five v1.0.x commands
  with plainer descriptions, and ends with a recommended first-run path
  plus a docs URL.
- Per-command help now ships an Examples block. `arch-engine check --help`
  documents exit codes; `arch-engine explain --help` documents the
  supported target vocabulary (`regression`, `policy`, plus free-form
  node/edge substring search).
- `arch-engine explain <unknown-target>` now lists the supported special
  targets in both human and JSON modes.
- Added a deterministic `examples/demo-drift/` fixture that produces the
  canonical `Blocked: 1 architecture violation.` output suitable for the
  README and screenshots.
- Updated `docs/cli/cli-readiness-matrix.md` exit-code documentation to
  match the current canonical mapping.

### Behavior change (CI scripts may need updating)

- **`arch-engine check` now exits `1` for blocking architecture violations.**
  In v1.0.1, blocking enforce-mode policy violations exited `5` and BLOCKER
  authority-tier crossings exited `2`. Both now exit `1`.
- Exit `5` is reserved for internal invariant failure.
- Exit `2` is reserved for invalid input or configuration.
- Exit `3` continues to indicate adapter/workspace failure (coverage
  threshold not met).
- Successful runs and runs with no blocking violations still exit `0`.
- CI scripts that explicitly checked `if exit_code == 5` or `if exit_code
  == 2` for blocking violations need updating to check `if exit_code != 0`
  (most CI scripts already do this) or `if exit_code == 1`.
- No published v1.0.1 fixture triggers the old `5` or `2` codes; only
  consumers running their own `.archengine/policy.yml` in `mode: enforce`
  observe the change.

### Compatibility

- No new commands.
- No new flags.
- No public export widening — `@arch-engine/core`'s public 110-symbol
  freeze set is byte-identical.
- No AGP dependency added — `@arch-governance/*` is not required.
- JSON keys preserved verbatim. Two backward-compatible additive fields
  from v1.0.1 + Phase A continue (`policyConfigured`, `headlineKind`).
  One additive field on `arch-engine explain --json` unknown-target
  responses (`supportedSpecialTargets[]`).
- Auto-init `.arch-engine/` directory and stability artifact behavior
  unchanged.

### Packages

- `@arch-engine/schema` — v1.0.2
- `@arch-engine/core` — v1.0.2
- `@arch-engine/cli` — v1.0.2
- `@arch-engine/adapter-monorepo` — v1.0.2
- `@arch-engine/governance-pack-authority` — v1.0.2
- `@arch-engine/governance-pack-rest-contract` — v1.0.2
- `@arch-engine/governance-pack-journey` — v1.0.2

---

## [1.0.1] — 2026-05-06

Strict patch release. No public API expansion. The frozen v1.0.0 export
surface is preserved exactly; consumers of `@arch-engine/*@1.0.0` can
upgrade without code changes.

### Fixed

- CLI `--version` now reports the package's actual version from
  `package.json` instead of the previously-frozen `1.0.0-rc.3` build
  artifact in the v1.0.0 tarball.
- `arch-engine analyze`, `check`, and `explain` no longer crash with
  `Fatal: edges is not iterable`. Root cause was in
  `@arch-engine/adapter-monorepo`, which emitted `edgesByAdapter` with
  the count of internal nodes where the runner contract requires an
  array of `ReconcilableEdge`. The adapter now projects the workspace
  adjacency map into a deterministically-ordered edge array.
- `@arch-engine/core` `reconcileEdges` now produces a structured
  user-facing error if any adapter emits a non-array `edgesByAdapter`,
  instead of a bare `TypeError`.
- Public `@arch-engine/core` build graph repaired: the CLI workspace
  no longer pulls unresolved imports into the bundle.
- Restored the v1.0.0 public export surface for `@arch-engine/core`.
  Post-v1.0.0 federation, policy-registry, and policy-bundles
  re-exports were trimmed from the public root barrel; their
  implementations remain on disk for future minor-release promotion.
- Removed unpublished adapter dependencies (`@arch-engine/adapter-github`,
  `@arch-engine/adapter-gitlab`) from `@arch-engine/cli`'s package
  manifest so a fresh install no longer fails to resolve them.

### Documentation

- README quickstart now installs `@arch-engine/cli` together with
  `@arch-engine/adapter-monorepo` (the required workspace topology
  adapter for `doctor` and other commands).
- Provider Adapter Architecture section reframed as preview/not-yet-
  released; the unpublished GitHub and GitLab adapters are clearly
  marked as not on npm.
- Removed a non-existent CLI pipe example.
- Removed a stale coverage badge.
- Added a short note that AGP integration is upcoming and that
  v1.0.x does not depend on `@arch-governance/*`.

### Build / Test

- Root `typecheck` script now actually checks each of the seven
  public-contract packages individually.
- `vitest.config.ts` excludes the private `packages/adapters/conformance/tests/**`
  factory test files, which have no top-level `describe()` and were
  reported as spurious "No test suite found" failures.

### Packages

- `@arch-engine/schema` — v1.0.1
- `@arch-engine/core` — v1.0.1
- `@arch-engine/cli` — v1.0.1
- `@arch-engine/adapter-monorepo` — v1.0.1
- `@arch-engine/governance-pack-authority` — v1.0.1
- `@arch-engine/governance-pack-rest-contract` — v1.0.1
- `@arch-engine/governance-pack-journey` — v1.0.1

---

## [1.0.0] — 2026-04-15

### Added

- Stable CLI surface: `doctor`, `inspect`, `check`, `analyze`, `explain` with `--json` output
- Deterministic topology extraction engine with hash-stable identity computation (`closureGraphHash`)
- Capability adapter architecture with monorepo workspace detection (npm, yarn, pnpm)
- Governance pack composition with severity escalation and provenance chains
- Three built-in governance packs: authority boundaries, REST contract parity, journey regression
- Federation overlay composition with mirror fallback and trust-tier enforcement
- Snapshot replay certification with byte-stable output across environments
- Sealed public export surface: `.`, `./analysis`, `./parsers`
- Schema authority anchored to `schemas.arch-engine.dev` (`R0-v1`)
- Comprehensive architecture contract documentation
- Landing page at arch-engine.dev

### Packages

- `@arch-engine/schema` — v1.0.0
- `@arch-engine/core` — v1.0.0
- `@arch-engine/cli` — v1.0.0
- `@arch-engine/adapter-monorepo` — v1.0.0
- `@arch-engine/governance-pack-authority` — v1.0.0
- `@arch-engine/governance-pack-rest-contract` — v1.0.0
- `@arch-engine/governance-pack-journey` — v1.0.0

---

## [0.1.0-preview] — 2026-04-13

### Added

- Deterministic topology governance engine with hash-stable identity computation
- Overlay lifecycle admission with signature verification and namespace ownership
- Capability federation (F-12) with deterministic negotiation ordering
- Descriptor matrix compatibility gating and mirror equivalence enforcement
- Diagnostic sovereignty with categorical-only output governed by `R0-v1` schema
- CLI subsystem: `doctor`, `inspect`, `check`, `analyze`, `explain` with `--json` output
- Sealed public export surface: `.`, `./analysis`, `./parsers`
- Schema authority anchored to `schemas.arch-engine.dev` (`R0-v1`)
- Governance scaffolding: SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- Trusted-fallback example pack for offline deterministic evaluation
- Public API freeze contract and preview scope declaration

### Preview Scope

This release explicitly excludes:
- Federation handshake protocol
- Overlay merge execution
- Multi-repo synchronization
- Runtime enforcement adapters
- Production routing integration
