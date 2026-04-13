import { describe, it, expect } from 'vitest';
import { stableCanonicalStringify, STABLE_STRINGIFY_VERSION } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 8.9 C-1: Cross-Platform Serialization Determinism', () => {

  it('Test 1: stableCanonicalStringify version bumped to v2', () => {
    expect(STABLE_STRINGIFY_VERSION).toBe('v2');
  });

  it('Test 2: Binary codepoint sort — non-ASCII keys ordered by codepoint, not locale', () => {
    // In en locale, localeCompare would sort ä after a but before b.
    // Binary codepoint: 'a' = 0x61, 'b' = 0x62, 'ä' = 0xE4. So ä comes AFTER b.
    const obj = { 'ä': 1, 'a': 2, 'b': 3 };
    const result = stableCanonicalStringify(obj);
    
    // Binary order: a < b < ä
    expect(result).toBe('{"a":2,"b":3,"ä":1}');
  });

  it('Test 3: Key ordering deterministic regardless of construction order', () => {
    const obj1 = { z: 1, a: 2, m: 3 };
    const obj2 = { a: 2, m: 3, z: 1 };
    const obj3 = { m: 3, z: 1, a: 2 };
    
    const s1 = stableCanonicalStringify(obj1);
    const s2 = stableCanonicalStringify(obj2);
    const s3 = stableCanonicalStringify(obj3);
    
    expect(s1).toBe(s2);
    expect(s2).toBe(s3);
    expect(s1).toBe('{"a":2,"m":3,"z":1}');
  });

  it('Test 4: Nested objects sorted recursively', () => {
    const obj = { b: { z: 1, a: 2 }, a: { y: 3, x: 4 } };
    const result = stableCanonicalStringify(obj);
    expect(result).toBe('{"a":{"x":4,"y":3},"b":{"a":2,"z":1}}');
  });

  it('Test 5: Unicode combining characters sorted by codepoint', () => {
    // é (U+00E9) vs e\u0301 (e + combining acute) have different codepoints
    const obj = { '\u00e9': 1, 'e': 2 };
    const result = stableCanonicalStringify(obj);
    // 'e' = 0x65, 'é' = 0xE9 — e comes first by binary
    expect(result).toBe('{"e":2,"é":1}');
  });

  it('Test 6: Identical output across multiple invocations (replay stability)', () => {
    const complex = {
      policy: { id: 'deny-all', namespace: 'security', version: 3 },
      metadata: { trust: true, score: 0.95 },
      dependencies: ['audit-log', 'auth-check'],
    };
    
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(stableCanonicalStringify(complex));
    }
    
    expect(results.size).toBe(1);
  });
});
