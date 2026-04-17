import { describe, test, expect } from 'vitest';
import { executeLocalPolicyPack } from '../src/policy/executeLocalPolicyPack';
import type { TopologyGraph } from '../src/topology/TopologyGraph';

// ═══════════════════════════════════════════════════════════
//  Phase 9E — Executable Local Policy-Pack Surface (Core Tests)
// ═══════════════════════════════════════════════════════════

describe('Phase 9E Executable Local Policy-Pack Surface', () => {

  const mockGraph: TopologyGraph = {
    graphSurfaceVersion: "1.0.0",
    graphSurfaceHash: "hash",
    nodes: [],
    edges: [
      { from: 'frontend', to: 'backend', type: 'call' },
      { from: 'frontend', to: 'database', type: 'call' },
      { from: 'backend', to: 'database', type: 'call' }
    ]
  };

  const mockContext = {
    topologyGraph: mockGraph,
    policyRelevantDiff: { addedNodes: [], removedNodes: [], addedEdges: [], removedEdges: [], structuralDrift: false }
  };

  test('rule_matching_works', () => {
    const result = executeLocalPolicyPack([
      { type: 'forbid-edge', from: 'frontend', to: 'database' }
    ], mockContext as any);

    expect(result.matchedEdges).toBe(1);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].from).toBe('frontend');
    expect(result.violations[0].to).toBe('database');
  });

  test('edge_detection_correct', () => {
    // Edge does not exist in graph
    const result = executeLocalPolicyPack([
      { type: 'forbid-edge', from: 'backend', to: 'frontend' }
    ], mockContext as any);

    expect(result.matchedEdges).toBe(0);
    expect(result.violations).toHaveLength(0);
  });

  test('multiple_violations_supported', () => {
    const result = executeLocalPolicyPack([
      { type: 'forbid-edge', from: 'frontend', to: 'database' },
      { type: 'forbid-edge', from: 'backend', to: 'database' }
    ], mockContext as any);

    expect(result.matchedEdges).toBe(2);
    expect(result.violations).toHaveLength(2);
  });

  test('deterministic_output_ordering_preserved', () => {
    const result = executeLocalPolicyPack([
      { type: 'forbid-edge', from: 'frontend', to: 'database' },
      { type: 'forbid-edge', from: 'backend', to: 'database' }
    ], mockContext as any);

    expect(result.violations[0].from).toBe('frontend');
    expect(result.violations[1].from).toBe('backend');
  });

});
