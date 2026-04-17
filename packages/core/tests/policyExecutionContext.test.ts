import { describe, test, expect } from 'vitest';
import { PolicyPackRunner } from '../src/topology/PolicyPackRunner';
import type { TopologyPolicyPack } from '../src/topology/TopologyPolicyPack';
import type { PolicyRelevantDiff } from '../src/topology/PolicyRelevantDiff';
import type { TopologyGraph } from '../src/topology/TopologyGraph';
import type { PolicyExecutionContext } from '../src/policy/PolicyExecutionContext';

describe('Phase 9F Unified Policy Execution Context Surface', () => {

  const mockDiff: PolicyRelevantDiff = {
    addedNodes: [],
    removedNodes: [],
    addedEdges: [],
    removedEdges: [],
    structuralDrift: false
  };

  const mockGraph: TopologyGraph = {
    graphSurfaceVersion: "1.0.0",
    graphSurfaceHash: "hash",
    nodes: [],
    edges: []
  };

  test('context_contains_diff_reference', () => {
    const context: PolicyExecutionContext = {
      policyRelevantDiff: mockDiff,
      topologyGraph: mockGraph
    };
    expect(context.policyRelevantDiff).toBe(mockDiff);
  });

  test('context_contains_graph_reference', () => {
    const context: PolicyExecutionContext = {
      policyRelevantDiff: mockDiff,
      topologyGraph: mockGraph
    };
    expect(context.topologyGraph).toBe(mockGraph);
  });

  test('built_in_packs_execute_via_context', () => {
    let capturedContext: PolicyExecutionContext | undefined;
    const pack: TopologyPolicyPack = {
      policyPackId: 'builtin',
      displayName: 'Built In',
      evaluate: (context) => {
        capturedContext = context;
        return { policyPackId: 'builtin', success: true, diagnostics: [] };
      }
    };
    const runner = new PolicyPackRunner([pack]);
    runner.run({ policyRelevantDiff: mockDiff, topologyGraph: mockGraph });
    
    expect(capturedContext?.policyRelevantDiff).toBe(mockDiff);
    expect(capturedContext?.topologyGraph).toBe(mockGraph);
  });

  test('local_packs_execute_via_context', () => {
    const context: PolicyExecutionContext = {
      policyRelevantDiff: mockDiff,
      topologyGraph: {
        ...mockGraph,
        edges: [{ from: 'a', to: 'b', type: 'call' }]
      }
    };

    const pack: TopologyPolicyPack = {
      policyPackId: 'local',
      displayName: 'Local Pack',
      metadata: {
        policyPackId: 'local',
        description: 'desc',
        category: 'cat',
        rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }]
      }
    };

    const runner = new PolicyPackRunner([pack]);
    const results = runner.run(context) as any;
    
    expect(results[0].violations).toHaveLength(1);
    expect(results[0].matchedEdges).toBe(1);
  });

});
