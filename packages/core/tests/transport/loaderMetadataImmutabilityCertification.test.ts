import { describe, it, expect } from 'vitest';
import { certifyLoaderMetadataImmutability } from '../../src/transport/certifyLoaderMetadataImmutability.js';
import { isDeeplyFrozen, deepFreezeDeterministic } from '../../src/transport/deepFreezeDeterministic.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.12: Loader Metadata Immutability Certification', () => {

  it('Test 1: Pipeline output passes immutability certification', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(() => certifyLoaderMetadataImmutability([entry], entry)).not.toThrow();
  });

  it('Test 2: Pipeline executionMetadata is deeply frozen', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(isDeeplyFrozen(entry.executionMetadata)).toBe(true);
  });

  it('Test 3: SnapshotEnvelope is deeply frozen', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(isDeeplyFrozen(entry.executionMetadata.snapshotEnvelope)).toBe(true);
  });

  it('Test 4: Nested snapshotEnvelope.registryProvenance is frozen', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const provenance = entry.executionMetadata.snapshotEnvelope.registryProvenance;
    expect(Object.isFrozen(provenance)).toBe(true);
    if (provenance.length > 0) {
      expect(Object.isFrozen(provenance[0])).toBe(true);
    }
  });

  it('Test 5: Not-deeply-frozen throws LOADER_METADATA_NOT_DEEPLY_FROZEN', () => {
    const entry = {
      policyId: 'x', policyNamespace: 'ns', hash: 'h', config: { version: 1 },
      executionMetadata: { nested: { mutable: true } }
    } as any;
    // Only shallow freeze
    Object.freeze(entry.executionMetadata);
    expect(() => certifyLoaderMetadataImmutability([entry], entry)).toThrow('not deeply frozen');
  });

});
