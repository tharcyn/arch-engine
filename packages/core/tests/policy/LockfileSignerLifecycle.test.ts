import { describe, expect, test } from 'vitest';
import { auditTrustPolicyConfig } from '../../src/policy/auditTrustPolicyConfig';
import { signPolicyRegistryLockfile } from '../../src/policy/signPolicyRegistryLockfile';
import { verifyPolicyRegistryLockfileSignature } from '../../src/policy/verifyPolicyRegistryLockfileSignature';
import { StaticLockfileSignerStore } from '../../src/policy/LockfileSignerStore';
import { StaticLockfileTrustStore } from '../../src/policy/LockfileTrustStore';
import type { TrustPolicyConfig } from '../../src/trust/TrustPolicyConfig';
import type { PolicyRegistryLockfile } from '../../src/policy/PolicyRegistryLockfile';

describe('Lockfile Signer Lifecycle and Rollover', () => {
  const dummyKey = '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----';
  const dummyPubKey = '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAxP6/J...=\n-----END PUBLIC KEY-----';
  
  test('doctor catches missing replacement target', () => {
    const config: TrustPolicyConfig = {
      lockfileSigners: {
        'old-key': { key: dummyKey, status: 'verify-only', allowedOperations: ['verify'], replacementKeyId: 'new-key' }
      }
    };
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('invalid');
    expect(result.findings.some(f => f.code === 'MISSING_REPLACEMENT_TARGET')).toBe(true);
  });

  test('doctor catches verify-only signers trying to sign', () => {
    const config: TrustPolicyConfig = {
      lockfileSigners: {
        'old-key': { key: dummyKey, status: 'verify-only', allowedOperations: ['verify', 'sign'] }
      }
    };
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('invalid');
    expect(result.findings.some(f => f.code === 'VERIFY_ONLY_SIGNER_CANNOT_SIGN')).toBe(true);
  });

  test('doctor catches retired signers with active operations', () => {
    const config: TrustPolicyConfig = {
      lockfileSigners: {
        'old-key': { key: dummyKey, status: 'retired', allowedOperations: ['verify'] }
      }
    };
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('invalid');
    expect(result.findings.some(f => f.code === 'RETIRED_SIGNER_ACTIVE_OPERATIONS')).toBe(true);
  });

  test('signing rejects verify-only and retired signers', () => {
    const signerStore = new StaticLockfileSignerStore({}, {
      'active-key': { key: dummyKey, status: 'active', allowedOperations: ['sign', 'verify'] },
      'verify-key': { key: dummyKey, status: 'verify-only', allowedOperations: ['verify'] },
      'retired-key': { key: dummyKey, status: 'retired', allowedOperations: [] }
    });

    const lockfile: PolicyRegistryLockfile = { lockfileSurfaceVersion: '1.0.0', registries: [] };

    const activeSign = signPolicyRegistryLockfile(lockfile, 'active-key', signerStore);
    expect(activeSign.success).toBe(true);

    const verifySign = signPolicyRegistryLockfile(lockfile, 'verify-key', signerStore);
    expect(verifySign.success).toBe(false);
    expect(verifySign.diagnostic.message).toContain('verify-only');

    const retiredSign = signPolicyRegistryLockfile(lockfile, 'retired-key', signerStore);
    expect(retiredSign.success).toBe(false);
    expect(retiredSign.diagnostic.message).toContain('retired');
  });

  test('verification rejects retired signers but allows verify-only', () => {
    const trustStore = new StaticLockfileTrustStore({}, {
      'verify-key': { key: dummyPubKey, status: 'verify-only', allowedOperations: ['verify'] },
      'retired-key': { key: dummyPubKey, status: 'retired', allowedOperations: [] }
    });

    const lockfile: PolicyRegistryLockfile = { 
      lockfileSurfaceVersion: '1.0.0', 
      registries: [],
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'retired-key',
      signature: 'deadbeef'
    };

    const tmpPath = require('node:path').join(__dirname, 'tmp-lock.json');
    require('node:fs').writeFileSync(tmpPath, JSON.stringify(lockfile));

    try {
      const retiredVerify = verifyPolicyRegistryLockfileSignature(tmpPath, { enforcementMode: 'require-signature', quorum: 1 }, trustStore);
      expect(retiredVerify.verified).toBe(false);
      expect(retiredVerify.diagnostic.failureReason).toBe('UNAUTHORIZED_OPERATION');
    } finally {
      require('node:fs').unlinkSync(tmpPath);
    }
  });
});
