import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'node:crypto';
import { verifyPolicyRegistryLockfileSignature } from '../../src/policy/verifyPolicyRegistryLockfileSignature';
import { StaticLockfileTrustStore } from '../../src/policy/LockfileTrustStore';
import * as fs from 'node:fs';

vi.mock('node:fs');

describe('PolicyRegistryLockfileSignature', () => {
  let publicKeyPem: string;
  let privateKeyPem: string;
  let wrongPublicKeyPem: string;
  let trustStore: StaticLockfileTrustStore;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Generate valid ed25519 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

    // Generate wrong ed25519 keypair
    const wrongKeys = crypto.generateKeyPairSync('ed25519');
    wrongPublicKeyPem = wrongKeys.publicKey.export({ type: 'spki', format: 'pem' }) as string;

    trustStore = new StaticLockfileTrustStore({
      'test-key-1': publicKeyPem,
      'wrong-key-1': wrongPublicKeyPem
    }, {
      'structured-key-1': {
        key: publicKeyPem,
        enabled: true,
        allowedOperations: ['verify']
      },
      'disabled-key': {
        key: publicKeyPem,
        enabled: false,
        allowedOperations: ['verify']
      },
      'sign-only-key': {
        key: publicKeyPem,
        enabled: true,
        allowedOperations: ['sign']
      },
      'rsa-key': {
        key: publicKeyPem,
        algorithm: 'rsa-sha256',
        enabled: true,
        allowedOperations: ['verify']
      }
    });
  });

  const generateSignature = (payload: string, privateKey: string) => {
    return crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('hex');
  };

  test('valid signature + trusted key', () => {
    const lockEntries = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'test-pack', description: 'desc', category: 'cat' }] }
    ];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'test-key-1',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(true);
  });

  test('valid signature + wrong key', () => {
    const lockEntries = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'test-pack', description: 'desc', category: 'cat' }] }
    ];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem); // signed with correct key
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'wrong-key-1', // but we claim it was signed with the wrong key
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
  });

  test('unknown key id', () => {
    const lockEntries = [];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'unknown-key',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
  });

  test('unsupported algorithm', () => {
    const lockEntries = [];
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'rsa-sha256',
        signatureKeyId: 'test-key-1',
        signature: 'dummy'
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
  });

  test('malformed signature encoding', () => {
    const lockEntries = [];
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'test-key-1',
        signature: 'not-a-hex-string!!!'
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
  });

  test('canonical payload mutation failure', () => {
    const lockEntriesOriginal = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payloadOriginal = JSON.stringify(lockEntriesOriginal);
    const signatureHex = generateSignature(payloadOriginal, privateKeyPem);
    
    // Mutate the registries payload
    const lockEntriesMutated = [{ registryUrl: 'https://hacked.dev', packs: [] }];

    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntriesMutated,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'test-key-1',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
  });

  test('metadata-only mutation behavior according to the current canonicalization contract', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        lockfileSurfaceVersion: '1.0.0',
        timestamp: '9999-99-99', // Metadata mutation that shouldn't affect validation
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'test-key-1',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(true);
  });

  test('structured signer success', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'structured-key-1',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(true);
  });

  test('disabled signer rejection', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'disabled-key',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
    expect(result.diagnostic.failureReason).toBe('DISABLED_SIGNER');
  });

  test('unauthorized operation rejection', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'sign-only-key',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
    expect(result.diagnostic.failureReason).toBe('UNAUTHORIZED_OPERATION');
  });

  test('algorithm mismatch rejection', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatureAlgorithm: 'ed25519',
        signatureKeyId: 'rsa-key',
        signature: signatureHex
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature' }, trustStore);
    expect(result.verified).toBe(false);
    expect(result.diagnostic.failureReason).toBe('ALGORITHM_MISMATCH');
  });

  test('duplicate signer entries', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex = generateSignature(payload, privateKeyPem);
    
    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatures: [
            { signatureKeyId: 'test-key-1', signatureAlgorithm: 'ed25519', signature: signatureHex },
            { signatureKeyId: 'test-key-1', signatureAlgorithm: 'ed25519', signature: signatureHex }
        ]
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature', quorum: 2 }, trustStore);
    expect(result.verified).toBe(false); // Only 1 unique key, quorum requires 2
    expect(result.diagnostic.failureReason).toBe('DUPLICATE_SIGNATURE');
    expect(result.diagnostic.signatureSet?.find(s => s.status === 'duplicate')).toBeDefined();
  });

  test('canonical ordering enforcement', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex1 = generateSignature(payload, privateKeyPem);
    
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    trustStore = new StaticLockfileTrustStore({
        'b-key': publicKeyPem,
        'a-key': pubPem
    });
    const signatureHex2 = generateSignature(payload, privPem);

    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatures: [
            { signatureKeyId: 'b-key', signatureAlgorithm: 'ed25519', signature: signatureHex1 },
            { signatureKeyId: 'a-key', signatureAlgorithm: 'ed25519', signature: signatureHex2 }
        ]
    }));

    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature', quorum: 2 }, trustStore);
    expect(result.verified).toBe(true); // Still verified since quorum is 2 and we have 2 valid
    expect(result.diagnostic.isCanonical).toBe(false);
  });

  test('valid-but-non-counted signatures', () => {
    const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
    const payload = JSON.stringify(lockEntries);
    const signatureHex1 = generateSignature(payload, privateKeyPem);
    
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
    trustStore = new StaticLockfileTrustStore({
        'a-key': publicKeyPem,
        'b-key': pubPem
    });
    const signatureHex2 = generateSignature(payload, privPem);

    vi.mocked(fs.readFileSync).mockReturnValueOnce(JSON.stringify({ 
        registries: lockEntries,
        signatures: [
            { signatureKeyId: 'a-key', signatureAlgorithm: 'ed25519', signature: signatureHex1 },
            { signatureKeyId: 'b-key', signatureAlgorithm: 'ed25519', signature: signatureHex2 }
        ]
    }));

    // Quorum is 1, but we provide 2 valid signatures
    const result = verifyPolicyRegistryLockfileSignature('/path/to/lockfile.json', { enforcementMode: 'require-signature', quorum: 1 }, trustStore);
    expect(result.verified).toBe(true);
    expect(result.diagnostic.signaturesVerified).toBe(1);
    
    const counted = result.diagnostic.signatureSet?.filter(s => s.status === 'counted');
    const nonCounted = result.diagnostic.signatureSet?.filter(s => s.status === 'valid-but-non-counted');
    
    expect(counted?.length).toBe(1);
    expect(nonCounted?.length).toBe(1);
  });
});
