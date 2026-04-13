import { describe, it, expect } from 'vitest';
import { generateCapabilityExplainabilityGraph } from '../../src/transport/capabilityExplainabilityGraph.js';
import { PolicyStackEntry } from '../../src/policy/types.js';
import { CapabilityNegotiationMode } from '../../src/transport/validateManifestCapabilities.js';

describe('Phase 4.6: capabilityExplainabilityGraph FALLBACK', () => {

  const createEntry = (id: string, fb: boolean): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: { version: 1 },
    executionMetadata: { capabilityFallbackApplied: fb }
  });

  it('Test 1: Fallback applied boolean correctly annotated in graph', () => {
    const parent = createEntry('parent', true);

    const graph = generateCapabilityExplainabilityGraph([parent], parent, {
      engineVersion: '2',
      supportedLayers: [],
      supportedDomains: [],
      negotiationMode: CapabilityNegotiationMode.FALLBACK
    });

    expect(graph).toBeDefined();
    expect(graph!.fallbackApplied).toBe(true);
  });

});
