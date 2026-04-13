import * as crypto from 'node:crypto';
import { NamespaceTrustPolicy } from './namespaceTrustPolicy.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';

import { generateTrustScopeExplainabilityGraph, TRUST_SCOPE_EXPLAINABILITY_GRAPH_VERSION } from './trustScopeExplainabilityGraph.js';

export const NAMESPACE_TRUST_SCOPE_POLICY_VERSION = 'v1';

export type NamespaceTrustScope = 'global' | 'workspace' | 'federation' | 'snapshot';

export interface ScopedNamespaceTrustPolicy {
  scopes: {
    global?: NamespaceTrustPolicy;
    workspace?: NamespaceTrustPolicy;
    federation?: NamespaceTrustPolicy;
    snapshot?: NamespaceTrustPolicy;
  };
  precedence?: NamespaceTrustScope[];
}

export interface TrustScopeResolutionResult {
  trusted: boolean;
  scopeUsed: NamespaceTrustScope | null;
  trustDecisionSource: string;
  trustScopeExplainabilityGraph?: any;
}

export function resolveScopedTrust(
  namespace: string,
  scopedPolicy: ScopedNamespaceTrustPolicy
): TrustScopeResolutionResult {
  const graph = generateTrustScopeExplainabilityGraph(namespace, scopedPolicy);

  if (graph.finalDecision === 'REJECT') {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.TRUST_SCOPE_NAMESPACE_REJECTION,
      message: `Namespace ${namespace} explicitly rejected in scope ${graph.winningScope}`,
      stage: 'registrySelection',
      contractVersion: NAMESPACE_TRUST_SCOPE_POLICY_VERSION,
      policyNamespace: namespace,
      scopeUsed: graph.winningScope,
      trustDecisionSource: `scope:${graph.winningScope}`,
      trustScopeExplainabilityGraph: graph,
      loaderStageMetadata: {
        contractVersion: NAMESPACE_TRUST_SCOPE_POLICY_VERSION,
        namespace,
        validationStage: 'resolveScopedTrust'
      }
    });
  }

  return {
    trusted: true,
    scopeUsed: (graph.winningScope as NamespaceTrustScope) || null,
    trustDecisionSource: graph.winningScope ? `scope:${graph.winningScope}` : 'default',
    trustScopeExplainabilityGraph: graph
  };
}

export function computeNamespaceTrustScopeHash(
  scopedPolicy: ScopedNamespaceTrustPolicy
): string {
  const precedence = scopedPolicy.precedence || ['snapshot', 'federation', 'workspace', 'global'];
  
  const scopesPayload: Record<string, any> = {};
  for (const p of precedence) {
    if (scopedPolicy.scopes[p]) {
      const sp = scopedPolicy.scopes[p]!;
      const mirrorKeys = sp.mirrorEquivalenceMap 
        ? Object.keys(sp.mirrorEquivalenceMap).sort((a,b) => a < b ? -1 : a > b ? 1 : 0)
        : [];
      const mirrorEntries = mirrorKeys.map(k => [k, sp.mirrorEquivalenceMap![k]]);

      scopesPayload[p] = {
        allowUntrustedNamespaces: sp.allowUntrustedNamespaces ?? false,
        mirrorEquivalenceMap: mirrorEntries.length > 0 ? Object.fromEntries(mirrorEntries) : undefined,
        trustedNamespaces: [...sp.trustedNamespaces].sort((a,b) => a < b ? -1 : a > b ? 1 : 0)
      };
    }
  }

  const payload = {
    precedence,
    scopes: scopesPayload
  };

  // Phase 4.9: Use stableCanonicalStringify for mechanically enforced key ordering
  const canonicalString = stableCanonicalStringify(payload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function validateTrustScopeSnapshot(
  snapshotHash: string,
  runtimeHash: string
): void {
  if (snapshotHash !== runtimeHash) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.TRUST_SCOPE_SNAPSHOT_DIVERGENCE,
      message: 'Trust scope signature in snapshot diverged from current runtime environment.',
      stage: 'snapshotReplayValidation',
      contractVersion: NAMESPACE_TRUST_SCOPE_POLICY_VERSION,
      namespaceTrustScopeHash: snapshotHash
    });
  }
}
