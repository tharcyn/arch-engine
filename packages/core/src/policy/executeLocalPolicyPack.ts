import type { LocalPolicyRule } from './LocalPolicyRule';
import type { PolicyExecutionContext } from './PolicyExecutionContext';
import type { PolicyEvaluationResult } from '../topology/PolicyEvaluationResult';
import type { PolicyViolation } from './types';

// Executes workspace-defined topology constraints using
// deterministic JSON rule definitions without requiring
// dynamic plugin loading or runtime evaluation
export function executeLocalPolicyPack(
  rules: LocalPolicyRule[] | undefined,
  context: PolicyExecutionContext
): PolicyEvaluationResult {
  const violations: PolicyViolation[] = [];
  let matchedEdges = 0;

  if (rules) {
    for (const rule of rules) {
      if (rule.type === 'forbid-edge') {
        for (const edge of context.topologyGraph.edges) {
          if (edge.from === rule.from && edge.to === rule.to) {
            violations.push({
              violationCategory: 'explicit_forbid',
              from: edge.from,
              to: edge.to,
              severity: 'error',
              ruleSource: 'local_json_rule',
              confidenceContext: 'local',
              suppressionEligible: true,
              ruleId: 'forbid-edge',
            });
            matchedEdges++;
          }
        }
      }
    }
  }

  return {
    violations,
    matchedEdges,
    policyMode: 'enforce',
    policyVersion: 1,
    policyDetected: true,
    policyRuleHits: {},
    allowMatches: [],
  } as unknown as PolicyEvaluationResult;
}
