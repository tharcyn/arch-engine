import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.9→4.11: Snapshot Envelope + Fingerprint Integration', () => {

  it('Test 1: Pipeline produces SnapshotEnvelope on executionMetadata', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', {
      extends: [],
      manifestMetadata: { version: 1 }
    });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(entry.executionMetadata?.snapshotEnvelope).toBeDefined();
    const env = entry.executionMetadata.snapshotEnvelope;
    expect(env.snapshotEnvelopeVersion).toBe('v3');
    expect(typeof env.policyStackFingerprint).toBe('string');
    expect(typeof env.snapshotClosureGraphHash).toBe('string');
    expect(typeof env.namespaceTrustPolicyHash).toBe('string');
    // Phase 4.10 fields
    expect(typeof env.manifestDigestSetHash).toBe('string');
    expect(env.loaderProtocolVersion).toBe('4.13');
    expect(Array.isArray(env.registryProvenance)).toBe(true);
    expect(env.registryProvenance.length).toBeGreaterThan(0);
    // Phase 4.11 fields
    expect(typeof env.registrySourceHash).toBe('string');
    expect(typeof env.dependencyGraphShapeHash).toBe('string');
    expect(typeof env.namespaceSetHash).toBe('string');
    expect(typeof env.explainabilityGraphHash).toBe('string');
    // Phase 4.13 field
    expect(typeof env.structureHash).toBe('string');
    expect(env.structureHash.length).toBe(64);
  });

  it('Test 2: Identical pipeline runs produce identical fingerprints', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', {
      extends: [],
      manifestMetadata: { version: 1 }
    });

    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(a.executionMetadata.policyStackFingerprint)
      .toBe(b.executionMetadata.policyStackFingerprint);
    expect(a.executionMetadata.extendedPolicyStackFingerprint)
      .toBe(b.executionMetadata.extendedPolicyStackFingerprint);
  });

  it('Test 3: allowImplicitTrustPolicy=false rejects without explicit trust', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { manifestMetadata: { version: 1 } });

    expect(() => {
      executeLoaderPipeline('policy://ns/id@1.0.0', adapter, {
        allowImplicitTrustPolicy: false
      });
    }).toThrow('implicit trust is disabled');
  });

  it('Test 4: allowImplicitTrustPolicy=false with explicit trust succeeds', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', {
      extends: [],
      manifestMetadata: { version: 1 }
    });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter, {
      allowImplicitTrustPolicy: false,
      trustPolicy: { trustedNamespaces: ['ns'], allowUntrustedNamespaces: true },
      scopedTrustPolicy: {
        scopes: { global: { trustedNamespaces: ['ns'], allowUntrustedNamespaces: true } },
        precedence: ['global']
      }
    });

    expect(entry.policyId).toBe('id');
    expect(entry.executionMetadata?.snapshotEnvelope).toBeDefined();
  });

});
