import { PolicyStackEntry } from '../policy/types.js';

export const COMPOSITION_TIER_RESOLVER_VERSION = 'v1';

export type ResolutionTier = 'root' | 'direct' | 'transitive' | 'registry' | 'unknown';

export interface TierResolution {
  policyId: string;
  namespace: string;
  originalDepth: number;
  stackIndex: number;
  tier: ResolutionTier;
}

export type ResolvedTierMap = Record<string, TierResolution>;

/**
 * Phase 5 Objective 2: Composition Tier Resolver
 *
 * Uses explicit loader-provided execution metadata to calculate tier arbitration values.
 * Resolves each node's scope logically without re-traversing or mutating the sealed topology.
 */
export class TierResolver {
  private resolvedTierMap: ResolvedTierMap = {};
  private tierArbitrationOrdering: string[] = [];

  constructor(private entries: PolicyStackEntry[], private rootEntry: PolicyStackEntry) {}

  public resolve(): { resolvedTierMap: ResolvedTierMap; tierArbitrationOrdering: string[] } {
    const sortedEntries = [...this.entries].sort((a, b) => {
      const idxA = a.executionMetadata?.stackIndex ?? 99999;
      const idxB = b.executionMetadata?.stackIndex ?? 99999;
      return idxA - idxB;
    });

    for (const entry of sortedEntries) {
      const depth = entry.executionMetadata?.dependencyDepth ?? -1;
      const stackIndex = entry.executionMetadata?.stackIndex ?? -1;
      const key = `${entry.policyNamespace || ''}/${entry.policyId}`;

      let tier: ResolutionTier = 'unknown';

      if (depth === 0) tier = 'root';
      else if (depth === 1) tier = 'direct';
      else if (depth > 1) tier = 'transitive';
      else if (depth === -1) tier = 'registry'; // Unlinked or fallback? Should not be possible with verified topology

      this.resolvedTierMap[key] = {
        policyId: entry.policyId,
        namespace: entry.policyNamespace || '',
        originalDepth: depth,
        stackIndex,
        tier
      };

      this.tierArbitrationOrdering.push(key);
    }

    return {
      resolvedTierMap: this.resolvedTierMap,
      tierArbitrationOrdering: this.tierArbitrationOrdering
    };
  }
}
