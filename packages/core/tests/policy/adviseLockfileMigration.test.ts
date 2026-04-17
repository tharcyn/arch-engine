import { describe, expect, test } from 'vitest';
import { adviseLockfileMigration } from '../../src/policy/adviseLockfileMigration';
import { StaticLockfileTrustStore } from '../../src/policy/LockfileTrustStore';
import type { PolicyRegistryLockfile } from '../../src/policy/PolicyRegistryLockfile';

describe('adviseLockfileMigration', () => {
  const dummyPubKey = '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAxP6/J...=\n-----END PUBLIC KEY-----';
  
  const trustStore = new StaticLockfileTrustStore({}, {
    'active-key': { key: dummyPubKey, status: 'active' },
    'verify-only-key': { key: dummyPubKey, status: 'verify-only', replacementKeyId: 'active-key' },
    'retired-key': { key: dummyPubKey, status: 'retired' },
    'legacy-with-absent-replacement': { key: dummyPubKey, status: 'verify-only', replacementKeyId: 'future-key' },
    'future-key': { key: dummyPubKey, status: 'active' }
  });

  const baseLockfile: PolicyRegistryLockfile = {
    lockfileSurfaceVersion: '1.0.0',
    registries: []
  };

  test('no-op advisory when already current (fully preferred active signature set)', () => {
    const lockfile: PolicyRegistryLockfile = {
      ...baseLockfile,
      signatures: [
        { signatureKeyId: 'active-key', signatureAlgorithm: 'ed25519', signature: 'sig' }
      ]
    };
    
    const result = adviseLockfileMigration(lockfile, trustStore);
    
    expect(result.isPreferredSignatureSet).toBe(true);
    expect(result.migrationRecommended).toBe(false);
    expect(result.legacyIdentitiesInUse).toHaveLength(0);
    expect(result.availableReplacements).toHaveLength(0);
    expect(result.suggestedCommand).toBeUndefined();
  });

  test('verify-only signer with replacement available', () => {
    const lockfile: PolicyRegistryLockfile = {
      ...baseLockfile,
      signatures: [
        { signatureKeyId: 'verify-only-key', signatureAlgorithm: 'ed25519', signature: 'sig' }
      ]
    };
    
    const result = adviseLockfileMigration(lockfile, trustStore);
    
    expect(result.isPreferredSignatureSet).toBe(false);
    expect(result.migrationRecommended).toBe(true);
    expect(result.legacyIdentitiesInUse).toContain('verify-only-key');
    expect(result.availableReplacements).toContain('active-key');
    expect(result.recommendationStrength).toBe('strongly-recommended');
    expect(result.suggestedCommand).toBe('arch-engine policies refresh-lockfile --sign active-key');
  });

  test('mixed active and legacy quorum', () => {
    const lockfile: PolicyRegistryLockfile = {
      ...baseLockfile,
      signatures: [
        { signatureKeyId: 'active-key', signatureAlgorithm: 'ed25519', signature: 'sig' },
        { signatureKeyId: 'verify-only-key', signatureAlgorithm: 'ed25519', signature: 'sig' }
      ]
    };
    
    // In this case, active-key is both in the signatures AND is the replacement for verify-only-key.
    // The replacement is ALREADY present in the lockfile, so it's not "available but absent".
    const result = adviseLockfileMigration(lockfile, trustStore);
    
    expect(result.isPreferredSignatureSet).toBe(false);
    expect(result.migrationRecommended).toBe(true);
    expect(result.legacyIdentitiesInUse).toContain('verify-only-key');
    expect(result.availableReplacements).toHaveLength(0); // Because 'active-key' is already in signatures
    expect(result.recommendationStrength).toBe('optional');
    expect(result.suggestedCommand).toBeUndefined();
  });

  test('replacement signer absent from current lockfile', () => {
    const lockfile: PolicyRegistryLockfile = {
      ...baseLockfile,
      signatures: [
        { signatureKeyId: 'legacy-with-absent-replacement', signatureAlgorithm: 'ed25519', signature: 'sig' }
      ]
    };
    
    const result = adviseLockfileMigration(lockfile, trustStore);
    
    expect(result.isPreferredSignatureSet).toBe(false);
    expect(result.migrationRecommended).toBe(true);
    expect(result.legacyIdentitiesInUse).toContain('legacy-with-absent-replacement');
    expect(result.availableReplacements).toContain('future-key');
    expect(result.recommendationStrength).toBe('strongly-recommended');
    expect(result.suggestedCommand).toBe('arch-engine policies refresh-lockfile --sign future-key');
  });

  test('legacy shape normalization', () => {
    const lockfile: PolicyRegistryLockfile = {
      ...baseLockfile,
      signatureKeyId: 'verify-only-key',
      signatureAlgorithm: 'ed25519',
      signature: 'sig'
    };
    
    const result = adviseLockfileMigration(lockfile, trustStore);
    
    expect(result.isPreferredSignatureSet).toBe(false);
    expect(result.legacyIdentitiesInUse).toContain('verify-only-key');
  });
});
