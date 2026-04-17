import { describe, expect, test, vi } from 'vitest';
import { refreshPolicyRegistryLockfile } from '../../src/policy/refreshPolicyRegistryLockfile';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from '../../src/policy/PolicyRegistryLockfile';
import { StaticLockfileSignerStore } from '../../src/policy/LockfileSignerStore';

describe('refreshPolicyRegistryLockfile', () => {
  const liveRegistries: PolicyRegistryLockEntry[] = [
    {
      registryUrl: 'https://registry.example.com',
      packs: [
        { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' },
      ]
    }
  ];

  const signerStore = new StaticLockfileSignerStore(
    { 'test-key': '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----' },
    {}
  );

  test('missing lockfile refresh behavior', () => {
    const result = refreshPolicyRegistryLockfile(liveRegistries, undefined);
    
    expect(result.success).toBe(true);
    expect(result.diagnostic.driftDetected).toBe(true);
    expect(result.diagnostic.lockfileRewritten).toBe(true);
    expect(result.diagnostic.signatureInvalidated).toBe(false);
    expect(result.lockfile.registries).toEqual(liveRegistries);
  });

  test('already-fresh lockfile behavior', () => {
    const existing: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries
    };

    const result = refreshPolicyRegistryLockfile(liveRegistries, existing);
    
    expect(result.success).toBe(true);
    expect(result.diagnostic.driftDetected).toBe(false);
    expect(result.diagnostic.lockfileRewritten).toBe(false);
    expect(result.diagnostic.signatureInvalidated).toBe(false);
  });

  test('stale lockfile refresh behavior', () => {
    const existing: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: []
    };

    const result = refreshPolicyRegistryLockfile(liveRegistries, existing);
    
    expect(result.success).toBe(true);
    expect(result.diagnostic.driftDetected).toBe(true);
    expect(result.diagnostic.lockfileRewritten).toBe(true);
    expect(result.diagnostic.signatureInvalidated).toBe(false);
    expect(result.lockfile.registries).toEqual(liveRegistries);
  });

  test('signature invalidation on changed payloads without re-signing', () => {
    const existing: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [],
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'old-key',
      signature: 'deadbeef'
    };

    const result = refreshPolicyRegistryLockfile(liveRegistries, existing);
    
    expect(result.success).toBe(true);
    expect(result.diagnostic.driftDetected).toBe(true);
    expect(result.diagnostic.lockfileRewritten).toBe(true);
    expect(result.diagnostic.signatureInvalidated).toBe(true);
    expect(result.lockfile.signatures).toBeUndefined();
    expect((result.lockfile as any).signature).toBeUndefined();
  });

  test('refresh plus successful re-sign', () => {
    const existing: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [],
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'old-key',
      signature: 'deadbeef'
    };

    const result = refreshPolicyRegistryLockfile(liveRegistries, existing, {
        signatureKeyId: 'test-key',
        signerStore
    });
    
    expect(result.success).toBe(true);
    expect(result.diagnostic.driftDetected).toBe(true);
    expect(result.diagnostic.lockfileRewritten).toBe(true);
    expect(result.diagnostic.resignAttempted).toBe(true);
    expect(result.diagnostic.resignSuccess).toBe(true);
    expect(result.lockfile.signatures?.[0].signatureAlgorithm).toBe('ed25519');
    expect(result.lockfile.signatures?.[0].signatureKeyId).toBe('test-key');
    expect(result.lockfile.signatures?.[0].signature).toBeDefined();
  });

  test('unauthorized signer rejection during refresh-plus-sign', () => {
    const existing: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: []
    };

    // Use a store that only allows 'verify'
    const lockedStore = new StaticLockfileSignerStore(
      {},
      {
        'locked-key': {
            enabled: true,
            allowedOperations: ['verify'],
            key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----'
        }
      }
    );

    const result = refreshPolicyRegistryLockfile(liveRegistries, existing, {
        signatureKeyId: 'locked-key',
        signerStore: lockedStore
    });
    
    expect(result.success).toBe(false);
    expect(result.diagnostic.resignAttempted).toBe(true);
    expect(result.diagnostic.resignSuccess).toBe(false);
    expect(result.diagnostic.error).toContain('not authorized for signing');
  });

  test('signature normalization behavior when no drift is detected', () => {
    const existing: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      signatures: [
          { signatureKeyId: 'z-key', signatureAlgorithm: 'ed25519', signature: 'sig-z' },
          { signatureKeyId: 'a-key', signatureAlgorithm: 'ed25519', signature: 'sig-a' },
          { signatureKeyId: 'a-key', signatureAlgorithm: 'ed25519', signature: 'sig-a-dup' }
      ]
    };

    const result = refreshPolicyRegistryLockfile(liveRegistries, existing);
    
    expect(result.success).toBe(true);
    expect(result.diagnostic.driftDetected).toBe(false);
    expect(result.lockfile.signatures?.length).toBe(2);
    expect(result.lockfile.signatures?.[0].signatureKeyId).toBe('a-key');
    expect(result.lockfile.signatures?.[0].signature).toBe('sig-a'); // First seen is kept
    expect(result.lockfile.signatures?.[1].signatureKeyId).toBe('z-key');
  });
});
