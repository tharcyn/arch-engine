import { describe, it, expect } from 'vitest';
import { certifyMetadataGraphShapeInvariant } from '../../src/transport/certifyMetadataGraphShapeInvariant.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.13: Metadata Graph Shape Invariant', () => {

  it('Test 1: Valid pipeline output passes graph shape certification', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(() => certifyMetadataGraphShapeInvariant([entry], entry, entry.executionMetadata.snapshotEnvelope)).not.toThrow();
  });

  it('Test 2: Discrepancy between entries length and adjacency length throws', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Simulate extra entry that doesn't exist in adjacency
    const mockEntry = { policyId: 'mock' } as any;

    expect(() => certifyMetadataGraphShapeInvariant([entry, mockEntry], entry, entry.executionMetadata.snapshotEnvelope)).toThrow('Metadata graph shape inconsistent');
  });

  it('Test 3: Root entry depth must be zero', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    const clonedMeta = { ...entry.executionMetadata, dependencyDepth: 1 };
    const mockEntry = { ...entry, executionMetadata: clonedMeta } as any;

    expect(() => certifyMetadataGraphShapeInvariant([mockEntry], mockEntry, entry.executionMetadata.snapshotEnvelope)).toThrow('expected 0');
  });

  it('Test 4: Missing dependencyGraphShapeHash on envelope throws', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    const mockEnv = { ...entry.executionMetadata.snapshotEnvelope };
    delete (mockEnv as any).dependencyGraphShapeHash;

    expect(() => certifyMetadataGraphShapeInvariant([entry], entry, mockEnv as any)).toThrow('dependencyGraphShapeHash missing');
  });

  it('Test 5: Duplicate stack indices throws error', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Create 2 entries with same index
    const mockEntry = { ...entry } as any;

    // Both point to same execution metadata with index 0, length = 2, adjacency length needs to be 2
    const clonedMeta = { ...entry.executionMetadata };
    clonedMeta.dependencyAdjacencySurface = { a: [], b: [] }; // length 2
    mockEntry.executionMetadata = clonedMeta;

    expect(() => certifyMetadataGraphShapeInvariant([mockEntry, mockEntry], mockEntry, entry.executionMetadata.snapshotEnvelope)).toThrow('duplicate stackIndex values detected');
  });

});
