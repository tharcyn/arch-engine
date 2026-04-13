import { ScopedNamespaceTrustPolicy, NamespaceTrustScope } from './namespaceTrustScopePolicy.js';

export const TRUST_SCOPE_EXPLAINABILITY_GRAPH_VERSION = 'v1';

export interface TrustScopeExplainabilityNode {
  namespace: string;
  evaluatedScopes: {
    scope: string;
    decision: "ALLOW" | "REJECT" | "SKIPPED";
    reason?: string;
  }[];
  winningScope?: string;
  finalDecision: "ALLOW" | "REJECT";
}

export function generateTrustScopeExplainabilityGraph(
  namespace: string,
  scopedPolicy: ScopedNamespaceTrustPolicy
): TrustScopeExplainabilityNode {
  const precedence = scopedPolicy.precedence || ['snapshot', 'federation', 'workspace', 'global'];
  
  const evaluatedScopes: {
    scope: string;
    decision: "ALLOW" | "REJECT" | "SKIPPED";
    reason?: string;
  }[] = [];

  let winningScope: string | undefined;
  let finalDecision: "ALLOW" | "REJECT" | null = null;

  for (const scope of precedence) {
    if (finalDecision !== null) {
      evaluatedScopes.push({ scope, decision: "SKIPPED", reason: "Already resolved by higher scope" });
      continue;
    }

    const policy = scopedPolicy.scopes[scope];
    if (!policy) {
      evaluatedScopes.push({ scope, decision: "SKIPPED", reason: "No policy defined for scope" });
      continue;
    }

    if (policy.trustedNamespaces.includes(namespace)) {
      evaluatedScopes.push({ scope, decision: "ALLOW", reason: "Explicitly listed in trustedNamespaces" });
      finalDecision = "ALLOW";
      winningScope = scope;
      continue;
    }

    if (policy.allowUntrustedNamespaces === false) {
      evaluatedScopes.push({ scope, decision: "REJECT", reason: "allowUntrustedNamespaces is strictly false" });
      finalDecision = "REJECT";
      winningScope = scope;
      continue;
    }

    if (policy.allowUntrustedNamespaces === true) {
      evaluatedScopes.push({ scope, decision: "ALLOW", reason: "allowUntrustedNamespaces fallback enabled" });
      finalDecision = "ALLOW";
      winningScope = scope;
      continue;
    }

    evaluatedScopes.push({ scope, decision: "SKIPPED", reason: "No matching rule, falling through" });
  }

  if (finalDecision === null) {
    // Phase 4.8 Fix: Deny-by-default when no scope produces a decision (audit finding 3.3/H14)
    finalDecision = "REJECT";
    winningScope = undefined;
  }

  return {
    namespace,
    evaluatedScopes,
    winningScope,
    finalDecision
  };
}
