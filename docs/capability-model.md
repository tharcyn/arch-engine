# Capability Model Contract — @arch-engine/core

## 1. Purpose of the Capability Model Document

This document defines the topology discovery grammar of `@arch-engine/core`.

It explicitly clarifies that while capability adapters securely expose graph visibility by reading architectures across heterogeneous ecosystems, capability adapters do **NOT** define execution semantics natively.

This specification aligns structurally with:
- `determinism-contract.md`
- `public-surface-contract.md`
- `versioning-strategy.md`
- `execution-model.md`

## 2. Capability Model Classification

`@arch-engine/core` implements a **capability-driven topology discovery substrate.**

Capabilities systematically describe observable topology fragments natively located across language or environment boundaries. True mathematical execution identity derives purely from closure graph resolution, decoupling how paths are observed from what evaluation outputs they produce.

## 3. Capability Adapter Role

Capability adapters specialize in the isolated translation of remote formats into core topology metadata.
- Capability adapters discover graph fragments safely.
- Capability adapters supply topology metadata programmatically.
- Capabilities strictly expand environment visibility without mutating underlying semantic identity.

This delineates a hard functional distinction: **topology discovery** operates observationally outside the bounds of **topology execution**.

## 4. Capability Registry Model

Adapters function across a strict registry lifecycle:
1.  **Capability registration lifecycle:** The host configures authorized discovery proxies at runtime initialization.
2.  **Capability discovery lifecycle:** Registered adapters evaluate remote endpoints mapping localized configurations.
3.  **Capability activation lifecycle:** The core engine admits adapter payload data bounded by rigid schema gates.
4.  **Capability isolation boundaries:** Adapter transport pipelines terminate fully before graph topology evaluation merges.

Due to this structural isolation, registry participation does **not** alter `closureGraphHash` identity whatsoever.

## 5. Capability Negotiation Model

Before exposing localized structure into the core pipeline, the `EngineRunner` predictably negotiates available capabilities.

- `capability_schema` strict structural compatibility enforces payload matching.
- Adapter activation operates functionally conditionally on major and minor compatibility windows mapping backwards-safe guarantees.

This validation pipeline directly abides by the ruleset published in `versioning-strategy.md`.

## 6. Capability Participation Boundary

Adapter inputs are rigidly bounded by their declared capability schema constraints.

Capabilities **MAY**:
- Discover architecture topology endpoints natively
- Annotate topology dependencies structurally
- Expose external dependency edges mapping relationships

Capabilities **MUST NOT**:
- Modify core merge algebra evaluation paths
- Modify the engine's deterministic authority-tier lattice evaluations
- Modify internal `closureGraphHash` serialization inputs dynamically
- Modify the boundaries defining the deterministic execution envelope

## 7. Capability vs Merge Algebra Separation

It is critical to distinguish visibility logic from compilation algebra correctly.

- Capabilities exclusively contribute **topology visibility** by fetching and structuring inputs.
- The core merge algebra exclusively determines **topology composition** natively mapping collision bounds and authority.

This absolute separation guarantees that mathematical execution semantics remain functionally independent from their corresponding observable discovery surfaces natively.

## 8. Capability Federation Model

Because capabilities govern observation paths dynamically and isolate execution payloads seamlessly:
- Capabilities may operate horizontally across linked architecture repositories.
- Capabilities may operate continuously across multi-tenant registries.
- Capabilities may operate efficiently computing across varied language boundaries securely parsing local source trees.

Crucially, capabilities remain absolutely transport-neutral, guaranteeing safe multi-node federation discovery structurally across mirrored endpoints natively.

## 9. Capability Version Compatibility Model

Adapter version negotiations secure topology reliability:
- Core validation mandates rigid `capability_schema` compatibility expectations natively.
- Forward compatibility window behavior evaluates backwards-safe capability version footprints correctly protecting legacy adapters.
- Adapter negotiation fallback safety isolates degraded network endpoints preventing cross-environment failure propagation natively.

For deep schema compatibility boundaries affecting discovery interfaces, reference `versioning-strategy.md`.

## 10. Capability Safety Boundary

Adapter capabilities mechanically cannot alter mathematical semantic execution identity natively unless injecting graph structure payloads explicitly during their observation cycles.

According to the **Deterministic Execution Envelope** definitions established in `determinism-contract.md`:
Discovery paths isolate endpoints. `discovery != execution participation`. Simply evaluating the route an overlay took via adapter translation mathematically bypasses inclusion inside evaluating execution graph hash serialization logic.

## 11. Capability Extension Model

Third-party adapter-pack participation functions identically to first-party internal parsing logic natively:
- Capability layering sequentially targets isolated data planes without corrupting unified interfaces securely.
- Adapter composition guarantees multiple language-specific tooling chains interoperate without mutual payload corruption natively.

These strict boundaries provide safe external extension surface guarantees permitting robust ecosystem development securely.

## 12. Capability Model Guarantees

Mapping this model enforces the following execution properties natively:
1.  Topology discovery isolation
2.  Deterministic execution identity protection
3.  Registry neutrality preservation
4.  Adapter compatibility negotiation safety
5.  Cross-repository discovery stability
6.  Federation-safe adapter participation
