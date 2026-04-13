import { describe, it, expect } from 'vitest';
import { NamespacePriorityResolver } from '../../src/composition/NamespacePriorityResolver.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 6: Namespace Priority Resolver', () => {

  it('Test 1: Establishes global namespace priority by depth proximity to root', () => {
    const entries: PolicyStackEntry[] = [
      { policyNamespace: 'tenant', policyId: 'id1', executionMetadata: { dependencyDepth: 0 }, config: {} } as any,
      { policyNamespace: 'base', policyId: 'id2', executionMetadata: { dependencyDepth: 1 }, config: {} } as any
    ];

    const resolver = new NamespacePriorityResolver(entries, 'hash1', 'hash2');
    const { globalPriorities } = resolver.resolve();

    expect(globalPriorities).toEqual(['tenant', 'base']);
  });

  it('Test 2: Resolves simple shadow map deterministically using global priorities', () => {
    const entries: PolicyStackEntry[] = [
      { policyNamespace: 'tenant', policyId: 'id1', executionMetadata: { dependencyDepth: 0 }, config: {} } as any,
      { policyNamespace: 'base', policyId: 'id1', executionMetadata: { dependencyDepth: 1 }, config: {} } as any,
      { policyNamespace: 'tenant', policyId: 'id2', executionMetadata: { dependencyDepth: 0 }, config: {} } as any
    ];

    const resolver = new NamespacePriorityResolver(entries, 'hash1', 'hash2');
    const { shadowingResolutionMap } = resolver.resolve();

    expect(shadowingResolutionMap['id1']).toBe('tenant');
    expect(shadowingResolutionMap['id2']).toBe('tenant');
  });

  it('Test 3: Throws namespace ambiguous error if equal depth logic cannot be tiebroken', () => {
    let loopCount = 0;
    const iterableProxy: any = {
      [Symbol.iterator]: function* () {
        loopCount++;
        if (loopCount === 1) {
           // Loop 1 building namespaceDepths: doesn't see ghosts
           yield { policyNamespace: 'tenant', policyId: 'id1', executionMetadata: { dependencyDepth: 0 } };
        } else if (loopCount === 2) {
           // Loop 2 building idMap: multiple ghosts appear that aren't in priorities
           yield { policyNamespace: 'ghost1', policyId: 'id1', executionMetadata: { dependencyDepth: 0 } };
           yield { policyNamespace: 'ghost2', policyId: 'id1', executionMetadata: { dependencyDepth: 0 } };
        }
      }
    };
    
    const resolver = new NamespacePriorityResolver(iterableProxy as any, 'hash1', 'hash2');
    expect(() => resolver.resolve()).toThrow('priority ambiguous');
  });

});
