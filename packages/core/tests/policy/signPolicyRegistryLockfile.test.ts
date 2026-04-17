import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'node:crypto';
import { signPolicyRegistryLockfile } from '../../src/policy/signPolicyRegistryLockfile';
import { verifyPolicyRegistryLockfileSignature } from '../../src/policy/verifyPolicyRegistryLockfileSignature';
import { StaticLockfileSignerStore } from '../../src/policy/LockfileSignerStore';
import { StaticLockfileTrustStore } from '../../src/policy/LockfileTrustStore';
import type { PolicyRegistryLockfile } from '../../src/policy/PolicyRegistryLockfile';
import * as fs from 'node:fs';

vi.mock('node:fs');

describe('PolicyRegistryLockfileSigner', () => {
  let publicKeyPem: string;
  let privateKeyPem: string;
  let signerStore: StaticLockfileSignerStore;
  let trustStore: StaticLockfileTrustStore;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Generate valid ed25519 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    signerStore = new StaticLockfileSignerStore({
      'test-key-1': privateKeyPem,
      'wrong-key-1': '-----BEGIN PRIVATE KEY-----\nINVALID\n-----END PRIVATE KEY-----'
    }, {
      'structured-key-1': {
        key: privateKeyPem,
        enabled: true,
        allowedOperations: ['sign']
      },
      'disabled-key': {
        key: privateKeyPem,
        enabled: false,
        allowedOperations: ['sign']
      },
      'verify-only-key': {
        key: privateKeyPem,
        enabled: true,
        allowedOperations: ['verify']
      },
      'rsa-key': {
        key: privateKeyPem,
        algorithm: 'rsa-sha256',
        enabled: true,
        allowedOperations: ['sign']
      }
    });

    trustStore = new StaticLockfileTrustStore({
      'test-key-1': publicKeyPem
    });
  });

  const baseLockfile: PolicyRegistryLockfile = {
    lockfileSurfaceVersion: '1.0.0',
    registries: [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'test-pack', description: 'desc', category: 'cat' }] }
    ]
  };

  test('successful signing with valid Ed25519 private key', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'test-key-1', signerStore);
    
    expect(result.success).toBe(true);
    expect(result.lockfile?.signatures?.[0].signatureAlgorithm).toBe('ed25519');
    expect(result.lockfile?.signatures?.[0].signatureKeyId).toBe('test-key-1');
    expect(result.lockfile?.signatures?.[0].signature).toBeDefined();
  });

  test('signing + verification round-trip success', () => {
    const signResult = signPolicyRegistryLockfile(baseLockfile, 'test-key-1', signerStore);
    expect(signResult.success).toBe(true);
    
    // Write the signed lockfile to a mock fs for verify
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify(signResult.lockfile));

    const verifyResult = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature', quorum: 1 }, trustStore);
    expect(verifyResult.verified).toBe(true);
  });

  test('malformed private key failure', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'wrong-key-1', signerStore);
    
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Signing failed/);
  });

  test('missing signer identity failure', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'unknown-key', signerStore);
    
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Signer identity unknown-key is unknown/);
  });

  test('canonical payload mutation invalidating verification', () => {
    const signResult = signPolicyRegistryLockfile(baseLockfile, 'test-key-1', signerStore);
    
    // Mutate registries payload
    const mutatedLockfile = {
        ...signResult.lockfile,
        registries: [{ registryUrl: 'https://hacked.dev', packs: [] }]
    };

    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify(mutatedLockfile));

    const verifyResult = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature', quorum: 1 }, trustStore);
    expect(verifyResult.verified).toBe(false);
  });

  test('metadata-only mutation behavior according to the canonicalization contract', () => {
    const signResult = signPolicyRegistryLockfile(baseLockfile, 'test-key-1', signerStore);
    
    // Mutate metadata only
    const mutatedLockfile = {
        ...signResult.lockfile,
        extraMetadataField: 'should-be-ignored'
    };

    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify(mutatedLockfile));

    const verifyResult = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature', quorum: 1 }, trustStore);
    expect(verifyResult.verified).toBe(true);
  });

  test('structured signer success', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'structured-key-1', signerStore);
    expect(result.success).toBe(true);
  });

  test('disabled signer rejection', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'disabled-key', signerStore);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/is disabled/);
  });

  test('unauthorized operation rejection', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'verify-only-key', signerStore);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not authorized for signing/);
  });

  test('algorithm mismatch rejection', () => {
    const result = signPolicyRegistryLockfile(baseLockfile, 'rsa-key', signerStore);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unsupported algorithm rsa-sha256/);
  });
});
