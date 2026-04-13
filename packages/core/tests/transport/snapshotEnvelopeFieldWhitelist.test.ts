import { describe, it, expect } from 'vitest';
import { assertSnapshotEnvelopeFieldWhitelist, SNAPSHOT_ENVELOPE_V3_REQUIRED_FIELDS } from '../../src/transport/assertSnapshotEnvelopeFieldWhitelist.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Phase 4.12: Snapshot Envelope Field Whitelist', () => {

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

  it('Test 1: Valid envelope passes whitelist', () => {
    expect(() => assertSnapshotEnvelopeFieldWhitelist(makeValidEnvelope())).not.toThrow();
  });

  it('Test 2: Unknown field injection rejected', () => {
    const env = makeValidEnvelope();
    (env as any).injectedField = 'attack';
    expect(() => assertSnapshotEnvelopeFieldWhitelist(env)).toThrow('field drift');
    expect(() => assertSnapshotEnvelopeFieldWhitelist(env)).toThrow('injectedField');
  });

  it('Test 3: Missing required field rejected', () => {
    const env = makeValidEnvelope();
    delete (env as any).policyStackFingerprint;
    expect(() => assertSnapshotEnvelopeFieldWhitelist(env)).toThrow('policyStackFingerprint');
  });

  it('Test 4: Required fields constant is correct length', () => {
    // v3 has 15 required fields (14 original + structureHash)
    expect(SNAPSHOT_ENVELOPE_V3_REQUIRED_FIELDS.length).toBe(15);
  });

  it('Test 5: Multiple unknown fields reported', () => {
    const env = makeValidEnvelope();
    (env as any).field1 = 'x';
    (env as any).field2 = 'y';
    expect(() => assertSnapshotEnvelopeFieldWhitelist(env)).toThrow('field1');
  });

});
