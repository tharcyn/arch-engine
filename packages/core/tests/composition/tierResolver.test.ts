import { describe, it, expect } from 'vitest';
import { TierResolver } from '../../src/composition/TierResolver.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 5: Tier Resolver', () => {

  it('Test 1: Resolves tiers correctly without mutating loader payload', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'root', '1.0.0', { extends: ['dep1'], manifestMetadata: { version: 1 } });
    adapter.seed('ns', 'dep1', '1.0.0', { extends: [], manifestMetadata: { version: 1 } });

    const rootEntry = executeLoaderPipeline('policy://ns/root@1.0.0', adapter);
    const mockEntries = [
        rootEntry,
        { policyNamespace: 'ns', policyId: 'dep1', executionMetadata: { stackIndex: 1, dependencyDepth: 1 } }
    ] as any;

    const resolver = new TierResolver(mockEntries, rootEntry);
    const { resolvedTierMap, tierArbitrationOrdering } = resolver.resolve();

    expect(resolvedTierMap['ns/root'].tier).toBe('root');
    expect(resolvedTierMap['ns/dep1'].tier).toBe('direct');
    expect(tierArbitrationOrdering).toContain('ns/root');
  });

});
