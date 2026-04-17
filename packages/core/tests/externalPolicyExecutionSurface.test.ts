import { describe, test, expect } from 'vitest';
import { executeLocalPolicyPack } from '../src/policy/executeLocalPolicyPack';
import type { PolicyPackMetadata } from '../src/policy/PolicyPackMetadata';
import type { PolicyExecutionContext } from '../src/policy/PolicyExecutionContext';

describe('Phase 10B Executable External Policy-Pack Surface (Core)', () => {
  const context: PolicyExecutionContext = {
    policyRelevantDiff: { addedNodes: [], removedNodes: [], addedEdges: [], removedEdges: [], structuralDrift: false },
    topologyGraph: {
      graphSurfaceVersion: '1.0.0',
      graphSurfaceHash: 'hash',
      nodes: [],
      edges: [
        { from: 'controller', to: 'repository', type: 'call' }
      ]
    }
  };

  test('sandbox_engine_executes_external_rules', () => {
    const externalMetadata: PolicyPackMetadata = {
      policyPackId: 'security-layering',
      description: 'desc',
      category: 'sec',
      rules: [
        { type: 'forbid-edge', from: 'controller', to: 'repository' }
      ]
    };

    const result = executeLocalPolicyPack(externalMetadata.rules, context) as any;
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].from).toBe('controller');
    expect(result.violations[0].to).toBe('repository');
    expect(result.matchedEdges).toBe(1);
  });

  test('sandbox_engine_safe_with_no_rules', () => {
    const externalMetadata: PolicyPackMetadata = {
      policyPackId: 'security-layering',
      description: 'desc',
      category: 'sec'
    };

    const result = executeLocalPolicyPack(externalMetadata.rules, context) as any;
    expect(result.violations).toHaveLength(0);
    expect(result.matchedEdges).toBe(0);
  });
});
