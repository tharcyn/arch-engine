import { describe, it, expect } from 'vitest';
import { generateCapabilityExplainabilityGraph } from '../../src/transport/capabilityExplainabilityGraph.js';
import { PolicyStackEntry } from '../../src/policy/types.js';
import { CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';

describe('Phase 4.6: capabilityExplainabilityGraph SIMULATE', () => {

  const createEntry = (id: string, ext: string[]): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: { version: 1, extends: ext },
    simulatedCapabilityCompatibility: {
      missingCapabilities: ['sim-missing'],
      incompatibleLayers: ['ui'],
      incompatibleDomains: ['network']
    }
  });

  it('Test 1: Full simulation evaluation trace output', () => {
    const parent = createEntry('parent', ['child']);
    const child = createEntry('child', []);
    
    parent.simulatedCapabilityCompatibility = {
      missingCapabilities: [],
      incompatibleLayers: [],
      incompatibleDomains: []
    };

    const graph = generateCapabilityExplainabilityGraph([parent, child], parent, {
      engineVersion: '2',
      supportedLayers: [],
      supportedDomains: [],
      negotiationMode: CapabilityNegotiationMode.SIMULATE
    });

    expect(graph).toBeDefined();
    // Parent should be valid
    expect(graph!.missingCapabilities).toEqual([]);
    
    // Child should have tracked the incompatibility accurately
    expect(graph!.children[0].missingCapabilities).toEqual(['sim-missing']);
    expect(graph!.children[0].incompatibleLayers).toEqual(['ui']);
  });

});
