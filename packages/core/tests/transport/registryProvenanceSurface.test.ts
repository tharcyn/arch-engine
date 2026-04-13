import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.10: Registry Provenance Surface', () => {

  it('Test 1: Provenance attached to SnapshotEnvelope', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', {
      extends: [],
      manifestMetadata: { version: 1 }
    });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const env = entry.executionMetadata?.snapshotEnvelope;

    expect(env.registryProvenance).toBeDefined();
    expect(Array.isArray(env.registryProvenance)).toBe(true);
    expect(env.registryProvenance.length).toBeGreaterThan(0);
  });

  it('Test 2: Provenance entries have required fields', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', {
      extends: [],
      manifestMetadata: { version: 1 }
    });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const prov = entry.executionMetadata.snapshotEnvelope.registryProvenance[0];

    expect(typeof prov.namespace).toBe('string');
    expect(typeof prov.source).toBe('string');
    expect(typeof prov.uri).toBe('string');
    expect(prov.namespace).toBe('ns');
  });

  it('Test 3: Provenance is deterministically sorted', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });

    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(a.executionMetadata.snapshotEnvelope.registryProvenance)
      .toEqual(b.executionMetadata.snapshotEnvelope.registryProvenance);
  });

  it('Test 4: Provenance does NOT affect closureGraphHash', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });

    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // closureGraphHash should match loaderClosureMetadata (has no provenance input)
    expect(entry.loaderClosureMetadata?.snapshotClosureGraphHash)
      .toBe(entry.executionMetadata.snapshotEnvelope.snapshotClosureGraphHash);
  });

});
