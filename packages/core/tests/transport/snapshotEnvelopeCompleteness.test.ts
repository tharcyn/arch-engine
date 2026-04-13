import { describe, it, expect } from 'vitest';
import { validateSnapshotEnvelopeCompleteness } from '../../src/transport/validateSnapshotEnvelopeCompleteness.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Phase 4.10+4.11: Snapshot Envelope Completeness Certification', () => {

  const makeCompleteEnvelope = (): SnapshotEnvelope => ({
    snapshotClosureGraphHash: 'abc123',
    closureGraphContractVersion: 'v1',
    namespaceTrustPolicyVersion: 'v1',
    namespaceTrustPolicyHash: 'trust_hash',
    namespaceTrustScopeHash: 'scope_hash',
    activeTrustScopes: ['global'],
    policyStackFingerprint: 'fingerprint_abc',
    snapshotEnvelopeVersion: 'v3',
    registryProvenance: [{ namespace: 'ns', source: 'default', uri: 'policy://ns/id' }],
    manifestDigestSetHash: 'digest_hash',
    loaderProtocolVersion: '4.13',
    registrySourceHash: 'registry_source_hash',
    dependencyGraphShapeHash: 'dep_graph_shape_hash',
    namespaceSetHash: 'ns_set_hash',
    explainabilityGraphHash: 'explain_hash',
    structureHash: 'structure_hash_64chars_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });

  it('Test 1: Complete envelope passes validation', () => {
    expect(() => validateSnapshotEnvelopeCompleteness(makeCompleteEnvelope())).not.toThrow();
  });

  it('Test 2: Missing closureGraphHash throws SNAPSHOT_ENVELOPE_INCOMPLETE', () => {
    const env = makeCompleteEnvelope();
    (env as any).snapshotClosureGraphHash = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('snapshotClosureGraphHash');
  });

  it('Test 3: Missing manifestDigestSetHash detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).manifestDigestSetHash = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('manifestDigestSetHash');
  });

  it('Test 4: Missing registryProvenance detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).registryProvenance = null;
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('registryProvenance');
  });

  it('Test 5: Missing loaderProtocolVersion detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).loaderProtocolVersion = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('loaderProtocolVersion');
  });

  it('Test 6: Missing fingerprint detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).policyStackFingerprint = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('policyStackFingerprint');
  });

  it('Test 7: Multiple missing fields reported together', () => {
    const env = makeCompleteEnvelope();
    (env as any).snapshotClosureGraphHash = '';
    (env as any).policyStackFingerprint = '';
    try {
      validateSnapshotEnvelopeCompleteness(env);
      expect.fail('should throw');
    } catch (e: any) {
      expect(e.message).toContain('snapshotClosureGraphHash');
      expect(e.message).toContain('policyStackFingerprint');
    }
  });

  // Phase 4.11 fields
  it('Test 8: Missing registrySourceHash detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).registrySourceHash = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('registrySourceHash');
  });

  it('Test 9: Missing dependencyGraphShapeHash detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).dependencyGraphShapeHash = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('dependencyGraphShapeHash');
  });

  it('Test 10: Missing namespaceSetHash detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).namespaceSetHash = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('namespaceSetHash');
  });

  it('Test 11: Missing explainabilityGraphHash detected', () => {
    const env = makeCompleteEnvelope();
    (env as any).explainabilityGraphHash = '';
    expect(() => validateSnapshotEnvelopeCompleteness(env)).toThrow('explainabilityGraphHash');
  });

});
