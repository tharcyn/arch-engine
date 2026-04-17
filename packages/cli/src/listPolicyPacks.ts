import { listPolicyPackMetadata } from './listPolicyPackMetadata.js';

// listPolicyPacks exposes the deterministic governance-pack registry
// enabling CLI discovery and automation compatibility
export async function listPolicyPacks(options?: { useLockfile?: boolean, writeLockfile?: boolean, refreshLockfile?: boolean, diffLockfile?: boolean }): Promise<string[]> {
  const metadata = await listPolicyPackMetadata(options);
  return metadata.map(m => m.policyPackId);
}
