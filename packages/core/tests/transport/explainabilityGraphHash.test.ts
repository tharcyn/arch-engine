import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.11: Explainability Graph Hash', () => {

  it('Test 1: explainabilityGraphHash present on envelope', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(typeof entry.executionMetadata.snapshotEnvelope.explainabilityGraphHash).toBe('string');
    expect(entry.executionMetadata.snapshotEnvelope.explainabilityGraphHash.length).toBe(64);
  });

  it('Test 2: Deterministic across identical runs', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(a.executionMetadata.snapshotEnvelope.explainabilityGraphHash)
      .toBe(b.executionMetadata.snapshotEnvelope.explainabilityGraphHash);
  });

  it('Test 3: Same trust configuration produces same explainability hash', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const trustOpts = {
      trustPolicy: { trustedNamespaces: ['ns'], allowUntrustedNamespaces: true },
      scopedTrustPolicy: {
        scopes: { global: { trustedNamespaces: ['ns'], allowUntrustedNamespaces: true } },
        precedence: ['global'] as string[]
      }
    };
    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter, trustOpts);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter, trustOpts);
    expect(a.executionMetadata.snapshotEnvelope.explainabilityGraphHash)
      .toBe(b.executionMetadata.snapshotEnvelope.explainabilityGraphHash);
  });

});
