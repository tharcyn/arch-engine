import { ResolvedTierMap } from './TierResolver.js';
import { ConflictSurfaceReport } from './ConflictSurfaceDetector.js';

export const COMPOSITION_MERGE_PLANNER_VERSION = 'v1';

export interface CompositionPlan {
  mergePlanGraph: string[];
  resolutionOrdering: string[];
  policyPrecedenceLayering: Record<string, string[]>;
  fallbackResolutionSurfaces: string[];
  deterministic: boolean;
}

/**
 * Phase 5 Objective 4: Merge Planner Skeleton
 *
 * Constructs deterministically-ordered precedence surfaces using the loader-sealed
 * hierarchy inputs. Strictly avoids modifying metadata, executing closure logic,
 * or mutating topologic adjacencies.
 */
export class MergePlanner {
  constructor(
    private resolvedTierMap: ResolvedTierMap,
    private conflictReport: ConflictSurfaceReport
  ) {}

  public plan(): CompositionPlan {
    const keys = Object.keys(this.resolvedTierMap).sort((a, b) => {
      // Sort primarily by StackIndex to maintain topographic coherence
      const resA = this.resolvedTierMap[a];
      const resB = this.resolvedTierMap[b];
      return resA.stackIndex - resB.stackIndex;
    });

    const layering: Record<string, string[]> = {
      root: [],
      direct: [],
      transitive: [],
      registry: [],
      unknown: []
    };

    for (const key of keys) {
      const tier = this.resolvedTierMap[key].tier;
      layering[tier].push(key);
    }

    return {
      mergePlanGraph: keys, // Deterministic topological trace
      resolutionOrdering: [...keys].reverse(), // Reverse topology is standard for precedence merges
      policyPrecedenceLayering: layering,
      fallbackResolutionSurfaces: Object.values(layering['transitive'] || []),
      deterministic: true
    };
  }
}
