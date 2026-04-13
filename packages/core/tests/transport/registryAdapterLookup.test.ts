import { describe, it, expect } from 'vitest';
import { MockRegistryAdapter } from '../../../testing/adapters/MockRegistryAdapter.js';

describe('Phase 4: Registry Adapter', () => {

  it('Test 1: Lookup resolves versions and source correctly', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('platform', 'auth', '2.0.0', {});
    adapter.seed('platform', 'auth', '2.1.0', {});

    const res = adapter.lookup('platform', 'auth');
    expect(res.namespace).toBe('platform');
    expect(res.policyId).toBe('auth');
    expect(res.availableVersions).toEqual(['2.0.0', '2.1.0']);
    expect(res.registrySource).toBe('default_registry');
  });

  it('Test 2: Lockfile binding affects resolution', () => {
    const adapter = new MockRegistryAdapter();
    adapter.seed('platform', 'auth', '2.0.0', {});
    
    const lockfiles = [{ namespace: 'platform', id: 'auth', lockedVersion: '2.0.0' }];
    const res = adapter.lookup('platform', 'auth', lockfiles);
    expect(res.registrySource).toBe('lockfile');
  });

});
