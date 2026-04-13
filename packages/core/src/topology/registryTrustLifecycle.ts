import { RegistryTrustRoot, resolveRegistryTrustRoot, registerTrustRoot } from './registryTrustStore.js';

export interface TrustRootRotationEvent {
  trustRootId: string;
  replacedBy?: string;
  revoked?: boolean;
  timestamp: string;
}

const rotationHistory: TrustRootRotationEvent[] = [];

/**
 * Register a trust root rotation. In-memory local model only for F-8.
 */
export function registerTrustRootRotation(event: TrustRootRotationEvent): void {
  rotationHistory.push(event);

  // If this revokes a currently active root but does not replace it in the registry adapter layer,
  // we could mutate the actual trust store here. But for now we just record it.
  const root = Array.from(getAllTrustRoots()).find(r => r.trustRootId === event.trustRootId);
  if (root && event.revoked) {
      registerTrustRoot({
          ...root,
          revokedAt: event.timestamp
      });
  }
}

// Internal helper for this local POC
function getAllTrustRoots(): RegistryTrustRoot[] {
    // In actual implementation we may expose `getAll()` on trust store, but for F-8 
    // registry IDs are 'core', 'official', 'partner', 'external'.
    const res = [];
    for (const r of ['core', 'official', 'partner', 'external']) {
        const root = resolveRegistryTrustRoot(r);
        if (root) res.push(root);
    }
    return res;
}

export function resolveActiveTrustRoot(registryId: string): RegistryTrustRoot | undefined {
  const root = resolveRegistryTrustRoot(registryId);
  if (!root) return undefined;
  
  if (root.revokedAt) {
      return undefined; // Active means non-revoked
  }
  return root;
}

export function resolveHistoricalTrustRoot(registryId: string): RegistryTrustRoot | undefined {
  return resolveRegistryTrustRoot(registryId); // Raw returns revoked roots too
}
