# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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
