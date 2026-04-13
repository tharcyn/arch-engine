import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { 
  expandLocalStack, 
  LocalPolicyRegistry 
} from '../src/policy/expandLocalStack.js';
import { PolicyStackEntry } from '../src/policy/types.js';
import { DIAMOND_TRAVERSAL_CONTRACT_VERSION } from '../src/policy/contracts/diamondTraversalContract.js';

describe('Phase 3B: Diamond Traversal Contract Freeze', () => {

  const createEntry = (id: string, ext?: string | string[], namespace: string = 'local'): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: namespace,
    hash: crypto.createHash('sha256').update(id).digest('hex'),
    config: {
      version: 1,
      extends: ext
    }
  });

  const createRegistry = (entries: PolicyStackEntry[]): LocalPolicyRegistry => {
    return {
      resolve: (namespace: string, name: string) => {
        return entries.find(e => e.policyId === name && e.policyNamespace === namespace);
      }
    };
  };

  it('Test 1: Contract Version Exported', () => {
    expect(DIAMOND_TRAVERSAL_CONTRACT_VERSION).toBe('v1');
  });

  it('Test 2: Diamond DAG ordering stable ([D, B, C, A])', () => {
    const D = createEntry('D');
    const B = createEntry('B', 'D');
    const C = createEntry('C', 'D');
    const A = createEntry('A', ['B', 'C']);
    const registry = createRegistry([A, B, C, D]);

    const result = expandLocalStack(A, registry);
    expect(result.map(e => e.policyId)).toEqual(['D', 'B', 'C', 'A']);
  });

  it('Test 3: Diamond DAG ordering deterministic across runs', () => {
    const D = createEntry('D');
    const B = createEntry('B', 'D');
    const C = createEntry('C', 'D');
    const A = createEntry('A', ['B', 'C']);
    const registry = createRegistry([A, B, C, D]);

    const result1 = expandLocalStack(A, registry);
    const result2 = expandLocalStack(A, registry);
    
    expect(result1.map(e => e.policyId)).toEqual(result2.map(e => e.policyId));
    expect(result1.map(e => e.policyId)).toEqual(['D', 'B', 'C', 'A']);
  });

  it('Test 4: Diamond DAG ordering namespace-stable', () => {
    const D = createEntry('D', undefined, 'custom-org');
    const B = createEntry('B', 'D', 'custom-org');
    const C = createEntry('C', 'D', 'custom-org');
    const A = createEntry('A', ['B', 'C'], 'custom-org');
    const registry = createRegistry([A, B, C, D]);

    const result = expandLocalStack(A, registry);
    expect(result.map(e => e.policyId)).toEqual(['D', 'B', 'C', 'A']);
    result.forEach(r => expect(r.policyNamespace).toBe('custom-org'));
  });

  it('Test 5: Diamond DAG ordering seed-stable', () => {
    const D = createEntry('D');
    const B = createEntry('B', 'D');
    const C = createEntry('C', 'D');
    // Change seed hash dynamically
    const A = createEntry('A', ['B', 'C']);
    A.hash = crypto.createHash('sha256').update('new-seed').digest('hex');
    const registry = createRegistry([A, B, C, D]);

    const result = expandLocalStack(A, registry);
    expect(result.map(e => e.policyId)).toEqual(['D', 'B', 'C', 'A']);
  });
});
