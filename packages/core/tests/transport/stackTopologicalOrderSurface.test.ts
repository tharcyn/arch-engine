import { describe, it, expect } from 'vitest';
import { computeStackTopologicalOrder, assignStackIndices } from '../../src/transport/computeStackTopologicalOrder.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 4.10: Stack Topological Ordering Surface', () => {

  const makeEntry = (ns: string, id: string, version: number, ext?: string[]): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: ns,
    hash: `hash_${ns}_${id}_${version}`,
    config: { version, extends: ext }
  });

  it('Test 1: Dependencies-first ordering', () => {
    // child extends parent → parent should come first
    const parent = makeEntry('ns', 'parent', 1, []);
    const child = makeEntry('ns', 'child', 1, ['parent']);

    const ordered = computeStackTopologicalOrder([child, parent]);
    const ids = ordered.map(e => e.policyId);

    expect(ids.indexOf('parent')).toBeLessThan(ids.indexOf('child'));
  });

  it('Test 2: Deterministic ordering across runs', () => {
    const a = makeEntry('ns', 'a', 1, []);
    const b = makeEntry('ns', 'b', 1, []);
    const c = makeEntry('ns', 'c', 1, ['a', 'b']);

    const run1 = computeStackTopologicalOrder([c, b, a]);
    const run2 = computeStackTopologicalOrder([a, c, b]);

    const ids1 = run1.map(e => e.policyId);
    const ids2 = run2.map(e => e.policyId);
    expect(ids1).toEqual(ids2);
  });

  it('Test 3: stackIndex assigned correctly', () => {
    const parent = makeEntry('ns', 'parent', 1, []);
    const child = makeEntry('ns', 'child', 1, ['parent']);
    const entries = [child, parent];

    assignStackIndices(entries);

    // Each entry should have a stackIndex
    for (const e of entries) {
      expect(typeof e.executionMetadata?.stackIndex).toBe('number');
    }
  });

  it('Test 4: Single entry ordering', () => {
    const a = makeEntry('ns', 'solo', 1, []);
    const ordered = computeStackTopologicalOrder([a]);
    expect(ordered.length).toBe(1);
    expect(ordered[0].policyId).toBe('solo');
  });

  it('Test 5: stackTopologicalOrder attached to executionMetadata', () => {
    const parent = makeEntry('ns', 'parent', 1, []);
    const child = makeEntry('ns', 'child', 1, ['parent']);
    const entries = [child, parent];

    assignStackIndices(entries);

    // topological order should be recorded on entries
    const anyEntry = entries.find(e => e.executionMetadata?.stackTopologicalOrder);
    expect(anyEntry).toBeDefined();
    expect(Array.isArray(anyEntry!.executionMetadata!.stackTopologicalOrder)).toBe(true);
  });

});
