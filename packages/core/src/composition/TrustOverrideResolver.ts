import { PolicyStackEntry } from '../policy/types.js';
import { ResolvedTierMap } from './TierResolver.js';

export const TRUST_OVERRIDE_RESOLVER_VERSION = 'v2';

export interface TrustResolutionDecision {
  sourceNode: string;
  rejectionNode?: string;
  resolutionDepth: number;
  resolutionTier: string;
  trustAccepted: boolean;
  suppressionAncestry: string[];
}

export type TrustResolutionSurface = Record<string, TrustResolutionDecision>;

/**
 * Phase 6 Objective 4 / Phase 8.9 C-3 FIX: Trust Override Resolver
 *
 * Implements full recursive suppression propagation:
 * - ancestor rejection → descendant rejection
 * - lineage recording in suppressionAncestry
 * - covers multi-level, branching, and diamond dependency chains
 *
 * Algorithm:
 * 1. Sort entries by dependencyDepth (shallowest first) — guarantees
 *    that all ancestors are resolved before their descendants.
 * 2. For each entry, check direct strict-mode trust rejection.
 * 3. Scan all already-resolved entries for transitive rejection:
 *    any rejected entry whose `extends` or `dependencies` reference
 *    the current entry's policyId causes cascading suppression.
 * 4. Record the full suppression lineage for explainability.
 */
export class TrustOverrideResolver {
  constructor(
    private entries: PolicyStackEntry[],
    private trustScopeExplainabilityGraph: any,
    private resolvedTierMap: ResolvedTierMap
  ) {}

  public resolve(): TrustResolutionSurface {
    const surface: TrustResolutionSurface = {};

    // Build an index of policyId → [keys that depend on it] for efficient lookup
    const dependantIndex = new Map<string, string[]>();
    for (const entry of this.entries) {
      const key = `${entry.policyNamespace || ''}/${entry.policyId}`;
      const deps = this.getEntryDependencies(entry);
      for (const depId of deps) {
        if (!dependantIndex.has(depId)) {
          dependantIndex.set(depId, []);
        }
        dependantIndex.get(depId)!.push(key);
      }
    }
    
    // Sort shallowest dependencies first to guarantee parents resolve before children
    const sortedEntries = [...this.entries].sort((a, b) => 
      (a.executionMetadata?.dependencyDepth ?? 999) - (b.executionMetadata?.dependencyDepth ?? 999)
    );

    for (const entry of sortedEntries) {
      const key = `${entry.policyNamespace || ''}/${entry.policyId}`;
      const depth = entry.executionMetadata?.dependencyDepth ?? 999;
      const tierInfo = this.resolvedTierMap[key] || { tier: 'unknown' };

      let trustAccepted = true;
      let rejectionNode: string | undefined = undefined;
      const suppressionAncestry: string[] = [];

      // Phase 1: Check explicit strict-mode trust rejection for this entry
      if (entry.executionMetadata?.negotiationMode === 'strict' && tierInfo.tier === 'transitive') {
        const globalPolicyHash = entry.loaderTrustMetadata?.namespaceTrustPolicyHash;
        if (globalPolicyHash && this.trustScopeExplainabilityGraph?.scopes?.global?.allowUntrustedNamespaces === false) {
           trustAccepted = false;
           suppressionAncestry.push(`strict_mode_rejection_at_${key}`);
        }
      }

      // Phase 2: Transitive rejection propagation — check all already-resolved ancestors
      // Because entries are sorted by depth, all potential parents are already in `surface`.
      if (trustAccepted) {
        for (const parent of sortedEntries) {
          const pKey = `${parent.policyNamespace || ''}/${parent.policyId}`;
          
          // Skip self, skip entries not yet resolved, skip accepted parents
          if (pKey === key || !surface[pKey] || surface[pKey].trustAccepted) {
            continue;
          }
          
          // Check if this parent declares current entry as a dependency
          const parentDeps = this.getEntryDependencies(parent);
          if (parentDeps.includes(entry.policyId)) {
            trustAccepted = false;
            rejectionNode = pKey;
            suppressionAncestry.push(`inherited_suppression_from_${pKey}`);
            suppressionAncestry.push(...surface[pKey].suppressionAncestry);
            break; // First rejected ancestor is sufficient — lineage captures the chain
          }
        }
      }

      surface[key] = {
        sourceNode: key,
        trustAccepted,
        rejectionNode,
        resolutionDepth: depth,
        resolutionTier: tierInfo.tier,
        suppressionAncestry
      };
    }

    return surface;
  }

  /**
   * Extract dependency identifiers from an entry, supporting both
   * `extends` (string | string[]) and `dependencies` (Record<string, any>) patterns.
   */
  private getEntryDependencies(entry: PolicyStackEntry): string[] {
    const deps: string[] = [];
    
    // Handle `extends` field
    if (entry.config.extends) {
      const extendsArr = Array.isArray(entry.config.extends) 
        ? entry.config.extends 
        : [entry.config.extends];
      deps.push(...extendsArr);
    }
    
    // Handle `dependencies` field
    if (entry.config.dependencies && typeof entry.config.dependencies === 'object') {
      deps.push(...Object.keys(entry.config.dependencies));
    }
    
    return deps;
  }
}

