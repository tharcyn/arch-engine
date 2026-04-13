import { describe, it, expect } from 'vitest';
import { PrecedenceResolver } from '../../src/composition/PrecedenceResolver.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 6: Precedence Resolver', () => {

  it('Test 1: Assigns correct depth tier precedence and topological precedence scores', () => {
    const entries: PolicyStackEntry[] = [
      {
        policyId: 'root',
        policyNamespace: 'ns1',
        executionMetadata: { dependencyDepth: 0, stackIndex: 0 },
        config: {}
      } as any,
      {
        policyId: 'dep',
        policyNamespace: 'ns1',
        executionMetadata: { dependencyDepth: 1, stackIndex: 1 },
        config: {}
      } as any
    ];

    const resolver = new PrecedenceResolver(entries, { scopes: { global: {} } }, 'hash', 'hash');
    const surface = resolver.resolve();

    expect(surface['ns1/root'].tierScore).toBe(1000);   // 1000 - 0
    expect(surface['ns1/root'].topologicalScore).toBe(1000); // 1000 - 0
    expect(surface['ns1/dep'].tierScore).toBe(999);     // 1000 - 1
    expect(surface['ns1/dep'].topologicalScore).toBe(999);   // 1000 - 1
  });

  it('Test 2: Defaults to lowest precedence for unresolved graphs securely', () => {
    const entries: PolicyStackEntry[] = [
      {
        policyId: 'orphaned',
        policyNamespace: 'ns2',
        executionMetadata: {}, // no depth/index
        config: {}
      } as any
    ];

    const resolver = new PrecedenceResolver(entries, null, 'hash', 'hash');
    const surface = resolver.resolve();

    expect(surface['ns2/orphaned'].tierScore).toBe(1);  // 1000 - 999 default
    expect(surface['ns2/orphaned'].trustScore).toBe(0);
  });

});
