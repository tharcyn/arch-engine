import { PolicyTypeResolutionSurface } from './PolicyTypeResolver.js';
import { ShortCircuitExecutionPlan } from './EvaluationShortCircuitResolver.js';
import { AnnotationAggregationSurface } from './AnnotationMergeResolver.js';
import { ArbitrationExplainabilitySurface } from '../composition/arbitrationExplainabilitySurface.js';
import { stableCanonicalStringify } from '../transport/stableCanonicalStringify.js';

export const RESULT_AGGREGATION_RESOLVER_VERSION = 'v1';

export interface ExecutionResultSurface {
  finalDecision: string;
  decisionChain: string[];
  suppressionChain: string[];
  annotationChain: AnnotationAggregationSurface;
  fallbackChain: string[];
  trustOverrideChain: string[];
  namespaceOverrideChain: string[];
}

/**
 * Phase 7 Objective 6: Result Aggregation Resolver
 *
 * Flattens multi-domain execution sets into a unified primitive-safe matrix.
 * Outputs are guaranteed plain-object serializable representing final deterministic decisions.
 */
export class ResultAggregationResolver {
  constructor(
    private typeResolutionSurface: PolicyTypeResolutionSurface,
    private shortCircuitPlan: ShortCircuitExecutionPlan,
    private annotationSurface: AnnotationAggregationSurface,
    private arbitrationExplainabilitySurface: ArbitrationExplainabilitySurface
  ) {}

  public resolve(): ExecutionResultSurface {
    const executedNodes = this.shortCircuitPlan.executableSequence;
    
    // Evaluate the final decision of the entire graph securely. Default to ALLOW if executed empty/noop,
    // otherwise the final active logic gate wins (highest precedence mapped natively downstream).
    // The last node mapped in sequence determines graph exit state.
    let finalDecisionSymbol = 'NOOP';
    if (executedNodes.length > 0) {
      finalDecisionSymbol = this.typeResolutionSurface[executedNodes[executedNodes.length - 1]] || 'ALLOW';
    }

    if (Object.keys(this.shortCircuitPlan.terminatedBranches).length > 0) {
      // If ANY node caused termination during flattening sequence upstream, mark the execution block DENIED logically.
      finalDecisionSymbol = 'DENY';
    }

    return {
      finalDecision: finalDecisionSymbol,
      decisionChain: executedNodes,
      suppressionChain: Object.keys(this.shortCircuitPlan.terminatedBranches),
      annotationChain: JSON.parse(stableCanonicalStringify(this.annotationSurface || {})),
      fallbackChain: [...this.arbitrationExplainabilitySurface.fallbackActivationChain],
      trustOverrideChain: [...this.arbitrationExplainabilitySurface.trustOverrideChain],
      namespaceOverrideChain: [...this.arbitrationExplainabilitySurface.namespaceOverrideChain]
    };
  }
}
