# @arch-engine/core

**Capability-driven architecture topology reasoning engine.**

Validate dependency direction, detect authority boundary violations, score topology stability, and reconcile conflicting graph edges across multiple code scanners.

## Status

**v1.0.0-rc.1** — Deterministic release candidate.

The core execution surface is strictly partitioned between foundational infrastructure invariants and observation tooling.

### Stable Surfaces

- Execution model
- Determinism contract
- Capability model
- Policy-pack participation surface
- Registry federation neutrality
- `closureGraphHash` invariance

### Preview Surface

- **CLI Operator Interface**: The `arch-engine` CLI surface is currently **preview-grade**. It is non-breaking-change tolerant but remains strictly an observation layer and is intentionally **not** part of the deterministic execution identity surface.

### Foundational Contracts

- [Determinism Contract](docs/determinism-contract.md)
- [Execution Model Contract](docs/execution-model.md)
- [Capability Model Contract](docs/capability-model.md)
- [Policy Pack Contract](docs/policy-pack-contract.md)
- [Registry Federation Contract](docs/registry-federation-contract.md)
- [Execution Identity Contract](docs/identity-surface-contract.md)

## Versioning Guarantees

Arch-Engine guarantees the following versioning behaviors natively:

- **`closureGraphHash` stability window** — Strict boundary protection over execution identity mappings.
- **Snapshot replay compatibility expectations** — Cryptographic footprint equality locks reliably.
- **Policy-pack compatibility contract expectations** — Native participation grammar evaluates structurally.
- **Registry mirror neutrality guarantee** — Native transport structures isolate execution state cleanly.
- **Transport independence guarantee** — Cross-host network operations protect deterministic hashes seamlessly.

## Features

- **Deterministic topology governance** — hash-stable identity computation, canonical serialization, snapshot closure graph verification
- **Overlay lifecycle admission** — signature verification, namespace ownership, authority ladder enforcement, revocation propagation
- **Capability federation (F-12)** — deterministic negotiation ordering, descriptor matrix compatibility, mirror equivalence enforcement
- **Diagnostic sovereignty** — categorical-only diagnostics governed by `R0-v1` schema, no numeric weight leakage
- **CLI subsystem** — `doctor`, `inspect`, `check`, `analyze`, `explain` with `--json` deterministic output

## Quick Start

```bash
npm install @arch-engine/core@1.0.0-rc.1
```

```typescript
import { EngineRunner, loadEngineManifest } from "@arch-engine/core";
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

See [examples/multi-policy-composition](examples/multi-policy-composition/) for a two-policy composition example with severity escalation and provenance chains.

See [examples/federation-overlay](examples/federation-overlay/) for cross-registry overlay composition with mirror fallback routing and closure hash parity.

See [examples/signed-policy-pack](examples/signed-policy-pack/) for signature-backed overlay authority enforcement with unsigned rejection and signed acceptance.

See [examples/snapshot-replay-certification](examples/snapshot-replay-certification/) for demonstrating explicit structural graph serialization and subsequent semantic identity checks.

## Export Surface

| Path                         | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `@arch-engine/core`          | Core engine runner, manifest loader, policy system |
| `@arch-engine/core/analysis` | Stability scoring, blast radius, graph analysis    |
| `@arch-engine/core/parsers`  | Topology file parsers (experimental)               |

## Schema Contracts

| Schema                | Version | Location                           |
| --------------------- | ------- | ---------------------------------- |
| Diagnostic output     | `R0-v1` | `schemas/diagnostics/R0-v1.json`   |
| Capability descriptor | `v1`    | `schemas/descriptors/v1.json`      |
| CLI output contract   | `R0-v1` | `schemas/cli-output-contract.json` |

## Execution Determinism

- [Deterministic Execution Contract](docs/determinism-contract.md)
- [Ecosystem Positioning](docs/ecosystem-positioning.md)
- [Public Surface Contract](docs/public-surface-contract.md)
- [Versioning Strategy](docs/versioning-strategy.md)
- [Execution Model Contract](docs/execution-model.md)
- [Capability Model Contract](docs/capability-model.md)
- [Policy Pack Contract](docs/policy-pack-contract.md)
- [Registry Federation Contract](docs/registry-federation-contract.md)
- [Reference Registry Layout](docs/reference-registry-layout.md)
- [Reference Policy Pack Authoring](docs/reference-policy-pack-authoring.md)
- [Reference Policy Pack Example Blueprint](docs/reference-policy-pack-example-blueprint.md)
- [Identity Surface Contract](docs/identity-surface-contract.md)
- [Public Surface Freeze Certificate](docs/public-surface-freeze-certificate.md)
- [CLI Surface Contract](docs/cli-surface-contract.md)
- [CLI Implementation Plan](docs/cli-implementation-plan.md)
- [Release Candidate Tagging Plan](docs/release-candidate-tagging-plan.md)
- [RC Verification Checklist](docs/rc-verification-checklist.md)

## Documentation

- [Preview Scope](docs/contracts/preview-scope.md)
- [Public API Freeze Contract](docs/contracts/public-api-freeze.md)
- [Release Notes](docs/release-notes-v1.0.0-rc.1.md)
- [CLI Readiness Matrix](docs/cli/cli-readiness-matrix.md)

## Examples

- [Reference Policy Pack](examples/reference-policy-pack/)
  - Canonical topology specimen
  - Overlay participation example
  - Authority-tier participation example
  - Snapshot-compatible example
  - Registry-portable example

## Out of Scope (Preview)

- Production routing enforcement
- Multi-repo federation handshake protocol
- Ecosystem registry marketplace
- Graph database persistence

## License

MIT
