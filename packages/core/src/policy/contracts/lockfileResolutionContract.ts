export const LOCKFILE_RESOLUTION_CONTRACT_VERSION = 'v1';

export interface LockfileEntry {
  namespace: string;
  id: string;
  lockedVersion: string;
}

/**
 * Lockfile Precedence Rules (v1):
 * - lockfile overrides registry
 * - lockfile overrides SemVer resolution
 * - lockfile overrides manifest dependency ordering
 */
export function resolveWithLockfile(
  namespace: string,
  id: string,
  requestedVersion: string | undefined, // from manifest
  lockfileEntries: LockfileEntry[]
): string | undefined {
  
  // lockfile overrides manifest dependency ordering entirely
  const locked = lockfileEntries.find(e => e.namespace === namespace && e.id === id);
  if (locked) {
    return locked.lockedVersion;
  }

  // fallback to manifest request
  return requestedVersion;
}
