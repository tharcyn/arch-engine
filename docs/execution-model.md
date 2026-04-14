# Execution Model Contract — @arch-engine/core

## 1. Purpose of the Execution Model Document

This document defines the semantic execution topology model implemented by `@arch-engine/core`.

It specifically complements existing guarantees established in:
- `determinism-contract.md`
- `public-surface-contract.md`
- `versioning-strategy.md`

By mapping the evaluation flow, this specification establishes what classes of operations occur during a valid pipeline.

## 2. Execution Model Classification

`@arch-engine/core` is a **deterministic policy topology execution substrate.**

It is **NOT**:
- a linter
- a static analyzer
- a rules engine
- a runtime mutation engine

The substrate evaluates strict policy graph structures under authority-tier constraints utilizing a replay-stable merge algebra. It provides mathematical verification that architectural boundaries align structurally against declared limits without triggering out-of-band modifications.

## 3. Execution Pipeline Phases

A valid evaluation cycles through the following deterministic pipeline phases:

1.  **Policy pack discovery:** The environment maps local and remote sources targeting execution eligibility.
2.  **Manifest resolution:** Schema versions are evaluated for execution compatibility bounds.
3.  **Registry provenance routing:** Overlay locations are mapped and metadata lineages are decoded.
4.  **Overlay merge sequencing:** Topological bounds are resolved against base policies mathematically.
5.  **Authority-tier participation filtering:** Trust limits govern which policy overlays are permitted to execute their rule definitions within the graph.
6.  **Topology closure construction:** Active edges and rule activations are compiled structurally.
7.  **`closureGraphHash` identity generation:** A fingerprint of the final semantic execution identity is canonized.

Each phase sequentially contributes to the formation and immutability of the semantic execution identity.

## 4. Policy Graph Structure

The engine execution treats architecture rules identically to graph topologies. 
- Policy packs define graph fragments mapping relationships across domains.
- Overlays inherently modify these graph topologies.
- The underlying merge algebra composes fragments deterministically based on origin.
- The final executed closure graph represents the definitive execution topology against which violations are reported.

## 5. Overlay Merge Algebra

The algebra dictating how graphs converge is strictly defined:
- **Resolved severity escalation:** Conflicts traversing threat interpretations merge deterministically toward defined bounds.
- **Additive rule injection:** Unprecedented rules overlay safely expanding topology scope without breaking backward evaluation state.
- **Suppression structures:** Silenced relationships enforce hard stops across targeted domain nodes.
- **Overlay precedence evaluation:** Depth mapping guarantees ordered stability during graph combination.

The merge algebra MUST be replay-stable and directly participates in the final `closureGraphHash` identity.

## 6. Authority-Tier Lattice

Authority tiers govern isolation blocks defining execution eligibility boundaries based on explicit credentialing. 

Tiers do NOT modify the graph structure directly—instead, they securely control an overlay's participation permission during merge resolution.

Examples of structural trust limits mapping eligibility:
- `LOCAL_POLICY`
- `SIGNED_EXTERNAL_PACK`
- `TRUSTED_POLICY_PACK`

Authority participation is a driving variable affecting `closureGraphHash` identity representation natively.

## 7. Provenance Lineage Model

To maintain federated accountability, `@arch-engine/core` relies on strict `originPolicyChain` lineage tracking tracing authorship sequences natively.

The model ensures:
- Full evaluation of logical authorship depth.
- Strict registry routing neutrality (transport pipelines do not taint logical provenance).
- Strict mirror fallback neutrality (active endpoint variables are stripped from semantics).

Logical provenance lineage explicitly participates in semantic execution identity.

## 8. Closure Graph Identity Model

The `closureGraphHash` represents the exact deterministic execution envelope fingerprint natively compiled during evaluation. 

`closureGraphHash` stability confirms absolute semantic equivalence across all external hosting boundaries. The core invariant enforcing this stability dictates: `transport != semantics`.

## 9. Deterministic Execution Envelope Relationship

As fully structured within the *Deterministic Execution Envelope* sector of `determinism-contract.md`:
Execution identity derives exclusively from envelope-participating inputs. External environment context variables and registry telemetry artifacts are completely excluded from the algorithmic path governing evaluation outputs.

## 10. Snapshot Replay Certification Model

Replay serialization validates closure graph equivalence decoupled from environment noise. 
- Snapshot replay verifies absolute closure graph equivalence.
- Snapshot replay physically proves semantic execution identity preservation.
- Snapshot replay structurally ignores transport-layer metadata differences.

## 11. Federation Execution Compatibility Model

When federated targets execute core architecture evaluation natively:
- Registry mirrors remain functionally safe routing endpoints.
- Cross-repo evaluation execution sequences evaluate securely and independently.
- Signature authenticity gating mechanisms are rigorously respected across remote deployments.
- Overlay packs perform deterministically portable traces across varied platform environments.

## 12. Adapter Capability Participation Model

The engine topology allows modular data sourcing safely because capability adapters expand absolute topology visibility, extending reach without exposing graph evaluation boundaries. 

Capability adapters MUST NOT alter the deterministic execution envelope unless explicitly altering underlying participating graph structures. Observational data proxies function precisely within the adapter boundaries guaranteed by `public-surface-contract.md`.

## 13. Execution Model Guarantees

Executing the core architecture provides categorical adherence to the following formal model guarantees:
1.  Replay-stable overlay merge algebra
2.  Authority-tier participation determinism
3.  Registry routing neutrality
4.  Mirror fallback neutrality
5.  Signature envelope neutrality
6.  `closureGraphHash` identity stability
7.  Snapshot replay portability
