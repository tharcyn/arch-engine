import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.11: Dependency Adjacency Surface', () => {

  it('Test 1: Adjacency surface present on executionMetadata', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    expect(entry.executionMetadata?.dependencyAdjacencySurface).toBeDefined();
    expect(typeof entry.executionMetadata.dependencyAdjacencySurface).toBe('object');
  });

  it('Test 2: Root entry appears as a key', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'root', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/root@1.0.0', adapter);
    const adj = entry.executionMetadata.dependencyAdjacencySurface;
    const keys = Object.keys(adj);
    expect(keys.some(k => k.includes('root'))).toBe(true);
  });

  it('Test 3: Adjacency deterministic across runs', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const a = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(JSON.stringify(a.executionMetadata.dependencyAdjacencySurface))
      .toBe(JSON.stringify(b.executionMetadata.dependencyAdjacencySurface));
  });

});
