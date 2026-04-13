import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.11: Registry Source Hash', () => {

  it('Test 1: registrySourceHash present on envelope', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(typeof entry.executionMetadata.snapshotEnvelope.registrySourceHash).toBe('string');
    expect(entry.executionMetadata.snapshotEnvelope.registrySourceHash.length).toBe(64);
  });

  it('Test 2: Deterministic across identical runs', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(a.executionMetadata.snapshotEnvelope.registrySourceHash)
      .toBe(b.executionMetadata.snapshotEnvelope.registrySourceHash);
  });

  it('Test 3: Does NOT affect closureGraphHash', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(entry.executionMetadata.snapshotEnvelope.registrySourceHash)
      .not.toBe(entry.executionMetadata.snapshotEnvelope.snapshotClosureGraphHash);
  });

});
