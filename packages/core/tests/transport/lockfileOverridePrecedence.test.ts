import { describe, it, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4: Lockfile Override Precedence Integration', () => {

  it('Test 1: Lockfile pins exact version through pipeline', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('ns', 'auth', '1.0.0', { extends: ['v1'] });
    adapter.seed('ns', 'auth', '2.0.0', { extends: ['v2'] });

    // Phase 4.8: Use exact version. Lockfile pins to 2.0.0.
    const entry = executeLoaderPipeline('policy://ns/auth@1.0.0', adapter, {
      lockfileEntries: [{ namespace: 'ns', id: 'auth', lockedVersion: '2.0.0' }]
    });

    // Lockfile override should select 2.0.0 over the requested 1.0.0
    expect(entry.config.extends).toEqual(['v2']);
  });

});
