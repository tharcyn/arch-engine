# Bundle Publishing Protocol Contract

The Bundle Publishing Protocol extends the `.archpack` portable format with a deterministic lifecycle. It ensures that an executed governance environment can be traced back mathematically to its builder, promoted across deployment environments reliably, and propagated across mirrors without fear of silent catalog corruption.

## 1. Provenance Lineage Embedding

Every `.archpack` manifest implicitly carries its lineage. A bundle doesn't just know what it *is*, but where it *came from*.
- `builderIdentity` and `builderVersion` specify the compiling entity.
- `sourceCatalogSetHash` and `sourceRegistrySetHash` lock the environmental reality the bundle was built against.
- `federationExecutionHash` locks the multi-provider topology scope.

## 2. Registry Upload Handshake

Before a bundle is permitted to mutate a catalog, it must negotiate the `performBundleRegistryUploadHandshake`.
- It evaluates the `publishStrategy` (`append-only`, `replace-if-hash-match`).
- It strictly enforces the `signatureRequirement`. A required signature rejection permanently drops the upload.

## 3. Deterministic Catalog Mutation

Catalogs are immutable between discrete updates. `mutateRegistryCatalogDeterministically` is completely replay-safe.
When a bundle is merged into a catalog, its `bundleDependencyGraphHash` is bound tightly to the resulting version entry in the catalog, preventing a published version from shifting its dependency requirements without a formal version bump.
The catalog is then deterministically sorted (alphabetically, then semver-descending) and its `catalogHash` recomputed.

## 4. Promotion Ladders

The `resolveBundlePromotionStage` contract dictates how bundles move across environments (`development` -> `staging` -> `verified` -> `production`). High-tier stages automatically invoke strict signature checks, preventing unsigned artifacts from polluting secure deployment pipelines.

## 5. Mirror Propagation

`propagateBundleAcrossMirrors` synchronizes a newly published bundle to replica registries. It enforces `registryTrustLevel` strictly—if a mirror is deemed `unverified`, propagation drops automatically.

## 6. Offline Snapshot Export

`exportOfflineRegistrySnapshot` integrates seamlessly with publishing, allowing the system to package the newly mutated catalog and its source definition into an air-gap safe `.json` snapshot for consumption in locked-down networks.
