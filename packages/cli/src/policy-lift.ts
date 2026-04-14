/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Policy Lift Adapter
 * ═══════════════════════════════════════════════════════════
 *
 * Converts PolicyRuleDef[] into evaluator-compatible ComposedPolicy structures.
 *
 * This adapter mirrors evaluator fallback provenance semantics:
 *
 *   provenance: 'local'
 *   depth: 0
 *
 * Used by CLI commands when policy packs have not yet passed through
 * overlay composition and federation resolution layers.
 *
 * This preserves evaluator expectations without introducing synthetic provenance.
 *
 * evaluatePolicy() expects ComposedPolicy (with provenance on each rule).
 * For a single locally-loaded policy, provenance is always 'local'.
 */
import type {
  PolicyConfig,
  ComposedPolicy,
  ComposedRuleDef,
  PolicyRuleDef,
} from '@arch-engine/core';

function liftRule(rule: PolicyRuleDef, policyHash: string): ComposedRuleDef {
  return {
    ...rule,
    originPolicyId: 'local',
    originRuleId: rule.id || 'anonymous',
    compositionDepth: 0,
    originPolicyChain: ['local'],
    mergeAuthority: 'local',
  };
}

export function liftToComposedPolicy(
  config: PolicyConfig,
  policyHash: string,
): ComposedPolicy {
  return {
    version: config.version,
    mode: config.mode,
    domains: config.domains,
    effectiveHash: policyHash,
    rules: config.rules
      ? {
          allow: config.rules.allow?.map((r: PolicyRuleDef) => liftRule(r, policyHash)),
          forbid: config.rules.forbid?.map((r: PolicyRuleDef) => liftRule(r, policyHash)),
        }
      : undefined,
  };
}
