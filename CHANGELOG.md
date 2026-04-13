# Changelog

All notable changes to this project will be documented in this file.

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
