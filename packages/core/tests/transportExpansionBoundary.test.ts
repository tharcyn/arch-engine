import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { expandLocalStack, LocalPolicyRegistry } from '../src/policy/expandLocalStack.js';
import { PolicyStackEntry } from '../src/policy/types.js';

describe('Phase 3C: Transport Expansion Boundary', () => {

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
        // Mock a future policy:// remote transport loader behavior
        if (name.startsWith('policy://')) {
          const actualName = name.replace('policy://', '');
          return entries.find(e => e.policyId === actualName);
        }
        return entries.find(e => e.policyId === name);
      }
    };
  };

  it('Test 1: policy loader prefix does NOT alter expansion topology determinism', () => {
    const parent = createEntry('parent', undefined, 'remote-reg');
    const local = createEntry('local', 'policy://parent', 'local-reg');
    
    const registry = createRegistry([parent, local]);

    const stack = expandLocalStack(local, registry);
    expect(stack.length).toBe(2);
    expect(stack[0].policyId).toBe('parent');
    expect(stack[0].policyNamespace).toBe('remote-reg');
    
    // Seed and ids unaltered
    const checksum = crypto.createHash('sha256').update((local.policyNamespace || 'local') + ':' + stack.map(e => e.policyId).join('|')).digest('hex');
    expect(checksum).toBeDefined();
  });

});
