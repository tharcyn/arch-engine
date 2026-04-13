import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.11: Namespace Set Hash', () => {

  it('Test 1: namespaceSetHash present on envelope', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(typeof entry.executionMetadata.snapshotEnvelope.namespaceSetHash).toBe('string');
    expect(entry.executionMetadata.snapshotEnvelope.namespaceSetHash.length).toBe(64);
  });

  it('Test 2: Deterministic across identical runs', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(a.executionMetadata.snapshotEnvelope.namespaceSetHash)
      .toBe(b.executionMetadata.snapshotEnvelope.namespaceSetHash);
  });

  it('Test 3: Does not affect closureGraphHash', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(entry.executionMetadata.snapshotEnvelope.namespaceSetHash)
      .not.toBe(entry.executionMetadata.snapshotEnvelope.snapshotClosureGraphHash);
  });

});
