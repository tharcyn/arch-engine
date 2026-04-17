import type { PolicyRegistryLockEntry } from './PolicyRegistryLockfile';
import type { PolicyRegistryLockfileDiff } from './PolicyRegistryLockfileDiff';

// Compares resolved remote registry metadata against the pinned
// policy-lock.json snapshot, enabling deterministic governance
// lockfile drift reporting without mutating lockfile state.
export function diffPolicyRegistryLockfile(
  currentEntries: readonly PolicyRegistryLockEntry[],
  lockedEntries: readonly PolicyRegistryLockEntry[]
): PolicyRegistryLockfileDiff {
  const currentMap = new Map<string, string>();
  for (const entry of currentEntries) {
    for (const pack of entry.packs) {
      currentMap.set(pack.policyPackId, JSON.stringify(pack));
    }
  }

  const lockedMap = new Map<string, string>();
  for (const entry of lockedEntries) {
    for (const pack of entry.packs) {
      lockedMap.set(pack.policyPackId, JSON.stringify(pack));
    }
  }

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const id of currentMap.keys()) {
    if (!lockedMap.has(id)) {
      added.push(id);
    } else {
      if (currentMap.get(id) !== lockedMap.get(id)) {
        changed.push(id);
      }
    }
  }

  for (const id of lockedMap.keys()) {
    if (!currentMap.has(id)) {
      removed.push(id);
    }
  }

  return {
    diffSurfaceVersion: "1.0.0",
    addedPacks: added.sort(),
    removedPacks: removed.sort(),
    changedPacks: changed.sort()
  };
}
