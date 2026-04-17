import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('@arch-engine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arch-engine/core')>();
  const coreModule = await import('../../core/src/policy/verifyPolicyRegistryLockfileSignature.ts');
  const trustStoreModule = await import('../../core/src/policy/LockfileTrustStore.ts');
  const signModule = await import('../../core/src/policy/signPolicyRegistryLockfile.ts');
  const signerStoreModule = await import('../../core/src/policy/LockfileSignerStore.ts');
  return {
    ...actual,
    verifyPolicyRegistryLockfileSignature: coreModule.verifyPolicyRegistryLockfileSignature,
    StaticLockfileTrustStore: trustStoreModule.StaticLockfileTrustStore,
    signPolicyRegistryLockfile: signModule.signPolicyRegistryLockfile,
    StaticLockfileSignerStore: signerStoreModule.StaticLockfileSignerStore
  };
});

vi.mock('../src/loadTrustPolicyConfig.js', () => ({
  loadTrustPolicyConfig: vi.fn().mockReturnValue({})
}));

vi.mock('../src/loadTrustPolicyConfig', () => ({
  loadTrustPolicyConfig: vi.fn().mockReturnValue({})
}));

vi.mock('../src/writeRegistryCache.js', () => ({
  writeRegistryCache: vi.fn()
}));

vi.mock('../src/readRegistryCache.js', () => ({
  readRegistryCache: vi.fn()
}));

let mockFs: Record<string, string> = {};

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.endsWith('registry.json')) return true;
      if (typeof p === 'string' && p.endsWith('policy-lock.json')) return !!mockFs[p];
      return actual.existsSync(p);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('registry.json')) {
        return JSON.stringify({ registries: ['https://test.dev'] });
      }
      if (typeof p === 'string' && p.endsWith('policy-lock.json') && mockFs[p]) {
        return mockFs[p];
      }
      return actual.readFileSync(p as any, enc as any);
    }),
    writeFileSync: vi.fn((p, content) => {
      if (typeof p === 'string' && p.includes('policy-lock.json.tmp')) {
         mockFs[p] = content as string;
      } else {
         actual.writeFileSync(p, content);
      }
    }),
    renameSync: vi.fn((src, dest) => {
      if (typeof src === 'string' && src.includes('policy-lock.json.tmp')) {
         mockFs[dest as string] = mockFs[src];
         delete mockFs[src];
      } else {
         actual.renameSync(src, dest);
      }
    }),
    mkdirSync: vi.fn(actual.mkdirSync),
  };
});

describe('Phase 12C Registry Snapshot Lockfile Surface', () => {
    afterEach(() => {
        vi.clearAllMocks();
        mockFs = {};
    });

    test('write_lockfile_creates_file', async () => {
        const { writePolicyRegistryLockfile } = await import('../src/writePolicyRegistryLockfile');
        
        writePolicyRegistryLockfile([
           { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'test1', description: '', category: '' }] }
        ]);

        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        expect(mockFs[file]).toBeDefined();
        const parsed = JSON.parse(mockFs[file]);
        expect(parsed.lockfileSurfaceVersion).toBe('1.0.0');
        expect(parsed.registries[0].registryUrl).toBe('https://test.dev');
    });

    test('read_lockfile_returns_entries', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [{ policyPackId: 'test2', description: '', category: '' }] }]
        });

        const { readPolicyRegistryLockfile } = await import('../src/readPolicyRegistryLockfile');
        const lock = readPolicyRegistryLockfile();
        expect(lock).toBeDefined();
        expect(lock?.registries[0].packs[0].policyPackId).toBe('test2');
    });

    test('missing_lockfile_safe', async () => {
        const { readPolicyRegistryLockfile } = await import('../src/readPolicyRegistryLockfile');
        const lock = readPolicyRegistryLockfile();
        expect(lock).toBeUndefined();
    });

    test('corrupt_lockfile_safe', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = 'NOT JSON';
        const { readPolicyRegistryLockfile } = await import('../src/readPolicyRegistryLockfile');
        const lock = readPolicyRegistryLockfile();
        expect(lock).toBeUndefined();
    });

    test('use_lockfile_skips_fetch', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockRejectedValue(new Error('Should not fetch!'));

        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [{ policyPackId: 'test-lock', description: 'desc', category: 'cat' }] }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const res = await loadRemotePolicyPackMetadata({ useLockfile: true });
            expect(res.metadata.length).toBe(1);
            expect(res.metadata[0].policyPackId).toBe('test-lock');
            expect(global.fetch).not.toHaveBeenCalled();
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('write_lockfile_preserves_registry_order', async () => {
        const { writePolicyRegistryLockfile } = await import('../src/writePolicyRegistryLockfile');
        
        writePolicyRegistryLockfile([
           { registryUrl: 'https://zeta.dev', packs: [] },
           { registryUrl: 'https://alpha.dev', packs: [] }
        ]);

        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        const parsed = JSON.parse(mockFs[file]);
        expect(parsed.registries[0].registryUrl).toBe('https://alpha.dev');
        expect(parsed.registries[1].registryUrl).toBe('https://zeta.dev');
    });

    test('trust_enforcement_preserved_when_using_lockfile', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ allowRemoteExecution: true, allowedNamespaces: ['@arch-engine/policy-pack-test'] });

        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [
               { policyPackId: 'cached1', description: 'desc', category: 'cat', packageName: '@arch-engine/policy-pack-other', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] },
               { policyPackId: 'cached2', description: 'desc', category: 'cat', packageName: '@arch-engine/policy-pack-test', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }
           ]}]
        });

        const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
        const res = await loadRemotePolicyPackMetadata({ useLockfile: true });
        
        expect(res.metadata.length).toBe(2);
        expect(res.metadata.find(m => m.policyPackId === 'cached1')?.rules).toBeUndefined(); // stripped due to namespace mismatch
        expect(res.metadata.find(m => m.policyPackId === 'cached2')?.rules).toBeDefined(); // preserved
    });

    test('cli_signature_verification_success', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        
        const crypto = require('node:crypto');
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
        const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        
        const trustModule = await import('../src/loadTrustPolicyConfig');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ trustedLockfileKeys: { 'key-1': publicKeyPem } });

        const lockEntries = [{ registryUrl: 'https://test.dev', packs: [] }];
        const payload = JSON.stringify(lockEntries);
        const signatureHex = crypto.sign(null, Buffer.from(payload, 'utf8'), privateKeyPem).toString('hex');
        
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: lockEntries,
           signatureAlgorithm: 'ed25519',
           signatureKeyId: 'key-1',
           signature: signatureHex
        });

        const { readPolicyRegistryLockfile } = await import('../src/readPolicyRegistryLockfile');
        const lock = readPolicyRegistryLockfile({ verifyLockfileSignature: true });
        expect(lock).toBeDefined();
    });

    test('cli_signature_verification_failure', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        
        const crypto = require('node:crypto');
        const { publicKey } = crypto.generateKeyPairSync('ed25519');
        const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

        const trustModule = await import('../src/loadTrustPolicyConfig');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ trustedLockfileKeys: { 'key-1': publicKeyPem } });

        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [] }],
           signatureAlgorithm: 'ed25519',
           signatureKeyId: 'key-1',
           signature: 'invalidhexsignature123'
        });

        const originalExit = process.exit;
        const originalLog = console.log;
        
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        const mockLog = vi.fn();
        
        process.exit = mockExit as any;
        console.log = mockLog;

        try {
            const { readPolicyRegistryLockfile } = await import('../src/readPolicyRegistryLockfile');
            readPolicyRegistryLockfile({ verifyLockfileSignature: true });
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            process.exit = originalExit;
            console.log = originalLog;
        }

        expect(mockLog).toHaveBeenCalledWith('Policy lockfile signature verification failed');
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('cli_signing_success', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        
        const crypto = require('node:crypto');
        const { privateKey } = crypto.generateKeyPairSync('ed25519');
        const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

        const trustModule = await import('../src/loadTrustPolicyConfig');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ signerLockfileKeys: { 'my-signer-key': privateKeyPem } });

        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [] }]
        });

        const originalExit = process.exit;
        const originalLog = console.log;
        const originalArgv = process.argv;
        
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        const mockLog = vi.fn();
        
        process.exit = mockExit as any;
        console.log = mockLog;
        process.argv = ['node', 'arch-engine', 'policies', 'sign-lockfile', 'my-signer-key'];

        try {
            const { main } = await import('../src/index');
            await main();
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            process.exit = originalExit;
            console.log = originalLog;
            process.argv = originalArgv;
        }

        expect(mockLog).toHaveBeenCalledWith('Successfully signed policy-lock.json with key my-signer-key');
        expect(mockExit).toHaveBeenCalledWith(0);
        
        const writtenLockfile = JSON.parse(mockFs[file]);
        expect(writtenLockfile.signatures?.[0].signatureAlgorithm).toBe('ed25519');
        expect(writtenLockfile.signatures?.[0].signatureKeyId).toBe('my-signer-key');
        expect(writtenLockfile.signatures?.[0].signature).toBeDefined();
    });

    test('cli_signing_failure_unknown_key', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');

        const trustModule = await import('../src/loadTrustPolicyConfig');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ signerLockfileKeys: { 'my-signer-key': 'valid-but-not-the-one-requested' } });

        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [] }]
        });

        const originalExit = process.exit;
        const originalLog = console.log;
        const originalArgv = process.argv;
        
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        const mockLog = vi.fn();
        
        process.exit = mockExit as any;
        console.log = mockLog;
        process.argv = ['node', 'arch-engine', 'policies', 'sign-lockfile', 'unknown-key'];

        try {
            const { main } = await import('../src/index');
            await main();
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            process.exit = originalExit;
            console.log = originalLog;
            process.argv = originalArgv;
        }

        expect(mockLog).toHaveBeenCalledWith('Signer identity unknown-key is unknown');
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
