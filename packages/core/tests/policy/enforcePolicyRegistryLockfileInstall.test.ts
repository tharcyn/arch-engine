import { describe, expect, test, vi } from 'vitest';
import { enforcePolicyRegistryLockfileInstall } from '../../src/policy/enforcePolicyRegistryLockfileInstall';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from '../../src/policy/PolicyRegistryLockfile';
import { StaticLockfileTrustStore } from '../../src/policy/LockfileTrustStore';

import { verifyPolicyRegistryLockfileSignature } from '../../src/policy/verifyPolicyRegistryLockfileSignature';

vi.mock('../../src/policy/verifyPolicyRegistryLockfileSignature', () => ({
  verifyPolicyRegistryLockfileSignature: vi.fn()
}));

describe('enforcePolicyRegistryLockfileInstall', () => {
  const liveRegistries: PolicyRegistryLockEntry[] = [
    {
      registryUrl: 'https://registry.example.com',
      packs: [
        { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' }
      ]
    }
  ];

  const trustStore = new StaticLockfileTrustStore({}, {});

  test('permissive mode behavior', () => {
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'permissive' }, 'path', undefined, liveRegistries, trustStore);
    expect(result.allowed).toBe(true);
    expect(result.mode).toBe('permissive');
    expect(result.lockfilePresent).toBe(false);
  });

  test('signature-required rejection for unsigned lockfiles', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: []
    };
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'require-signature' }, 'path', lockfile, liveRegistries, trustStore);
    expect(result.allowed).toBe(false);
    expect(result.failureReason).toBe('MISSING_SIGNATURE');
  });

  test('invalid signature rejection in install path', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'deadbeef'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: false, diagnostic: { failureReason: 'INVALID_SIGNATURE', message: 'invalid' } } as any);
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'require-signature' }, 'path', lockfile, liveRegistries, trustStore);
    expect(result.allowed).toBe(false);
    expect(result.failureReason).toBe('INVALID_SIGNATURE');
  });

  test('unauthorized signer rejection in install path', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'unauth-key',
      signature: 'unauth-signature'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: false, diagnostic: { failureReason: 'UNAUTHORIZED_OPERATION', message: 'unauth' } } as any);
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'require-signature' }, 'path', lockfile, liveRegistries, trustStore);
    expect(result.allowed).toBe(false);
    expect(result.failureReason).toBe('UNAUTHORIZED_OPERATION');
  });

  test('signature-required success for trusted signed lockfiles', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'valid-signature'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: true, diagnostic: { success: true } } as any);
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'require-signature' }, 'path', lockfile, liveRegistries, trustStore);
    expect(result.allowed).toBe(true);
    expect(result.verificationSuccess).toBe(true);
  });

  test('freshness-required rejection for stale lockfiles', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [], // stale
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'valid-signature'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: true, diagnostic: { success: true } } as any);
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'require-signature-and-freshness' }, 'path', lockfile, liveRegistries, trustStore);
    expect(result.allowed).toBe(false);
    expect(result.verificationSuccess).toBe(true);
    expect(result.freshnessSuccess).toBe(false);
    expect(result.failureReason).toBe('STALE_LOCKFILE');
  });

  test('freshness-required success for trusted fresh lockfiles', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries, // fresh
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'valid-signature'
    };
    vi.mocked(verifyPolicyRegistryLockfileSignature).mockReturnValueOnce({ verified: true, diagnostic: { success: true } } as any);
    const result = enforcePolicyRegistryLockfileInstall({ enforcementMode: 'require-signature-and-freshness' }, 'path', lockfile, liveRegistries, trustStore);
    expect(result.allowed).toBe(true);
    expect(result.verificationSuccess).toBe(true);
    expect(result.freshnessSuccess).toBe(true);
  });
});
