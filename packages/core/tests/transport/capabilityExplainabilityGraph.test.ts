import { describe, it, expect } from 'vitest';
import { attachCapabilityExplainabilityGraph } from '../../src/transport/capabilityExplainabilityGraph.js';
import { PolicyStackEntry } from '../../src/policy/types.js';
import { CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';

describe('Phase 4.6: capabilityExplainabilityGraph', () => {

  const createEntry = (id: string, ext: string[]): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: { version: 1, extends: ext },
    simulatedCapabilityCompatibility: {
      missingCapabilities: ['missing'],
      incompatibleLayers: [],
      incompatibleDomains: []
    }
  });

  it('Test 1: Generates explainability graph in proper modes', () => {
    const parent = createEntry('parent', ['childA']);
    const childA = createEntry('childA', []);
    
    attachCapabilityExplainabilityGraph([parent, childA], parent, {
      engineVersion: '2',
      supportedLayers: [],
      supportedDomains: [],
      negotiationMode: CapabilityNegotiationMode.WARN
    });

    const graph = parent.executionMetadata?.capabilityExplainabilityGraph;
    expect(graph).toBeDefined();
    expect(graph.policyId).toBe('parent');
    expect(graph.missingCapabilities).toEqual(['missing']);
    expect(graph.children.length).toBe(1);
    expect(graph.children[0].policyId).toBe('childA');
  });

});
