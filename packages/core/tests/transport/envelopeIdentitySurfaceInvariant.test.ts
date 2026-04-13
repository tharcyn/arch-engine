import { describe, it, expect } from 'vitest';
import { assertEnvelopeHashSurfaceSetInvariant } from '../../src/transport/assertEnvelopeHashSurfaceSetInvariant.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Phase 4.13: Envelope Identity-Surface Membership Guard', () => {

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
    structureHash: 'h10'
  });

  it('Test 1: Valid envelope passes invariant check', () => {
    expect(() => assertEnvelopeHashSurfaceSetInvariant(makeValidEnvelope())).not.toThrow();
  });

  it('Test 2: Missing identity surface throws error', () => {
    const env = makeValidEnvelope();
    delete (env as any).manifestDigestSetHash;
    expect(() => assertEnvelopeHashSurfaceSetInvariant(env)).toThrow('missing surfaces [manifestDigestSetHash]');
  });

  it('Test 3: Empty identity surface is rejected', () => {
    const env = makeValidEnvelope();
    env.policyStackFingerprint = '';
    expect(() => assertEnvelopeHashSurfaceSetInvariant(env)).toThrow('expected non-empty string');
  });

  it('Test 4: Identity surface must be a string', () => {
    const env = makeValidEnvelope();
    (env as any).namespaceTrustPolicyHash = null;
    expect(() => assertEnvelopeHashSurfaceSetInvariant(env)).toThrow('expected non-empty string, got object');
  });

});
