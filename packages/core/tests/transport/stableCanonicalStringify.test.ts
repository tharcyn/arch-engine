import { describe, it, expect } from 'vitest';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 4.9: stableCanonicalStringify', () => {

  it('Test 1: Alphabetically sorts object keys regardless of insertion order', () => {
    const a = stableCanonicalStringify({ z: 1, a: 2, m: 3 });
    const b = stableCanonicalStringify({ a: 2, m: 3, z: 1 });
    expect(a).toBe(b);
    expect(JSON.parse(a)).toEqual({ a: 2, m: 3, z: 1 });
  });

  it('Test 2: Nested objects are recursively sorted', () => {
    const a = stableCanonicalStringify({ outer: { z: 1, a: 2 }, b: true });
    const b = stableCanonicalStringify({ b: true, outer: { a: 2, z: 1 } });
    expect(a).toBe(b);
  });

  it('Test 3: Arrays preserve element order (semantic)', () => {
    const result = stableCanonicalStringify({ items: ['c', 'a', 'b'] });
    const parsed = JSON.parse(result);
    expect(parsed.items).toEqual(['c', 'a', 'b']); // NOT sorted
  });

  it('Test 4: undefined values excluded', () => {
    const result = stableCanonicalStringify({ a: 1, b: undefined, c: 3 });
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toEqual(['a', 'c']);
  });

  it('Test 5: null values preserved', () => {
    const result = stableCanonicalStringify({ a: null });
    expect(JSON.parse(result)).toEqual({ a: null });
  });

  it('Test 6: Primitives handled correctly', () => {
    expect(stableCanonicalStringify(42)).toBe('42');
    expect(stableCanonicalStringify('hello')).toBe('"hello"');
    expect(stableCanonicalStringify(true)).toBe('true');
  });

});
