import { describe, it, expect } from 'vitest';
import { computeDependencyGraphShapeHash, buildDependencyAdjacency } from '../../src/transport/dependencyGraphShapeHash.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 4.11: Dependency Graph Shape Hash', () => {

  const makeEntry = (ns: string, id: string, version: number, ext?: string[]): PolicyStackEntry => ({
    policyId: id, policyNamespace: ns, hash: `h_${id}`, config: { version, extends: ext }
  });

  it('Test 1: Same topology produces same hash', () => {
    const entries = [makeEntry('ns', 'a', 1, []), makeEntry('ns', 'b', 1, ['a'])];
    const a = computeDependencyGraphShapeHash(entries);
    const b = computeDependencyGraphShapeHash(entries);
    expect(a).toBe(b);
  });

  it('Test 2: Different topology produces different hash', () => {
    const flat = [makeEntry('ns', 'a', 1, []), makeEntry('ns', 'b', 1, [])];
    const chain = [makeEntry('ns', 'a', 1, []), makeEntry('ns', 'b', 1, ['a'])];
    expect(computeDependencyGraphShapeHash(flat)).not.toBe(computeDependencyGraphShapeHash(chain));
  });

  it('Test 3: Input order does not affect hash', () => {
    const entries = [makeEntry('ns', 'b', 1, ['a']), makeEntry('ns', 'a', 1, [])];
    const reversed = [makeEntry('ns', 'a', 1, []), makeEntry('ns', 'b', 1, ['a'])];
    expect(computeDependencyGraphShapeHash(entries)).toBe(computeDependencyGraphShapeHash(reversed));
  });

  it('Test 4: Adjacency surface sorted deterministically', () => {
    const entries = [makeEntry('ns', 'c', 1, ['a', 'b']), makeEntry('ns', 'a', 1, []), makeEntry('ns', 'b', 1, [])];
    const adj = buildDependencyAdjacency(entries);
    const key = `ns/c@1`;
    expect(adj[key]).toBeDefined();
    // Dependencies should be sorted
    for (let i = 1; i < adj[key].length; i++) {
      expect(adj[key][i - 1].localeCompare(adj[key][i], 'en')).toBeLessThanOrEqual(0);
    }
  });

});
