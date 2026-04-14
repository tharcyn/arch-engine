# Arch-Engine

[![npm version](https://img.shields.io/npm/v/@arch-engine/cli.svg)](https://www.npmjs.com/package/@arch-engine/cli)
[![Build Status](https://github.com/tharcyn/arch-engine/actions/workflows/test.yml/badge.svg)](https://github.com/tharcyn/arch-engine/actions)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)]()
[![License](https://img.shields.io/npm/l/@arch-engine/cli.svg)](https://github.com/tharcyn/arch-engine/blob/main/LICENSE)

**Architecture topology governance runtime.**

Arch-Engine extracts dependency structure from real repositories, constructs topology graphs, and enforces architecture policy packs across package boundaries. It detects authority crossings, scores topology stability, and produces deterministic, snapshot-reproducible results.

Arch-Engine extracts dependency topology from real repositories,
constructs deterministic architecture graphs,
and enforces composable governance policy packs over that structure.
It operates as a runtime substrate for architecture reasoning —
not a linter, build system, or static rule engine.

## Status

Arch Engine follows semantic versioning.
1.x releases maintain CLI compatibility guarantees across adapters and governance packs.

## Quickstart (1 minute)

```bash
npm install @arch-engine/cli
npm install @arch-engine/adapter-monorepo
npx arch-engine doctor
```

### Example output

```
✔ Workspace type resolved as: single (highest confidence)
✔ Packages detected: 1 / 1 expected
✔ Connected nodes: 1
✔ Coverage: 100%
✔ Connectivity: 100%
✔ Confidence: HIGH (Structured single workspace extraction)
✔ Authority crossings observed: 0
```

**Reading the output:**

- **Coverage** — Percentage of repository nodes extracted into the topology graph.
- **Connectivity** — Whether dependency relationships resolved into a coherent graph.
- **Confidence** — Extraction confidence based on workspace detection and adapter signal strength.
- **Authority crossings** — Architectural boundary violations between layers or domains.

See the [CLI README](packages/cli/README.md) for detailed signal interpretation.

## What makes Arch-Engine different?

Arch-Engine is not a linter, static analyzer, or config validator. It operates on **topology** — the structural dependency graph of your repository — rather than individual files or syntax trees.

| Capability | Arch-Engine | Linters / Static Analyzers |
| --- | --- | --- |
| **Operates on** | Package dependency topology | Individual files / ASTs |
| **Policy model** | Composable policy packs | Rule configs |
| **Execution** | Deterministic (`closureGraphHash` stable) | Non-deterministic |
| **Snapshot replay** | Supported — byte-stable across environments | Not applicable |
| **Architecture extraction** | Adapter-driven (npm, yarn, pnpm workspaces) | Manual config |
| **Federation** | Overlay composition across registry boundaries | Not applicable |

## Packages

Arch-Engine ships as a constellation of focused packages. The **core runtime** is the only required install — adapters and governance packs are **optional extensions**.

| Package | Role | Version |
| --- | --- | --- |
| [@arch-engine/schema](./packages/schema) | Canonical schema contracts and shared types | `1.0.0-rc.3` |
| [@arch-engine/core](./packages/core) | Topology reasoning runtime | `1.0.0-rc.3` |
| [@arch-engine/cli](./packages/cli) | Command-line interface | `1.0.0-rc.3` |
| [@arch-engine/adapter-monorepo](./packages/adapter-monorepo) | _(Optional)_ Workspace topology extraction | `1.0.0-rc.4` |
| [@arch-engine/governance-pack-authority](./packages/governance-pack-authority) | _(Optional)_ Authority boundary governance | `1.0.0-rc.4` |
| [@arch-engine/governance-pack-rest-contract](./packages/governance-pack-rest-contract) | _(Optional)_ REST contract parity governance | `1.0.0-rc.4` |
| [@arch-engine/governance-pack-journey](./packages/governance-pack-journey) | _(Optional)_ Journey lifecycle governance | `1.0.0-rc.4` |

### Install

```bash
# Core runtime (required)
npm install @arch-engine/core

# CLI
npm install @arch-engine/cli

# Optional: workspace topology extraction
npm install @arch-engine/adapter-monorepo

# Optional: governance packs
npm install @arch-engine/governance-pack-authority
npm install @arch-engine/governance-pack-rest-contract
npm install @arch-engine/governance-pack-journey
```

## Architecture layering model

```
      @arch-engine/schema
               ↓
       @arch-engine/core
               ↓
        @arch-engine/cli
               ↓
  adapter capability layer
               ↓
governance policy pack layer
```

**Layer responsibilities:**

- **schema** — Defines canonical contracts and shared topology structures.
- **core** — Executes architecture reasoning and dependency graph construction.
- **cli** — Provides developer-facing execution surface for topology diagnostics and validation.
- **adapters** — Extend topology extraction by detecting workspace structure and dependency signals.
- **governance packs** — Apply architecture policy rules to validate boundaries, contracts, and system invariants.

Adapters and governance packs are optional extensions that increase topology signal quality and enforcement coverage without modifying core runtime behavior.

## Features

- **Topology extraction** — Adapter-driven workspace detection for npm, yarn, and pnpm monorepos
- **Dependency graph governance** — Authority boundary detection, blast radius scoring, connectivity analysis
- **Policy pack composition** — Multiple packs compose deterministically with provenance chains
- **Deterministic execution** — Hash-stable identity computation, canonical serialization, snapshot verification
- **Federation overlays** — Cross-registry policy composition with mirror fallback and trust-tier enforcement
- **CLI diagnostics** — `doctor`, `inspect`, `check`, `analyze`, `explain` with `--json` output

## Extending Arch-Engine with policy packs

Policy packs are optional governance overlays that enforce architecture contracts on top of the extracted topology graph. They do not modify runtime behavior.

```bash
npm install @arch-engine/governance-pack-authority
```

Key properties:

- **Composable** — Multiple packs compose deterministically with severity escalation and provenance chains.
- **Structural** — Packs operate on topology relationships, not file-level syntax.
- **Optional** — Core extraction and analysis work without any packs installed.
- **Deterministic** — Policy evaluation produces identical output across environments.

See the [Policy Pack Contract](docs/policy-pack-contract.md) and [Reference Policy Pack Authoring](docs/reference-policy-pack-authoring.md) for authoring guidance.

## Snapshot replay and execution determinism

Arch-Engine guarantees deterministic execution. The `closureGraphHash` provides a cryptographic fingerprint of the full topology evaluation, ensuring:

- **Snapshot replay** — Captured evaluation output is byte-stable across runs and environments.
- **Lineage integrity** — Hash identity is preserved through policy composition and federation overlays.
- **Transport independence** — Results remain stable regardless of registry routing path.

See the [Determinism Contract](docs/determinism-contract.md) and [Identity Surface Contract](docs/identity-surface-contract.md).

## Examples

- [Sample Monorepo Topology Extraction](docs/examples/sample-monorepo-topology.md)
  - 3-package workspace with adapter-driven extraction walkthrough
- [Reference Policy Pack](examples/reference-policy-pack/)
  - Canonical topology specimen, overlay participation, authority-tier enforcement
- [Multi-Policy Composition](examples/multi-policy-composition/)
  - Severity escalation, provenance chains, composition hash stability
- [Federation Overlay](examples/federation-overlay/)
  - Cross-registry composition, mirror fallback, closure hash parity
- [Signed Policy Pack](examples/signed-policy-pack/)
  - Cryptographic authority enforcement, unsigned rejection
- [Snapshot Replay Certification](examples/snapshot-replay-certification/)
  - Structural hash reproducibility, execution identity portability

## Export Surface

| Path                         | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `@arch-engine/core`          | Core engine runner, manifest loader, policy system |
| `@arch-engine/core/analysis` | Stability scoring, blast radius, graph analysis    |
| `@arch-engine/core/parsers`  | Topology file parsers (experimental)               |

## Documentation

- [Determinism Contract](docs/determinism-contract.md)
- [Execution Model Contract](docs/execution-model.md)
- [Capability Model Contract](docs/capability-model.md)
- [Policy Pack Contract](docs/policy-pack-contract.md)
- [Registry Federation Contract](docs/registry-federation-contract.md)
- [Identity Surface Contract](docs/identity-surface-contract.md)
- [Public Surface Contract](docs/public-surface-contract.md)
- [CLI Surface Contract](docs/cli-surface-contract.md)
- [Versioning Strategy](docs/versioning-strategy.md)
- [Ecosystem Positioning](docs/ecosystem-positioning.md)
- [Release Notes — v1.0.0-rc.3](docs/releases/v1.0.0-rc.3.md)

## Repository structure

```
packages/     Runtime packages (schema, core, cli, adapters, governance packs)
examples/     Self-contained topology extraction and policy composition examples
docs/         Architecture contracts, specifications, and release notes
scripts/      Internal maintenance tooling (not part of runtime surface)
schemas/      JSON schema definitions for diagnostic output and descriptors
```

## Out of Scope (Preview)

- Production routing enforcement
- Multi-repo federation handshake protocol
- Ecosystem registry marketplace
- Graph database persistence

## License

MIT
