export const REGISTRY_RESOLUTION_CONTRACT_VERSION = 'v1';

export type RegistryCandidateSource = 'lockfile' | 'explicit_namespace' | 'default_registry' | 'mirror_registry';

export interface RegistryResolutionCandidate {
  uri: string;
  source: RegistryCandidateSource;
  resolvedNamespace: string;
}

/**
 * Registry Resolution Precedence Rules (v1):
 * 1. lockfile registry binding first
 * 2. explicit namespace registry mapping second
 * 3. default registry fallback third
 * 4. mirror registry fallback last
 * 
 * Never allow:
 * - filesystem order selection
 * - network latency selection
 * - timestamp ordering
 * - random candidate selection
 * - registry response order selection
 */
export function resolveRegistryCandidate(
  candidates: RegistryResolutionCandidate[]
): RegistryResolutionCandidate | null {
  
  if (candidates.length === 0) return null;

  const ranks: Record<RegistryCandidateSource, number> = {
    'lockfile': 1,
    'explicit_namespace': 2,
    'default_registry': 3,
    'mirror_registry': 4
  };

  const sorted = [...candidates].sort((a, b) => {
    return ranks[a.source] - ranks[b.source];
  });

  return sorted[0] || null;
}
