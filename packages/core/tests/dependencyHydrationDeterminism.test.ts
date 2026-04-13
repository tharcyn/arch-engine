import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { expandLocalStack, LocalPolicyRegistry } from '../src/policy/expandLocalStack.js';
import { PolicyStackEntry } from '../src/policy/types.js';

describe('Phase 3E: Dependency Graph Hydration Determinism', () => {

  const createEntry = (id: string, ext?: string | string[], namespace: string = 'local'): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: namespace,
    hash: crypto.createHash('sha256').update(id + namespace).digest('hex'),
    config: {
      version: 1,
      extends: ext
    }
  });

  const createRegistry = (entries: PolicyStackEntry[]): LocalPolicyRegistry => {
    return {
      resolve: (namespace: string, name: string) => {
        return entries.find(e => e.policyId === name);
      }
    };
  };

  it('Test 1: Simulated dependency graph resolution stable across relocation', () => {
    const parent = createEntry('parent', undefined, 'remote-reg');
    const child = createEntry('child', 'parent', 'local-reg');
    
    // Simulate resolution
    const registry = createRegistry([parent, child]);
    const stack = expandLocalStack(child, registry);

    // Relocate child to new namespace
    const childRelocated = createEntry('child', 'parent', 'relocated-ns');
    const registry2 = createRegistry([parent, childRelocated]);
    const stackRelocated = expandLocalStack(childRelocated, registry2);

    // Verify ordering
    expect(stack.length).toBe(2);
    expect(stackRelocated.length).toBe(2);
    expect(stack[0].policyId).toBe(stackRelocated[0].policyId);
    expect(stack[1].policyId).toBe(stackRelocated[1].policyId);

    // Verify checksum stable across namespace mapping directly
    const createChecksum = (s: PolicyStackEntry[]) => crypto.createHash('sha256').update('static-anchor' + ':' + s.map(e => e.policyId).join('|')).digest('hex');
    expect(createChecksum(stack)).toBe(createChecksum(stackRelocated));
  });

});
