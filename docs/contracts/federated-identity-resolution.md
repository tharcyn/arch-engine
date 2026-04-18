# Federated Topology Identity Resolution Contract

## Overview
This contract defines the immutable rules for resolving semantic and structural identity collisions when Arch-Engine ingests topology graphs from multiple independent providers (e.g., GitHub, GitLab). It ensures that overlapping architectures are accurately modeled without loss of provenance or ambiguity.

## Identity Collision Categories

Federation must distinguish between overlapping structural hashes. We strictly categorize identity collisions as:

- **EXACT_DATASET_REPLAY**: Identical dataset ingested from the same provider. This represents a duplicate configuration and is safely deduplicated without alert.
- **CROSS_PROVIDER_IDENTITY_ALIAS**: Structurally identical dataset submitted via two different providers (e.g. GitHub and GitLab mirroring the exact same commit). The federation accepts this as a canonical node and binds both providers as provenance authorities.
- **DUPLICATE_PROVIDER_DATASET**: A provider attempts to supply two separate but completely structurally identical datasets within a single ingestion cycle. This is rejected to prevent artificial inflation of nodes.
- **UNRESOLVABLE_IDENTITY_COLLISION**: Identical dataset identities containing functionally divergent structural data. This is a fatal collision indicating a cryptographic or source drift issue and will cause ingestion to fail closed.

## Federated Node Identity

Node identity in a federated context relies on a structural hash of the node's properties, independent of its source provider.

1. **Canonical Identity**: A node's canonical identity is derived purely from its immutable metadata (e.g., semantic path, internal module names, exported symbols).
2. **Provenance Accumulation**: If Provider X and Provider Y supply nodes that hash to the exact same canonical identity, the nodes are merged. The resulting single node will maintain a `provenance` array listing both Provider X and Provider Y.
3. **Ambiguity Handling**: If two nodes share the same logical label (e.g., `user-service`) but have different canonical identities, they are treated as strictly distinct entities. They will NOT be merged.

## Federated Edge Identity

Edge identities govern the relationships between nodes across the federation.

1. **Structural Equality**: An edge is defined strictly by the tuple of its `[SourceNodeIdentity, TargetNodeIdentity, EdgeType]`.
2. **Merging Rules**: Duplicate edges matching the exact structural tuple are collapsed into a single edge.
3. **Provenance Annotation**: Similar to nodes, merged edges track their origin via a `provenance` array mapping back to the provider/dataset that observed the link.
4. **Cross-Provider Edges**: An edge can organically connect a node exclusively discovered by Provider X to a node exclusively discovered by Provider Y if their canonical identities align.

## Merge Precedence and Ambiguity Resolution

When a collision occurs that cannot be structurally de-duplicated:

- **Fail-Closed Principle**: Arch-Engine does not guess precedence. If two datasets attempt to declare the same node with divergent internal classifications, the conflict is classified as an `UNRESOLVABLE_IDENTITY_COLLISION` and ingestion fails.
- **No Provider Priority**: Arch-Engine assigns zero implicit priority to any provider (i.e. GitHub does not overrule GitLab).
- **Explicit Provenance**: Deduplicated findings and merged graphs always maintain the union of their origin sources, ensuring zero evidence erasure.
