# Multi-Provider Federation Runtime Contract

## Overview

Arch-Engine supports deterministic, multi-provider topology federation. This capability allows the ingestion of disparate datasets (e.g. from GitHub, GitLab, bitbucket) and normalizes them into a unified evaluation execution substrate, all without mutating provider-specific adapter abstractions.

## Ingestion Invariants

- Dataset loading uses deterministic, alphabetical provider ordering.
- `loadFederatedTopologyDatasets` ensures no dataset identity collisions can occur within a single evaluation cycle.
- Schemas across datasets must all adhere to the universally supported `arch_engine_topology_export_v1`.

## Provider Isolation Guarantees

- The merged `FederatedTopologyExecutionContext` maintains a discrete `providers` list outlining `datasetIdentityHash` and specific capabilities per provider.
- `ProviderExecutionContext` completely hides implementation-specific network mechanisms from the evaluation substrate.

## Capability Intersection Semantics

The execution orchestrator synthesizes capability manifests utilizing a strict intersection model:

- `datasetCapabilityIntersection`: Contains ONLY capabilities uniformly supported by all registered providers in the federation context.
- `assessPolicyPackExecutionCompatibility`: Rejects executions if policy packs demand capabilities absent in the intersection, implementing a **fail-closed** multi-provider compatibility check.

## Execution Context Synthesis

The core runtime generates a single, unified `FederatedTopologyExecutionContext`:

- Contains a merged structural representation without duplicating cross-provider elements.
- The derived `federationExecutionHash` relies strictly on deterministic properties: ordered provider identity hashes and ordered intersected capability properties.

## Findings Merge Guarantees

- `mergeFederatedFindings` employs the canonical `NormalizedFindingStructuralHash`.
- If two identical findings are triggered concurrently by overlapping topology representations across datasets, they are structurally deduplicated.
- `authorityBoundaryCrossing` and `mutationClass` metadata are preserved verbatim during deduplication.

## Execution Hash Determinism

The federation execution hash is functionally immutable for the same inputs:
`hash = sha256(executionMode + "datasets:h1,h2" + "capabilities:capA,capB")`
This allows cross-provider CI validation without snapshot variance.
