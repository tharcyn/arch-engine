# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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
