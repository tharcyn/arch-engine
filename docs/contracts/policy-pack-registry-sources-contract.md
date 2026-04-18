# Registry Source Resolution Contract

This document formalizes the guarantees for the Arch-Engine Registry Source Resolution subsystem. It governs how the runtime safely discovers, trusts, and aggregates policy pack catalogs across distributed, mirrored, and air-gapped environments.

## 1. Registry Source Descriptors

A Registry Source is fully defined by a deterministic `RegistrySourceDescriptor`. Sources may be:
- `local`: The host filesystem index.
- `filesystem-mirror`: An explicit mounted replica.
- `remote-catalog`: An HTTP/S ecosystem endpoint.
- `offline-snapshot`: An air-gapped, verifiable portable execution artifact.

## 2. Priority & Determinism

When multiple registries are active simultaneously, they are collapsed into a strictly ordered pipeline.
The sorting algorithm is mathematically deterministic and executes as follows:
1. `registrySourcePriority` (Ascending)
2. `registryTrustLevel` (Descending numeric weight)
3. `registrySourceId` (Alphabetical tie-breaker)

## 3. Trust Enforcement & Signature Boundary

Each source declares a required `registryTrustLevel` (`verified-internal`, `verified-ecosystem`, or `unverified`).
If a governance execution run explicitly requires a trust tier, any source failing to meet that tier is deterministically blocked.
Additionally, the `CatalogSignatureVerificationResult` enforces the schema's `signatureRequirement` ('required' vs 'optional'). A catalog failing signature mathematics is instantly dropped to prevent supply-chain poisoning.

## 4. Mirror Fallback Resolution

If a requested policy pack version is missing from a primary catalog, the subsystem initiates `resolveRegistryMirrorFallback`.
**Crucial Safety Guarantee:** If a mirror provides the missing version, the system verifies that the base `manifestHashPerVersion` in the mirror structurally matches the primary's knowledge of the pack base. If the mirror attempts to silently supply a tampered semantic tree for the same pack ID, the fallback is rejected and an explicit `mirrorConflict` is logged.

## 5. Offline Snapshot Support

The `OfflineRegistrySnapshot` contract supports secure, air-gapped execution. A snapshot carries its own source descriptor, catalog manifest, and a mathematically enforced `snapshotHash` tying the payload to an immutable state. Any unauthorized mutation natively invalidates the snapshot upon deserialization.
