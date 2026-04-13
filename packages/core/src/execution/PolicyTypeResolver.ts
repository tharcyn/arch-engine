import { ArbitrationDecisionGraph } from '../composition/ArbitrationDecisionGraph.js';
import { PrecedenceDecisionSurface } from '../composition/PrecedenceResolver.js';
import { PolicyEvaluationDecision } from './PolicyEvaluationContract.js';

export const POLICY_TYPE_RESOLVER_VERSION = 'v1';

export type PolicyTypeResolutionSurface = Record<string, PolicyEvaluationDecision>;

/**
 * Phase 7 Objective 3: Policy Type Resolver
 *
 * Deterministically interprets execution requirements strictly from the pre-certified
 * ArbitrationDecisionGraph ensuring we don't accidentally fall back into dynamic closure evaluations.
 */
export class PolicyTypeResolver {
  constructor(
    private decisionGraph: ArbitrationDecisionGraph,
    private precedenceSurface: PrecedenceDecisionSurface
  ) {}

  public resolve(): PolicyTypeResolutionSurface {
    const surface: PolicyTypeResolutionSurface = {};

    for (const [key, decision] of Object.entries(this.decisionGraph)) {
      // In a real execution scenario, policy definitions dictate their raw type (e.g. from executionMetadata)
      // Since executionMetadata cannot be dynamically changed, we derive effective behavior based on
      // arbitration context. Note: Precedence order: DENY > ALLOW > TRANSFORM > ANNOTATE > AGGREGATE > NOOP
      
      let resolvedType: PolicyEvaluationDecision = 'NOOP';

      const precedence = this.precedenceSurface[decision.winningPolicy];

      // Purely deterministic type simulation matching the sealed graph
      // Trust override rejections firmly enforce DENY behavior for root/parents if transitive rejects
      if (decision.resolutionTrustSource === 'rejected') {
        resolvedType = 'DENY';
      } 
      // Safe active layers resolve as allows or annotations depending on their core tier
      else if (decision.resolutionTier === 'root') {
        resolvedType = 'ALLOW';
      } else if (decision.resolutionFallbackSource === 'active') {
        resolvedType = 'TRANSFORM'; // Fallbacks fundamentally change execution structure
      } else if (decision.resolutionTier === 'direct') {
        resolvedType = 'ANNOTATE';
      } else if (decision.resolutionTier === 'transitive') {
        resolvedType = 'AGGREGATE';
      }

      surface[key] = resolvedType;
    }

    return surface;
  }
}
