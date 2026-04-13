import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { expandLocalStack, LocalPolicyRegistry } from '../src/policy/expandLocalStack.js';
import { PolicyStackEntry } from '../src/policy/types.js';

describe('Phase 3B: Remote-Resolution Compatibility Certification', () => {

  const createEntry = (id: string, ext?: string | string[], namespace: string = 'local', issuer: string = 'internal'): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: namespace,
    policyIssuer: issuer,
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

  it('Test 1: Simulated remote expansion diamond DAG ordering stable', () => {
    const D = createEntry('D', undefined, 'remote-A', 'issuer-x'); // Mutated namespace & issuer
    const B = createEntry('B', 'D', 'remote-B', 'issuer-y');
    const C = createEntry('C', 'D', 'remote-C', 'issuer-z');
    const A = createEntry('A', ['B', 'C'], 'local', 'issuer-local');
    const registry = createRegistry([A, B, C, D]);

    const result = expandLocalStack(A, registry);
    expect(result.map(e => e.policyId)).toEqual(['D', 'B', 'C', 'A']);
  });

});
