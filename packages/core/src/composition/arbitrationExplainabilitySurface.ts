import { ArbitrationDecisionGraph } from './ArbitrationDecisionGraph.js';

export const ARBITRATION_EXPLAINABILITY_SURFACE_VERSION = 'v1';

export interface ArbitrationExplainabilitySurface {
  decisionTrace: string[];
  resolutionSequence: string[];
  loserSuppressionChain: string[];
  tierResolutionChain: string[];
  namespaceOverrideChain: string[];
  trustOverrideChain: string[];
  fallbackActivationChain: string[];
}

/**
 * Phase 6 Objective 8: Arbitration Explainability Surface
 *
 * Attaches the precise decision log to the composition graph. Ensures all Federation nodes
 * have zero-knowledge-proof level explicit logs for why specific conflict nodes won or lost.
 */
export function buildArbitrationExplainabilitySurface(
  decisionGraph: ArbitrationDecisionGraph
): ArbitrationExplainabilitySurface {

  const surface: ArbitrationExplainabilitySurface = {
    decisionTrace: [],
    resolutionSequence: [],
    loserSuppressionChain: [],
    tierResolutionChain: [],
    namespaceOverrideChain: [],
    trustOverrideChain: [],
    fallbackActivationChain: []
  };

  const keys = Object.keys(decisionGraph).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  for (const key of keys) {
    const node = decisionGraph[key];

    surface.decisionTrace.push(`[${key}] WON: ${node.winningPolicy} REASON: ${node.resolutionReason}`);
    surface.resolutionSequence.push(node.winningPolicy);
    
    if (node.losingPolicies.length > 0) {
      surface.loserSuppressionChain.push(`[${key}] SUPPRESSED: ${node.losingPolicies.join(',')}`);
    }

    surface.tierResolutionChain.push(`[${key}] TIER: ${node.resolutionTier}`);
    surface.namespaceOverrideChain.push(`[${key}] NS: ${node.resolutionNamespace}`);
    surface.trustOverrideChain.push(`[${key}] TRUST: ${node.resolutionTrustSource}`);

    if (node.resolutionFallbackSource === 'active') {
      surface.fallbackActivationChain.push(`[${key}] FALLBACK_ACTIVATED`);
    }
  }

  return surface;
}
