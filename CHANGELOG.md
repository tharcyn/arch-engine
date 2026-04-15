# Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

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
