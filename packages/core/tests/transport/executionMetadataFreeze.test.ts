import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4.11: Execution Metadata Freeze', () => {

  it('Test 1: executionMetadata is frozen after pipeline', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(Object.isFrozen(entry.executionMetadata)).toBe(true);
  });

  it('Test 2: Frozen metadata rejects mutation', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // In strict mode this throws; in non-strict it silently fails
    expect(() => {
      'use strict';
      (entry.executionMetadata as any).corruptedField = 'attack';
    }).toThrow();
  });

  it('Test 3: snapshotEnvelope preserved inside frozen metadata', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });
    const entry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    // Can still read
    expect(entry.executionMetadata.snapshotEnvelope).toBeDefined();
    expect(entry.executionMetadata.policyStackFingerprint).toBeDefined();
  });

});
