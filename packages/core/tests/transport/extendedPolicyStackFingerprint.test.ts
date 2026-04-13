import { describe, it, expect } from 'vitest';
import { computeExtendedPolicyStackFingerprint } from '../../src/transport/policyStackFingerprint.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.10: Extended PolicyStackFingerprint', () => {

  it('Test 1: Extended fingerprint is deterministic', () => {
    const a = computeExtendedPolicyStackFingerprint('closure', 'scope', 'trust', 'manifest');
    const b = computeExtendedPolicyStackFingerprint('closure', 'scope', 'trust', 'manifest');
    expect(a).toBe(b);
  });

  it('Test 2: Different manifestDigestSetHash produces different extended fingerprint', () => {
    const a = computeExtendedPolicyStackFingerprint('closure', 'scope', 'trust', 'manifestA');
    const b = computeExtendedPolicyStackFingerprint('closure', 'scope', 'trust', 'manifestB');
    expect(a).not.toBe(b);
  });

  it('Test 3: Extended fingerprint differs from standard fingerprint', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    const standard = entry.executionMetadata.policyStackFingerprint;
    const extended = entry.executionMetadata.extendedPolicyStackFingerprint;

    expect(typeof standard).toBe('string');
    expect(typeof extended).toBe('string');
    // Extended includes manifest entropy, so it should differ from standard
    expect(extended).not.toBe(standard);
  });

  it('Test 4: Extended fingerprint stable across identical pipeline runs', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });

    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(a.executionMetadata.extendedPolicyStackFingerprint)
      .toBe(b.executionMetadata.extendedPolicyStackFingerprint);
  });

  it('Test 5: Standard PolicyStackFingerprint unchanged by manifest entropy', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Standard fingerprint should match the one on the envelope
    expect(entry.executionMetadata.policyStackFingerprint)
      .toBe(entry.executionMetadata.snapshotEnvelope.policyStackFingerprint);
  });

});
