# Policy Pack Bundle Format Contract

The `.archpack` file is the definitive unit of portable governance in the Arch-Engine ecosystem. It encapsulates an entire policy execution state into a single, offline-capable, signed artifact.

## 1. Bundle Identity & Snapshot Stability

A bundle is identified not just by a name, but by the cryptographic hashes of its internal boundaries:
- `bundleManifestHash`
- `bundleDependencyGraphHash`
- `bundleCapabilitySnapshotHash`
- `bundleDatasetCompatibilitySnapshotHash`
- `bundleExecutionModeSnapshotHash`

If an execution environment's capability intersection or dataset schema diff deviates from these locked hashes, the bundle loader deterministically refuses to execute.

## 2. Dependency Closure Integrity

Bundles do not perform range resolution at runtime. The `buildPolicyPackBundle` process executes full `SemVer` resolution against available registries, compiles the dependency graph closure, and statically encodes the exact `includedPolicyPacks` directly into the bundle payload.

## 3. Cryptographic Signature Boundary

Bundles support a mathematical signature boundary. The `verifyPolicyPackBundleSignature` contract ensures that a bundle originating from an organization registry can be mathematically validated for integrity prior to payload deserialization, thwarting supply-chain corruption.

## 4. Offline & Air-Gapped Execution

By embedding the entire closure and payload base64 strings into the format, the `loadPolicyPackBundle` runtime requires absolute zero network calls. This allows organizations to move `.archpack` files securely across air-gapped CI boundaries.

## 5. Lockfile Compatibility

A loaded bundle must mathematically agree with the `arch-engine.lock.json` lockfile of the target environment. `verifyBundleLockfileCompatibility` prevents a properly signed but semantically out-of-date bundle from overwriting the expected execution semantics of the repository.
