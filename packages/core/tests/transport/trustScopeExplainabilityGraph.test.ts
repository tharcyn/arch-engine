import { describe, it, expect } from 'vitest';
import { generateTrustScopeExplainabilityGraph } from '../../src/transport/trustScopeExplainabilityGraph.js';
import { ScopedNamespaceTrustPolicy } from '../../src/transport/namespaceTrustScopePolicy.js';

describe('Phase 4.7: trustScopeExplainabilityGraph', () => {

  const config: ScopedNamespaceTrustPolicy = {
    scopes: {
      global: { trustedNamespaces: ['core'] },
      workspace: { trustedNamespaces: [], allowUntrustedNamespaces: false },
      federation: { trustedNamespaces: ['fed'], allowUntrustedNamespaces: true },
      snapshot: { trustedNamespaces: ['snap'] }
    },
    precedence: ['snapshot', 'federation', 'workspace', 'global']
  };

  it('Test 1: Global allow traces skip over non-matching higher scopes', () => {
    // core isn't in snapshot.
    // core isn't in federation, but federation has allowUntrustedNamespaces = true!
    // So federation allows it.
    const graph = generateTrustScopeExplainabilityGraph('core', config);
    expect(graph.finalDecision).toBe('ALLOW');
    expect(graph.winningScope).toBe('federation');
    expect(graph.evaluatedScopes[0].decision).toBe('SKIPPED'); // snapshot
    expect(graph.evaluatedScopes[1].decision).toBe('ALLOW');   // federation
    expect(graph.evaluatedScopes[2].decision).toBe('SKIPPED');   // workspace
  });

  it('Test 2: Explicit rejection precedence enforcement', () => {
    // We reverse precedence to let workspace run before federation
    const revConfig: ScopedNamespaceTrustPolicy = {
      scopes: config.scopes,
      precedence: ['workspace', 'federation', 'global']
    };
    
    const graph = generateTrustScopeExplainabilityGraph('core', revConfig);
    expect(graph.finalDecision).toBe('REJECT');
    expect(graph.winningScope).toBe('workspace');
    expect(graph.evaluatedScopes[0].decision).toBe('REJECT');
    expect(graph.evaluatedScopes[1].decision).toBe('SKIPPED');
  });

  it('Test 3: Snapshot override', () => {
    const graph = generateTrustScopeExplainabilityGraph('snap', config);
    expect(graph.finalDecision).toBe('ALLOW');
    expect(graph.winningScope).toBe('snapshot');
    expect(graph.evaluatedScopes[0].decision).toBe('ALLOW');
    expect(graph.evaluatedScopes[0].reason).toContain('Explicitly listed');
  });

});
