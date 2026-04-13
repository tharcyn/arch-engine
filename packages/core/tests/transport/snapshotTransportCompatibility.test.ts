import { describe, it, expect } from 'vitest';
import { certifySnapshotTransportCompatibility } from '../../src/transport/certifySnapshotTransportCompatibility.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';
import { computeSnapshotEnvelopeStructureHash } from '../../src/transport/snapshotEnvelopeStructureHash.js';

describe('Phase 4.13: SnapshotEnvelope Transport Compatibility Certification', () => {

  const makeValidEnvelope = (): SnapshotEnvelope => {
    const env: any = {
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
        explainabilityGraphHash: 'h9'
    };
    env.structureHash = computeSnapshotEnvelopeStructureHash(env);
    return env;
  };

  it('Test 1: Valid envelope passes compatibility certification', () => {
    const env = makeValidEnvelope();
    expect(() => certifySnapshotTransportCompatibility(env, env.structureHash)).not.toThrow();
  });

  it('Test 2: Missing loaderProtocolVersion throws failure', () => {
    const env = makeValidEnvelope();
    env.loaderProtocolVersion = '';
    expect(() => certifySnapshotTransportCompatibility(env, env.structureHash)).toThrow('loaderProtocolVersion missing');
  });

  it('Test 3: Missing snapshotEnvelopeVersion throws failure', () => {
    const env = makeValidEnvelope();
    env.snapshotEnvelopeVersion = '';
    expect(() => certifySnapshotTransportCompatibility(env, env.structureHash)).toThrow('snapshotEnvelopeVersion missing');
  });

  it('Test 4: Invalid structureHash format throws failure', () => {
    const env = makeValidEnvelope();
    expect(() => certifySnapshotTransportCompatibility(env, 'too_short')).toThrow('structureHash invalid');
  });

  it('Test 5: Multiple failures are aggregated in the error message', () => {
    const env = makeValidEnvelope();
    env.loaderProtocolVersion = '';
    env.policyStackFingerprint = '';
    
    let caught: any;
    try {
      certifySnapshotTransportCompatibility(env, env.structureHash);
    } catch (e) {
      caught = e;
    }
    
    expect(caught.message).toContain('loaderProtocolVersion missing');
    expect(caught.message).toContain('policyStackFingerprint missing');
  });

});
