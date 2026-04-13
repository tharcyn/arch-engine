export const POLICY_EVALUATION_CONTRACT_VERSION = 'v1';

export type PolicyEvaluationDecision = 'ALLOW' | 'DENY' | 'ANNOTATE' | 'TRANSFORM' | 'AGGREGATE' | 'NOOP';

/**
 * Stable evaluation result explicitly tied to the composition and planning context,
 * ensuring no logic re-computes outside sealed graphs.
 */
export interface EvaluationResult {
  policyId: string;
  policyType: string;
  decision: PolicyEvaluationDecision;
  decisionReason: string;
  evaluationTier: string;
  evaluationNamespace: string;
  evaluationDepth: number;
  explainabilityTrace: string[];
  annotationSurface: Record<string, any>;
  aggregationSurface: Record<string, any>;
}

export interface EvaluationContext {
  stackIndex: number;
  dependencyDepth: number;
  activeTrustScope: string;
  fallbackAvailable: boolean;
}

/**
 * Phase 7 Objective 2: Policy Evaluation Contract
 *
 * Immutable runtime execution interface enforcing strict adherence to sealed planner models.
 */
export interface PolicyEvaluationContract {
  evaluate(policyNode: string, evaluationContext: EvaluationContext): EvaluationResult;
}
