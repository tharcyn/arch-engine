import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { composePolicies } from '../../src/policy/compositionResolver.js';
import type { PolicyStackEntry } from '../../src/policy/types.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  PHASE −1: Serialization Canonicalization Contract
 * ═══════════════════════════════════════════════════════════
 *
 *  PURPOSE: Prove the sortObj → JSON.stringify → sha256 pipeline
 *  produces stable, canonicalized output regardless of:
 *  - Object key insertion order
 *  - Undefined/null field presence
 *  - Array element ordering
 *  - Nested depth
 *  - Unicode content
 *
 *  INVARIANTS CERTIFIED:
 *  1. sortObj is pure (no side effects, no mutation)
 *  2. Undefined values are stripped by JSON.parse(JSON.stringify())
 *  3. Null values are preserved
 *  4. Array ordering is preserved (not sorted)
 *  5. Nested objects are recursively sorted
 *  6. Unicode content does not affect canonicalization
 */

const FIXTURE_PATH = path.join(__dirname, '../fixtures/determinism/serializationCanonical.snapshot.json');

/** Exact replica of the sortObj function from compositionResolver.ts and parser.ts */
function sortObj(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObj);
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = sortObj(obj[key]);
    return acc;
  }, {} as any);
}

function canonicalize(input: any): string {
  const stripped = JSON.parse(JSON.stringify(input));
  return JSON.stringify(sortObj(stripped));
}

function hashCanonical(input: any): string {
  return crypto.createHash('sha256').update(canonicalize(input)).digest('hex');
}

// ─── TESTS ─────────────────────────────────────────────────

describe('Phase −1: Serialization Canonicalization Contract', () => {

  it('1. sortObj is key-ordering independent', () => {
    const a = { z: 1, a: 2, m: { y: 3, b: 4 } };
    const b = { a: 2, m: { b: 4, y: 3 }, z: 1 };

    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(hashCanonical(a)).toBe(hashCanonical(b));
  });

  it('2. undefined values are stripped (JSON.parse/stringify contract)', () => {
    const withUndef = { a: 1, b: undefined, c: 3 };
    const withoutUndef = { a: 1, c: 3 };

    expect(canonicalize(withUndef)).toBe(canonicalize(withoutUndef));
  });

  it('3. null values are preserved (not stripped)', () => {
    const withNull = { a: 1, b: null, c: 3 };
    const withoutB = { a: 1, c: 3 };

    expect(canonicalize(withNull)).not.toBe(canonicalize(withoutB));
  });

  it('4. array element ordering is preserved (NOT sorted)', () => {
    const a = { rules: [{ from: 'z' }, { from: 'a' }] };
    const b = { rules: [{ from: 'a' }, { from: 'z' }] };

    // Arrays keep order → different canonical forms
    expect(canonicalize(a)).not.toBe(canonicalize(b));
  });

  it('5. deeply nested objects are recursively canonicalized', () => {
    const a = { l1: { l2: { l3: { z: 1, a: 2 } } } };
    const b = { l1: { l2: { l3: { a: 2, z: 1 } } } };

    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('6. empty objects/arrays canonicalize identically', () => {
    const a = { rules: {}, domains: {} };
    const b = { domains: {}, rules: {} };

    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it('7. numeric types are preserved (no string coercion)', () => {
    const a = { version: 1, depth: 0, score: 0.95 };
    const canonical = canonicalize(a);

    expect(canonical).toContain('"depth":0');
    expect(canonical).toContain('"score":0.95');
    expect(canonical).toContain('"version":1');
    expect(canonical).not.toContain('"0"');
  });

  it('8. Unicode content hashes deterministically', () => {
    const config: PolicyStackEntry = {
      policyId: 'unicode-test',
      hash: 'frozen',
      config: {
        version: 1,
        rules: {
          forbid: [{ id: '規則-①', from: 'アプリ', to: 'インフラ', severity: 'error' }]
        }
      }
    };

    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      results.add(composePolicies([config]).effectiveHash);
    }
    expect(results.size).toBe(1);
  });

  it('9. sortObj is pure — does not mutate input', () => {
    const original = { z: 1, a: { y: 2, b: 3 } };
    const originalJSON = JSON.stringify(original);
    
    sortObj(original);
    
    // Input must be unchanged
    expect(JSON.stringify(original)).toBe(originalJSON);
  });

  it('10. composition produces identical hash for semantically identical stacks', () => {
    // Two stacks with same rules but different object creation order
    const stackA: PolicyStackEntry[] = [
      { policyId: 'p1', hash: 'h1', config: { version: 1, mode: 'enforce', rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'error' }] } } }
    ];
    const stackB: PolicyStackEntry[] = [
      { policyId: 'p1', hash: 'h1', config: { version: 1, rules: { forbid: [{ id: 'r1', from: 'a', to: 'b', severity: 'error' }] }, mode: 'enforce' } }
    ];

    expect(composePolicies(stackA).effectiveHash).toBe(composePolicies(stackB).effectiveHash);
  });

  it('11. frozen fixture parity (PROTOCOL CONTRACT)', () => {
    const testCases = {
      keyOrder: canonicalize({ z: 1, a: 2, m: 3 }),
      nestedKeyOrder: canonicalize({ l1: { z: 1, a: 2 }, l2: { b: 3 } }),
      withUndefined: canonicalize({ a: 1, b: undefined }),
      withNull: canonicalize({ a: 1, b: null }),
      arrayPreserved: canonicalize({ arr: [3, 1, 2] }),
      emptyStruct: canonicalize({ a: {}, b: [] }),
    };

    const hashes = Object.fromEntries(
      Object.entries(testCases).map(([k, v]) => [k, crypto.createHash('sha256').update(v).digest('hex')])
    );

    if (!fs.existsSync(FIXTURE_PATH)) {
      fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
      fs.writeFileSync(FIXTURE_PATH, JSON.stringify({ canonicalForms: testCases, hashes }, null, 2) + '\n');
      console.log('[DETERMINISM] Created frozen serialization fixture:', FIXTURE_PATH);
      return;
    }

    const frozen = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'));

    // Validate both canonical forms AND hashes
    expect(testCases).toEqual(frozen.canonicalForms);
    expect(hashes).toEqual(frozen.hashes);
  });
});
