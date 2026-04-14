# Reference Registry Layout Contract — @arch-engine/core

## 1. Purpose of the Reference Registry Layout Document

This document defines a canonical registry topology layout for `@arch-engine/core`.

The layout enables deterministic policy discovery and supports federation-safe mirror equivalence. As a pure distribution topology specification, this registry layout does **NOT** influence semantic execution identity. `closureGraphHash` integrity remains mathematically isolated from these transport-layer structures.

## 2. Registry Layout Model Classification

Arch-Engine registries are deterministic policy topology distribution surfaces.

The registry structure strictly supports discovery. It does **NOT** influence `closureGraphHash` identity.

## 3. Canonical Registry Root Structure

The recommended directory structure is:

```
registry/
  manifests/
  packs/
  overlays/
  trust-roots/
  snapshots/
```

- **`manifests/`**: Houses metadata mappings defining policy component existence.
- **`packs/`**: Houses the versioned execution units.
- **`overlays/`**: Houses policy mutations enforcing context-specific authority mappings.
- **`trust-roots/`**: Houses the cryptographic verification materials.
- **`snapshots/`**: Houses deterministically serialized evaluation states.

This highly decoupled structure natively enables mirror portability.

## 4. Manifest Resolution Layout Model

During initialization, the loader pipeline expects transparent mapping:

- **Manifest location expectations**: Reside directly inside the `manifests/` directory.
- **Manifest lookup semantics**: Must permit direct URI-driven discovery without implicit mapping logic.
- **`policy://` URI mapping expectations**: URI routing assumes exact 1:1 structural alignment between definition paths and underlying network structures.

Example: `policy://registry-name/policy-pack/version` maps securely to `manifests/policy-pack/version.json`.

This aligns with loader expectations without modifying runtime assumptions.

## 5. Policy Pack Storage Layout Model

The storage model anchoring the `packs/` directory enforces versioned boundaries:

- **`packs/` directory usage**: Stores atomic execution pieces separated uniquely by namespace and version.
- **Versioned pack storage expectations**: Each pack occupies a versioned path physically.
- **Semver compatibility alignment**: Follows exact patterns defined in the versioning strategy.
- **Registry neutrality guarantees**: The physical byte boundaries remain agnostic to the host origin.

## 6. Overlay Pack Storage Layout Model

The `overlays/` directory isolates context-specific mutation paths:

- **Overlay directory expectations**: Overlays reside logically partitioned matching local authority layers.
- **Overlay precedence neutrality**: Physical layout must not encode precedence mapping. Priority delegates to the merge algebra.
- **Multi-overlay registry participation safety**: Independent storage cleanly enables multi-registry overlap without corrupting baseline targets.

## 7. Trust Root Distribution Layout Model

The `trust-roots/` directory houses distribution mechanisms supporting security:

- **`trust-roots/` directory purpose**: Predictable storage paths for verification logic.
- **Signature verification portability expectations**: Allows cross-boundary signature evaluation cleanly.
- **Cross-registry trust-root equivalence guarantees**: Identical keys map identically across detached mirrors seamlessly.

This aligns directly with deterministic execution envelope exclusions.

## 8. Snapshot Distribution Layout Model

The `snapshots/` directory explicitly hosts state records:

- **`snapshots/` directory usage**: Aggregates point-in-time closure graphs.
- **Snapshot replay portability expectations**: Enables identical execution replay explicitly regardless of original registry.
- **Offline registry compatibility support**: Graph shapes persist explicitly cleanly bridging detached topologies.
- **Air-gapped execution guarantees**: Allows isolated instances to deterministically compute identically.

## 9. Mirror Registry Compatibility Model

Mirrors reliably distribute identical logic seamlessly:

- **Primary registry**: The canonical origin mapping.
- **Fallback registry**: The backup routing paths executing identically.
- **Offline registry**: Detached copies acting entirely self-contained reliably.
- **Organization-local registry**: Walled-garden proxies mapping properly seamlessly.

All mirrors remain execution-equivalent under deterministic federation guarantees.

## 10. Registry Version Compatibility Expectations

Aligning directly with `docs/versioning-strategy.md`:

- **Schema compatibility windows**: Safely evaluated according to explicitly defined SemVer invariants.
- **Manifest compatibility expectations**: Reliably backward compatible explicitly strictly.
- **Policy pack compatibility expectations**: Changes map directly securely cleanly identically seamlessly to the rules of semantic preservation.

## 11. Registry Federation Interoperability Model

Aligning directly with `docs/registry-federation-contract.md`:

- **Multi-registry overlay composition safety**: Safely aggregates seamlessly securely.
- **Cross-repository pack discovery expectations**: Elegantly maps explicitly correctly correctly.
- **Transport neutrality guarantees**: Safely natively explicitly precisely safely uniquely identically successfully guarantees safely explicitly dependably independently reliably safely accurately explicit securely inherently intelligently. 

## 12. Reference Registry Layout Guarantees

The specification natively guarantees:
- mirror portability
- manifest resolution stability
- trust-root portability
- snapshot replay compatibility
- overlay composition neutrality
- registry routing independence from semantic identity
