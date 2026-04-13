import { describe, it, expect } from 'vitest';
import { computeSnapshotEnvelopeStructureHash } from '../../src/transport/snapshotEnvelopeStructureHash.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Phase 4.13: SnapshotEnvelope Structural Digest Surface', () => {

  const makeValidEnvelope = (): SnapshotEnvelope => ({
    snapshotClosureGraphHash: 'h1',
    closureGraphContractVersion: 'v1',
    namespaceTrustPolicyVersion: 'v1',
    namespaceTrustPolicyHash: 'h2',
    namespaceTrustScopeHash: 'h3',
    activeTrustScopes: ['global'],
    policyStackFingerprint: 'h4',
    snapshotEnvelopeVersion: 'v3',
    registryProvenance: [],
    manifestDigestSetHash: 'h5',
    loaderProtocolVersion: '4.13',
    registrySourceHash: 'h6',
    dependencyGraphShapeHash: 'h7',
    namespaceSetHash: 'h8',
    explainabilityGraphHash: 'h9',
    structureHash: '' // It wouldn't normally be here before computing, but type system expects it
  });

  it('Test 1: Structure hash is deterministic', () => {
    const env1 = makeValidEnvelope();
    const env2 = makeValidEnvelope();
    // scramble keys
    const env3 = {} as any;
    const keys = Object.keys(env2).reverse();
    for (const k of keys) {
        env3[k] = (env2 as any)[k];
    }

    const hash1 = computeSnapshotEnvelopeStructureHash(env1);
    const hash2 = computeSnapshotEnvelopeStructureHash(env2);
    const hash3 = computeSnapshotEnvelopeStructureHash(env3 as SnapshotEnvelope);

    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  it('Test 2: Structure hash produces 64-char SHA256 hex string', () => {
    const hash = computeSnapshotEnvelopeStructureHash(makeValidEnvelope());
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it('Test 3: Structure hash changes if fields are added or removed', () => {
    const envBase = makeValidEnvelope();
    const hashBase = computeSnapshotEnvelopeStructureHash(envBase);

    const envRemoved = { ...envBase };
    delete (envRemoved as any).activeTrustScopes;
    const hashRemoved = computeSnapshotEnvelopeStructureHash(envRemoved);

    const envAdded = { ...envBase, extra: 'x' };
    const hashAdded = computeSnapshotEnvelopeStructureHash(envAdded as any);

    expect(hashBase).not.toBe(hashRemoved);
    expect(hashBase).not.toBe(hashAdded);
    expect(hashRemoved).not.toBe(hashAdded);
  });

});
