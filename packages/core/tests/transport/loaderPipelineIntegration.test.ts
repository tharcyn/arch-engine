import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4: Loader Pipeline Integration', () => {

  it('Test 1: Full pipeline executes deterministically with exact version', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', {
      extends: ['parent'],
      manifestMetadata: { version: 1 }
    });

    // Phase 4.8: Use exact version instead of range (ranges now rejected)
    const stackEntry = executeLoaderPipeline('policy://ns/id@1.0.0', adapter);

    expect(stackEntry.policyId).toBe('id');
    expect(stackEntry.policyNamespace).toBe('ns');
    expect(stackEntry.config.extends).toEqual(['parent']);
    expect(stackEntry.config.version).toBe(1);
    expect(typeof stackEntry.hash).toBe('string');
  });

  it('Test 2: Pipeline rejects version ranges with SEMVER_RANGE_NOT_SUPPORTED', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'id', '1.0.0', { manifestMetadata: { version: 1 } });

    try {
      executeLoaderPipeline('policy://ns/id@^1.0.0', adapter);
      expect.fail('Should reject range');
    } catch (e: any) {
      expect(e.code).toBe('SEMVER_RANGE_NOT_SUPPORTED');
    }
  });

});
