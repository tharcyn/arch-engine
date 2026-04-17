# Arch-Engine

[![npm version](https://img.shields.io/npm/v/@arch-engine/cli.svg)](https://www.npmjs.com/package/@arch-engine/cli)
[![Build Status](https://github.com/tharcyn/arch-engine/actions/workflows/test.yml/badge.svg)](https://github.com/tharcyn/arch-engine/actions)
[![Coverage](https://img.shields.io/badge/tests-915%20passed-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/tharcyn/arch-engine/blob/main/LICENSE)

Architecture governance runtime for real codebases.

Arch-Engine extracts structural relationships directly from source code and enables enforcement of architectural rules via policy packs — automatically, deterministically.

```
Code → Graph Extraction → Capability Adapters → Policy Packs → Diagnostics
```

> **Safe diagnostic runtime.** No source files modified. No dependencies mutated. Fully offline. Creates a local `.arch-engine/` context directory on first run.

---

## Quickstart

```bash
npm install @arch-engine/cli
npx arch-engine doctor
```

```
✔ Topology extracted successfully
✔ Workspace type resolved as: single (highest confidence)
✔ Packages detected: 1 / 1 expected
✔ Connected nodes: 1
✔ Coverage: 100%
✔ Connectivity: 100%
✔ Confidence: HIGH (Structured single workspace extraction)
✔ Authority crossings observed: 0
```

With a governance pack installed, the engine can detect boundary violations:

```
Detected authority boundary crossing:
  frontend → database mutation layer

Suggested policy:
  enforce service isolation boundary
```

**Reading the output:**

- **Coverage** — Percentage of repository nodes extracted into the topology graph.
- **Connectivity** — Whether dependency relationships resolved into a coherent graph.
- **Confidence** — Extraction confidence based on workspace detection and adapter signal strength.
- **Authority crossings** — Architectural boundary violations between layers or domains.

See the [CLI Surface Contract](docs/cli-surface-contract.md) for full signal interpretation.

---

## How Arch-Engine differs from ESLint, OPA, and Bazel

Arch-Engine is not a linter, config validator, or build system. It operates on **topology** — the structural dependency graph of your repository — rather than individual files, syntax trees, or build targets.

| Tool | Operates on | Purpose |
| --- | --- | --- |
| **ESLint** | Individual files / ASTs | Syntax rules, code style |
| **OPA** | Arbitrary data + Rego policy | General-purpose policy evaluation |
| **Bazel** | Build graph / action cache | Build orchestration, hermetic builds |
| **Arch-Engine** | Package dependency topology | Architecture enforcement, boundary governance |

Arch-Engine extracts the real structural relationships in your codebase and evaluates architecture policies against them. Linters check syntax. Build systems manage output. Arch-Engine governs structure.

---

## CLI commands

| Command | Purpose |
| --- | --- |
| `arch-engine doctor` | Full topology health diagnostic with confidence scoring |
| `arch-engine inspect` | Topology graph extraction and structural analysis |
| `arch-engine check` | Policy evaluation against extracted topology |
| `arch-engine analyze` | Blast radius and stability scoring |
| `arch-engine explain` | Human-readable architecture reasoning output |

All commands support `--json` for machine-readable CI integration. Exit codes reflect diagnostic status.

---

## Packages

Arch-Engine ships as a constellation of focused packages. The **core runtime** is the only required install — adapters and governance packs are optional extensions.

| Package | Role |
| --- | --- |
| [@arch-engine/schema](./packages/schema) | Canonical schema contracts and shared types |
| [@arch-engine/core](./packages/core) | Topology reasoning runtime |
| [@arch-engine/cli](./packages/cli) | Command-line interface |
| [@arch-engine/adapter-monorepo](./packages/adapter-monorepo) | Workspace topology extraction (npm, yarn, pnpm) |
| [@arch-engine/governance-pack-authority](./packages/governance-pack-authority) | Authority boundary governance |
| [@arch-engine/governance-pack-rest-contract](./packages/governance-pack-rest-contract) | REST contract parity governance |
| [@arch-engine/governance-pack-journey](./packages/governance-pack-journey) | Journey lifecycle governance |

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

### Architecture layering

```
      @arch-engine/schema           ← canonical contracts
               ↓
       @arch-engine/core            ← topology reasoning runtime
               ↓
        @arch-engine/cli            ← developer-facing surface
               ↓
  adapter capability layer          ← workspace detection (optional)
               ↓
governance policy pack layer        ← architecture enforcement (optional)
```

---

## Provider Adapter Architecture

Arch-Engine includes a provider adapter layer designed to automatically propose architectural policy updates directly to version control providers via Pull/Merge Requests.

- **GitHub Adapter** (`@arch-engine/adapter-github`) — Complete and fully operational.
- **GitLab Adapter** (`@arch-engine/adapter-gitlab`) — Planned next.

### Adapter Execution Contract
All adapters consume a provider-neutral JSON payload containing the cryptographic identity, proposed commits, and integrity hashes. They operate entirely off this JSON payload rather than local filesystem state, making them highly portable across CI pipelines.

By default, all adapters operate in **dry-run** mode. They will validate payloads, verify the runtime repository context, and format a deterministic execution plan, but will **not** execute mutative network calls unless explicitly permitted with `--execute` and a valid provider token.

### Execution-Result Telemetry
Adapters return a highly structured `AdapterExecutionResultBase` providing explicitly boolean flags for `branchCreated`, `branchReused`, `pullRequestCreated`, and a single unified `adapterOutcome` signal (`dry-run`, `refused`, `pr-created`, `pr-reused`). This allows CI pipelines to make deterministic decisions without complex log parsing.

```bash
# Example: Pipe a deterministic patch payload into the GitHub adapter
arch-engine policies emit-policy-pr --json | arch-engine github create-policy-pr --execute --json-output-plan
```

For a deeper dive into the adapter substrate, see [Provider Adapter Architecture](docs/architecture/adapters.md).

---

## Built-in policy packs

Policy packs are optional governance overlays that enforce architecture contracts against the extracted topology graph. They do not modify runtime behavior or source code.

| Pack | Enforces |
| --- | --- |
| **authority** | Authority boundary violations between architectural layers |
| **rest-contract** | REST contract parity across service interfaces |
| **journey** | Journey lifecycle regression detection across system flows |

Policy packs are composable. Multiple packs evaluate deterministically with severity escalation and provenance chains.

See the [Policy Pack Contract](docs/policy-pack-contract.md) for authoring guidance.

---

## Snapshot replay and determinism

Arch-Engine guarantees deterministic execution. The `closureGraphHash` provides a cryptographic fingerprint of the full topology evaluation:

- **Snapshot replay** — Evaluation output is byte-stable across runs and environments.
- **Lineage integrity** — Hash identity is preserved through policy composition and federation overlays.
- **Transport independence** — Results remain stable regardless of registry routing path.

See the [Determinism Contract](docs/determinism-contract.md) and [Identity Surface Contract](docs/identity-surface-contract.md).

---

## Export surface

| Path | Description |
| --- | --- |
| `@arch-engine/core` | Core engine runner, manifest loader, policy system |
| `@arch-engine/core/analysis` | Stability scoring, blast radius, graph analysis |
| `@arch-engine/core/parsers` | Topology file parsers (experimental) |

---

## Examples

| Example | Demonstrates |
| --- | --- |
| [Reference Policy Pack](examples/reference-policy-pack/) | Canonical topology specimen, authority-tier enforcement |
| [Multi-Policy Composition](examples/multi-policy-composition/) | Severity escalation, provenance chains, composition hash stability |
| [Federation Overlay](examples/federation-overlay/) | Cross-registry composition, mirror fallback, closure hash parity |
| [Signed Policy Pack](examples/signed-policy-pack/) | Cryptographic authority enforcement, unsigned rejection |
| [Snapshot Replay Certification](examples/snapshot-replay-certification/) | Structural hash reproducibility, execution identity portability |

---

## Documentation

| Document | Scope |
| --- | --- |
| [CLI Surface Contract](docs/cli-surface-contract.md) | Command semantics, exit codes, output format |
| [Execution Model](docs/execution-model.md) | Runtime lifecycle, adapter resolution, policy evaluation |
| [Capability Model](docs/capability-model.md) | Adapter architecture, signal enrichment |
| [Policy Pack Contract](docs/policy-pack-contract.md) | Pack structure, composition rules, severity model |
| [Determinism Contract](docs/determinism-contract.md) | Hash stability, snapshot replay guarantees |
| [Identity Surface Contract](docs/identity-surface-contract.md) | Graph identity, lineage verification |
| [Public Surface Contract](docs/public-surface-contract.md) | Export stability, API freeze policy |
| [Registry Federation Contract](docs/registry-federation-contract.md) | Cross-registry composition, mirror fallback |
| [Versioning Strategy](docs/versioning-strategy.md) | Semantic versioning policy |
| [Ecosystem Positioning](docs/ecosystem-positioning.md) | Relationship to existing tools |
| [Release Notes — v1.0.0](docs/releases/v1.0.0.md) | Stable release details |

---

## Repository structure

```
packages/
  schema/                    Canonical schema contracts and shared types
  core/                      Topology reasoning runtime
  cli/                       Command-line interface
  adapter-monorepo/          Workspace topology extraction adapter
  governance-pack-authority/  Authority boundary governance pack
  governance-pack-rest-contract/  REST contract parity governance pack
  governance-pack-journey/   Journey lifecycle governance pack
examples/                    Self-contained topology and policy composition examples
docs/                        Architecture contracts, specifications, release notes
schemas/                     JSON schema definitions for diagnostic output
scripts/                     Internal maintenance tooling (not part of runtime surface)
site/                        Landing page (arch-engine.dev)
```

---

## Status

Arch Engine follows semantic versioning. 1.x releases maintain CLI compatibility guarantees across adapters and governance packs.

## Out of scope

- Production routing enforcement
- Multi-repo federation handshake protocol
- Ecosystem registry marketplace
- Graph database persistence

## License

[MIT](LICENSE)
