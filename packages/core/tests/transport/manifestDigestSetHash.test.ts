import { describe, it, expect } from 'vitest';
import { computeManifestDigest, computeManifestDigestSetHash } from '../../src/transport/manifestDigestSetHash.js';
import { PolicyStackEntry } from '../../src/policy/types.js';

describe('Phase 4.10: Manifest Digest Set Hash', () => {

  const makeEntry = (ns: string, id: string, version: number, hash: string): PolicyStackEntry => ({
    policyId: id,
    policyNamespace: ns,
    hash,
    config: { version }
  });

  it('Test 1: Individual manifest digest is deterministic', () => {
    const entry = makeEntry('ns', 'id', 1, 'abc123');
    const a = computeManifestDigest(entry);
    const b = computeManifestDigest(entry);
    expect(a).toBe(b);
  });

  it('Test 2: Different entries produce different digests', () => {
    const a = computeManifestDigest(makeEntry('ns', 'id', 1, 'abc'));
    const b = computeManifestDigest(makeEntry('ns', 'id', 2, 'def'));
    expect(a).not.toBe(b);
  });

  it('Test 3: Set hash is deterministic regardless of input order', () => {
    const entries = [
      makeEntry('ns', 'b', 1, 'hash_b'),
      makeEntry('ns', 'a', 1, 'hash_a'),
    ];
    const reversed = [...entries].reverse();

    const a = computeManifestDigestSetHash(entries);
    const b = computeManifestDigestSetHash(reversed);
    expect(a).toBe(b);
  });

  it('Test 4: Different sets produce different hashes', () => {
    const a = computeManifestDigestSetHash([makeEntry('ns', 'a', 1, 'h1')]);
    const b = computeManifestDigestSetHash([makeEntry('ns', 'b', 1, 'h2')]);
    expect(a).not.toBe(b);
  });

  it('Test 5: Empty entries produce a valid hash', () => {
    const hash = computeManifestDigestSetHash([]);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64); // SHA256 hex
  });

});
