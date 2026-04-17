import { describe, expect, test, vi } from 'vitest';
import { assessLockfileRuntimeReadiness } from '../../src/policy/assessLockfileRuntimeReadiness';
import type { TrustPolicyConfig } from '../../src/trust/TrustPolicyConfig';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from '../../src/policy/PolicyRegistryLockfile';

import { verifyPolicyRegistryLockfileSignature } from '../../src/policy/verifyPolicyRegistryLockfileSignature';

vi.mock('../../src/policy/verifyPolicyRegistryLockfileSignature', () => ({
  verifyPolicyRegistryLockfileSignature: vi.fn()
}));

describe('assessLockfileRuntimeReadiness', () => {
  const liveRegistries: PolicyRegistryLockEntry[] = [
    {
      registryUrl: 'https://registry.example.com',
      packs: [
        { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' }
      ]
    }
  ];

  test('healthy ready state', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    };
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'valid-signature'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: true, diagnostic: { success: true } } as any);
    const result = assessLockfileRuntimeReadiness(config, 'path', lockfile, liveRegistries);
    expect(result.status).toBe('ready');
  });

  test('stale lockfile under strict freshness enforcement', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature-and-freshness',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    };
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [], // stale
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'valid-signature'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: true, diagnostic: { success: true } } as any);
    const result = assessLockfileRuntimeReadiness(config, 'path', lockfile, liveRegistries);
    expect(result.status).toBe('blocked');
    expect(result.enforcement?.failureReason).toBe('STALE_LOCKFILE');
  });

  test('invalid trust policy state', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: 'not-a-pem',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    };
    const result = assessLockfileRuntimeReadiness(config, 'path', undefined, liveRegistries);
    expect(result.status).toBe('invalid');
  });

  test('missing lockfile in strict mode', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    };
    const result = assessLockfileRuntimeReadiness(config, 'path', undefined, liveRegistries);
    expect(result.status).toBe('blocked');
    expect(result.enforcement?.failureReason).toBe('MISSING_LOCKFILE');
  });

  test('permissive mode with missing lockfile', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'permissive'
    };
    const result = assessLockfileRuntimeReadiness(config, 'path', undefined, liveRegistries);
    expect(result.status).toBe('ready');
    expect(result.enforcement?.allowed).toBe(true);
  });

  test('unsigned lockfile under signature-required mode', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    };
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries
    };
    const result = assessLockfileRuntimeReadiness(config, 'path', lockfile, liveRegistries);
    expect(result.status).toBe('blocked');
    expect(result.enforcement?.failureReason).toBe('MISSING_SIGNATURE');
  });
});
