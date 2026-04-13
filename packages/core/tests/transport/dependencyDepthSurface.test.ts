import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.11: Dependency Depth Surface', () => {

  it('Test 1: Root entry has depth 0', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'root', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/root@1.0.0', adapter);
    expect(entry.executionMetadata?.dependencyDepth).toBe(0);
  });

  it('Test 2: Depth is deterministic across runs', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'root', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const a = executeLoaderPipeline('policy://ns/root@1.0.0', adapter);
    const b = executeLoaderPipeline('policy://ns/root@1.0.0', adapter);
    expect(a.executionMetadata.dependencyDepth).toBe(b.executionMetadata.dependencyDepth);
  });

  it('Test 3: Depth is a non-negative integer', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'root', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/root@1.0.0', adapter);
    expect(typeof entry.executionMetadata.dependencyDepth).toBe('number');
    expect(entry.executionMetadata.dependencyDepth).toBeGreaterThanOrEqual(0);
  });

});
