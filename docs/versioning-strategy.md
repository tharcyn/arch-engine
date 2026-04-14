# Versioning Strategy Contract — @arch-engine/core

## Purpose of Versioning Strategy

This document establishes the strict versioning boundary contracts governing `@arch-engine/core`. It dictates exactly what constitutes a schema change, how dependencies relate mathematically, and how federation ecosystems can orchestrate migrations without fracturing operational observability.

## Semantic Versioning Model

The engine abides by strict Semantic Versioning 2.0.0 mapping operational identity changes via `MAJOR.MINOR.PATCH` notation.

*   **MAJOR:** A breaking structural schema drift (AST updates) or graph computation invariant change that inherently invalidates historical `closureGraphHash` serialization.
*   **MINOR:** Meaningful expansion of engine API interfaces, capability descriptors, or additive merge algebra rules. Semantic signatures persist across versions.
*   **PATCH:** Deep implementation fixes, performance allocations, and pure regression resolutions completely transparent to the output footprint contract.

## Closure Graph Hash Compatibility Rules

The `closureGraphHash` is the absolute mathematical constant protecting architecture drift.

*   **MAJOR updates trigger graph invalidation:** To prevent compromised semantic resolution matching, major versions declare previously exported closure hashes incompatible logic units.
*   **MINOR and PATCH updates preserve graphs:** Hashes map continuously; the graph geometry remains backwards-compatible explicitly.

## Snapshot Schema Compatibility Window

Snapshot evaluation boundaries must mirror the structural envelope format they were encoded under. 

Evaluation telemetry persists safely inside a compatibility window where deterministic hash logic matches the JSON Schema format deployed originally. Upgraded tooling gracefully accepts minor iterations, while major discontinuities require formal translation or re-generation.

## Manifest Schema Compatibility Expectations

The `Manifest` document drives initial compatibility checks. Pack authors declare specific `"engineVersion"` SemVer blocks to securely enforce what generation of the runtime can legally enact the overlay capabilities natively without undefined fallback behaviors. 

## Adapter Capability Schema Versioning

Adapters declaring functional capabilities explicitly mark metadata through `"capabilityVersion"` flags. The core engine registers compatibility interfaces that gracefully decline requests when an upstream adapter introduces unsupported discovery payloads, maintaining isolation instead of failing globally. 

## Policy Pack Compatibility Guarantees

As long as a pack satisfies its manifest schema bounds against the executing runtime layer, the engine guarantees standard compositional execution. Overlays mapped natively inside `evaluatePolicy` loops perform exactly the identical trace sequence independent of where they were statically injected mapping deterministic resolution.

## Registry Federation Compatibility Expectations

Multi-registry federations operate safely by aligning all mirror targets underneath the synchronized semantic version boundary of the node. As long as nodes share a `MAJOR` execution version, graph inputs and hashes computed globally evaluate cleanly. Drift between central environments and replica paths functions silently without impacting architecture identity.
