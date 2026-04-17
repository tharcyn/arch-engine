export interface PolicyRegistryLockfileDiff {
  readonly diffSurfaceVersion: "1.0.0";
  readonly addedPacks: readonly string[];
  readonly removedPacks: readonly string[];
  readonly changedPacks: readonly string[];
}
