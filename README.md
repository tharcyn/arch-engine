# @arch-engine/core

**Capability-driven architecture topology reasoning engine.**

Validate dependency direction, detect authority boundary violations, score topology stability, and reconcile conflicting graph edges across multiple code scanners.

## Status

**v0.1.0-preview** — Substrate certification release.

This is a preview release intended for early evaluation by architecture teams, platform engineers, and governance infrastructure authors. The public API surface is frozen per `docs/contracts/public-api-freeze.md`.

## Features

- **Deterministic topology governance** — hash-stable identity computation, canonical serialization, snapshot closure graph verification
- **Overlay lifecycle admission** — signature verification, namespace ownership, authority ladder enforcement, revocation propagation
- **Capability federation (F-12)** — deterministic negotiation ordering, descriptor matrix compatibility, mirror equivalence enforcement
- **Diagnostic sovereignty** — categorical-only diagnostics governed by `R0-v1` schema, no numeric weight leakage
- **CLI subsystem** — `doctor`, `inspect`, `check`, `analyze`, `explain` with `--json` deterministic output

## Quick Start

```bash
npm install @arch-engine/core@preview
```

```typescript
import { EngineRunner, loadEngineManifest } from '@arch-engine/core';
```

## Example Pack

A self-contained deterministic example is included:

```
examples/trusted-fallback/
├── topology.json
├── execution-config.json
├── expected-output.json
├── providers/
└── requirements/
```

This example operates fully offline with no registry dependencies.

See [examples/policy-pack-minimal](examples/policy-pack-minimal/) for a deterministic architecture enforcement walkthrough.

## Export Surface

| Path | Description |
|---|---|
| `@arch-engine/core` | Core engine runner, manifest loader, policy system |
| `@arch-engine/core/analysis` | Stability scoring, blast radius, graph analysis |
| `@arch-engine/core/parsers` | Topology file parsers (experimental) |

## Schema Contracts

| Schema | Version | Location |
|---|---|---|
| Diagnostic output | `R0-v1` | `schemas/diagnostics/R0-v1.json` |
| Capability descriptor | `v1` | `schemas/descriptors/v1.json` |
| CLI output contract | `R0-v1` | `schemas/cli-output-contract.json` |

## Documentation

- [Preview Scope](docs/contracts/preview-scope.md)
- [Public API Freeze Contract](docs/contracts/public-api-freeze.md)
- [Release Envelope](docs/release/v0.1.0-preview-release-envelope.md)
- [CLI Readiness Matrix](docs/cli/cli-readiness-matrix.md)

## Out of Scope (Preview)

- Production routing enforcement
- Multi-repo federation handshake protocol
- Ecosystem registry marketplace
- Graph database persistence

## License

MIT
