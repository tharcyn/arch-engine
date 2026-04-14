# Public Surface Contract — @arch-engine/core

## Purpose of Public Surface Contract

This document explicitly defines the boundaries separating `@arch-engine/core`'s stable public dependencies from its non-contractual internal mechanisms. It outlines precisely what upstream integrations MAY safely rely upon versus what they MUST NOT rely upon during execution, assuring safe, federation-ready ecosystem extensions.

## Stable Export Surface

Downstream consumers **MAY** safely depend on the following modules from the top-level barrel export:

*   **`evaluatePolicy`:** Core evaluation harness interface.
*   **`captureExecutionSnapshot` / `loadSnapshot`:** Artifact serialization boundaries.
*   **`verifyExecutionSemanticParity`:** Hash parity utilities.
*   **Type Signatures:** All exported interfaces matching the namespace (`PolicyConfig`, `Manifest`, `ArchDiagnostic`, etc.).

Guaranteed properties of these exports:
*   Signatures will not break backwards compatibility within a major schema version.
*   Execution logic will preserve output deterministic formats.

## Internal (Non-Contract) Modules

Downstream consumers **MUST NOT** directly import from paths deep inside `packages/core/src/` (e.g., `import { X } from '@arch-engine/core/src/topology/...'`).

These internal surfaces carry zero stability guarantees:
*   Graph manipulation iterators (`computeStackTopologicalOrder.ts`)
*   Seam resolution execution stages (`resolveOverlayAuthority.ts`)
*   Underlying cryptographic routines outside the public validator interfaces

> Reaching out-of-bounds into internal modules forfeits determinism guarantees.

## Adapter-Safe Extension Points

Engine adapters (like custom loaders, filesystem proxies, or external registry fetchers) hook into standard capability negotiation mechanisms. 

### Adapter Capability Negotiation Boundary

Capability adapters **MAY** safely extend discovery surface (e.g., teaching the engine how to fetch `.yaml` instead of `.json` via a new loader configuration).

However, capability adapters **MUST NOT** alter:

*   `closureGraphHash` inputs
*   `authorityTier` lattice semantics
*   Overlay merge algebra behavior
*   `originPolicyChain` lineage semantics

> **Adapter negotiation expands observability, not semantic execution identity.** This strict constraint protects ecosystem plugins from accidentally or maliciously violating the deterministic execution contract that downstream CI pipelines rely upon.

## Policy Pack Compatibility Boundary

`@arch-engine/core` uses strict version targeting through semantic strings found inside policy pack `manifest.json` files.

Policy packs executing within a compatible engine bracket will evaluate with complete deterministic stability. If the engine detects a major drift where stability definitions are no longer upheld mathematically, evaluation will safely abort rather than execute unpredictably.

## Snapshot Compatibility Guarantees

As documented in the [Deterministic Execution Contract](determinism-contract.md), snapshots represent a sealed semantic output for a specific evaluation node environment.

Snapshots evaluated cleanly inside the current CLI architecture will maintain their mathematical hash fingerprint indefinitely, *provided* the structural schema version evaluates compatibly.

## CLI Compatibility Expectations

For host systems orchestrating execution (typically via the upstream Arch-Engine CLI), the `stdout` JSON emission schema (`schemas/cli-output-contract.json`) serves as the strict programmatic contract. 

Engine-level modifications will not disrupt the shape of this JSON interface without triggering a schema major release. Standard-error telemetry (`stderr`) retains observational logs but holds no deterministic shape guarantees.

## Schema Versioning Guarantees

All metadata schema definitions (Manifests, Policy Contracts, Topology Descriptors, Diagnostic Traces) are subject to rigid, versioned lifecycle controls. Extensibility fields within definitions process strictly through validated schema boundaries. 

The core engine does NOT support structural data mutation that bypasses active JSON Schema declarations.

## Freeze-Surface Verification Guarantees

The engine utilizes precision freeze guards to structurally ensure determinism across releases.

These freeze guards enforce stability of the following parameters:
*   Export surface typings
*   Snapshot schema boundaries
*   Loader manifest compatibility 
*   `closureGraphHash` invariants

By anchoring these capabilities mathematically via unit snapshots, freeze verification prevents accidental semantic surface drift — while intentionally refraining from restricting additive ecosystem extensions inside new schema envelopes.
