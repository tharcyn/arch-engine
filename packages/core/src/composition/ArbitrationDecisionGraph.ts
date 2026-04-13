import { ConflictResolutionMap } from './ConflictResolver.js';
import { PrecedenceDecisionSurface } from './PrecedenceResolver.js';
import { NamespacePriorityDecisionSurface } from './NamespacePriorityResolver.js';
import { TrustResolutionSurface } from './TrustOverrideResolver.js';
import { MirrorResolutionSurface } from './MirrorSubstitutionResolver.js';
import { FallbackResolutionSurface } from './FallbackResolver.js';

export const ARBITRATION_DECISION_GRAPH_VERSION = 'v1';

export interface ArbitrationDecisionNode {
  winningPolicy: string;
  losingPolicies: string[];
  resolutionReason: string;
  resolutionTier: string;
  resolutionNamespace: string;
  resolutionTrustSource: string;
  resolutionRegistrySource: string;
  resolutionFallbackSource: string;
}

export type ArbitrationDecisionGraph = Record<string, ArbitrationDecisionNode>;

/**
 * Phase 6 Objective 7: Arbitration Decision Graph
 *
 * Produces the final, deterministic decision tree unifying all conflict resolutions.
 * Replay-stable and fully hash-safe, preserving exact explicit reasons for all composition merges.
 */
export function buildArbitrationDecisionGraph(
  conflictMap: ConflictResolutionMap,
  precedenceSurface: PrecedenceDecisionSurface,
  namespaceSurface: NamespacePriorityDecisionSurface,
  trustSurface: TrustResolutionSurface,
  mirrorSurface: MirrorResolutionSurface,
  fallbackSurface: FallbackResolutionSurface
): ArbitrationDecisionGraph {
  
  const decisionGraph: ArbitrationDecisionGraph = {};

  // Hydrate from explicit conflicts first
  for (const [id, conflict] of Object.entries(conflictMap)) {
    const winnerNamespace = conflict.winnerPolicyId.split('/')[0] || '';

    decisionGraph[id] = {
      winningPolicy: conflict.winnerPolicyId,
      losingPolicies: [...conflict.loserPolicyIds].sort((a, b) => a < b ? -1 : a > b ? 1 : 0),
      resolutionReason: conflict.resolutionReason,
      resolutionTier: conflict.resolutionTier,
      resolutionNamespace: winnerNamespace,
      resolutionTrustSource: trustSurface[conflict.winnerPolicyId]?.resolutionTier || 'unknown',
      resolutionRegistrySource: mirrorSurface['default']?.resolvedSourceHash || 'unknown',
      resolutionFallbackSource: fallbackSurface[conflict.winnerPolicyId]?.fallbackAvailable ? 'active' : 'none'
    };
  }

  // Iterate the broader precedence map to anchor decisions for non-conflict policies too
  for (const [key, decision] of Object.entries(precedenceSurface)) {
    const id = decision.policyId;
    if (!decisionGraph[id]) { // If it wasn't a conflict, it won by default or topological uniqueness
      decisionGraph[id] = {
        winningPolicy: key,
        losingPolicies: [],
        resolutionReason: 'Direct Topological Precedence',
        resolutionTier: 'default',
        resolutionNamespace: decision.namespace,
        resolutionTrustSource: trustSurface[key]?.trustAccepted ? 'accepted' : 'rejected',
        resolutionRegistrySource: mirrorSurface['default']?.resolvedSourceHash || 'unknown',
        resolutionFallbackSource: fallbackSurface[key]?.fallbackAvailable ? 'active' : 'none'
      };
    }
  }

  return decisionGraph;
}
