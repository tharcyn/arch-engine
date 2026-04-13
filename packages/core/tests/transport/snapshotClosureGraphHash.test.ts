import { describe, it, expect } from 'vitest';
import { computeSnapshotClosureGraphHash, validateSnapshotClosureGraphDivergence } from '../../src/transport/snapshotClosureGraphHash.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 4.7: snapshotClosureGraphHash', () => {

  const createEntry = (id: string, hash: string): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: 'ns',
    hash: 'h',
    config: { version: 1 },
    executionMetadata: { capabilityClosureHash: hash }
  });

  it('Test 1: Stable hash for identical stack', () => {
    const stack = [createEntry('a', 'abc'), createEntry('b', 'def')];
    const hash1 = computeSnapshotClosureGraphHash(stack);
    const hash2 = computeSnapshotClosureGraphHash([...stack].reverse());
    expect(hash1).toBe(hash2);
  });

  it('Test 2: Hash change when dependency lineage changes (closure hash changes)', () => {
    const stack1 = [createEntry('a', 'abc')];
    const stack2 = [createEntry('a', 'xyz')];
    expect(computeSnapshotClosureGraphHash(stack1)).not.toBe(computeSnapshotClosureGraphHash(stack2));
  });

  it('Test 3: Detects snapshot divergence', () => {
    try {
      validateSnapshotClosureGraphDivergence('hash1', 'hash2');
      expect.fail('Should reject');
    } catch (e: any) {
      expect(e.code).toBe('SNAPSHOT_CLOSURE_GRAPH_DIVERGENCE');
    }
  });

});
