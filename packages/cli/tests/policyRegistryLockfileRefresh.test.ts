import { describe, test, expect, vi, afterEach } from 'vitest';
import * as path from 'node:path';

vi.mock('../src/loadTrustPolicyConfig.js', () => ({
  loadTrustPolicyConfig: vi.fn().mockReturnValue({})
}));

vi.mock('../src/writeRegistryCache.js', () => ({
  writeRegistryCache: vi.fn()
}));

vi.mock('../src/readRegistryCache.js', () => ({
  readRegistryCache: vi.fn()
}));

vi.mock('../src/loadExternalPolicyPackMetadata.js', () => ({
  loadExternalPolicyPackMetadata: vi.fn().mockReturnValue([])
}));

vi.mock('../src/loadLocalPolicyPackMetadata.js', () => ({
  loadLocalPolicyPackMetadata: vi.fn().mockReturnValue([])
}));

vi.mock('../src/runCheckCommand', () => ({
  runCheckCommand: vi.fn().mockResolvedValue(0)
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
        return JSON.stringify({ registries: ['https://test.dev', 'https://alpha.dev'] });
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

describe('Phase 12D Lockfile Refresh / Update Surface', () => {
    afterEach(() => {
        vi.clearAllMocks();
        mockFs = {};
    });

    test('refresh_lockfile_writes_updated_snapshot', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'remote-pack-updated', description: 'desc', category: 'cat' }]
        });

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            const meta = await listPolicyPackMetadata({ refreshLockfile: true });
            
            const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
            expect(mockFs[file]).toBeDefined();
            const parsed = JSON.parse(mockFs[file]);
            
            // Note: Since listPolicyPackMetadata loads both test.dev and alpha.dev from mocked registries
            // and fetch() returns same data for both, we expect lockfile to contain both.
            expect(parsed.registries.find((r: any) => r.registryUrl === 'https://test.dev').packs[0].policyPackId).toBe('remote-pack-updated');
            
            // Check that it returned in metadata array too
            expect(meta.find(m => m.policyPackId === 'remote-pack-updated')).toBeDefined();
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('refresh_lockfile_rejects_use_lockfile_combination', async () => {
        // This is handled in index.ts normally, but we can verify our pipeline 
        // doesn't have an issue. If both are passed to listPolicyPackMetadata,
        // refreshLockfile should win and useLockfile is ignored (or index.ts rejects it).
        // Since step 3 says "If --refresh-lockfile is used together with --use-lockfile Reject deterministically... Return exit code 1", we will test index.ts directly.
        const originalExit = process.exit;
        const originalArgv = process.argv;
        const originalLog = console.log;
        
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        const mockLog = vi.fn();
        
        process.exit = mockExit;
        console.log = mockLog;
        process.argv = ['node', 'arch-engine', 'check', 'dataset.json', '--refresh-lockfile', '--use-lockfile'];
        
        try {
            const { main } = await import('../src/index');
            await main();
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            process.exit = originalExit;
            process.argv = originalArgv;
            console.log = originalLog;
        }
        
        expect(mockLog).toHaveBeenCalledWith('Cannot use --refresh-lockfile and --use-lockfile together');
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('refresh_lockfile_preserves_registry_order', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockImplementation(async (url) => {
             return {
                 ok: true,
                 json: async () => [{ policyPackId: 'pack-for-' + url, description: '', category: '' }]
             };
        });

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ refreshLockfile: true });
            
            const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
            const parsed = JSON.parse(mockFs[file]);
            
            // Alpha should be sorted before test
            expect(parsed.registries[0].registryUrl).toBe('https://alpha.dev');
            expect(parsed.registries[1].registryUrl).toBe('https://test.dev');
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('refresh_lockfile_respects_trust_enforcement', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ allowRemoteExecution: true, allowedNamespaces: ['@arch-engine/policy-pack-test'] });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { policyPackId: 'trusted-pack', description: 'desc', category: 'cat', packageName: '@arch-engine/policy-pack-test', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] },
                { policyPackId: 'untrusted-pack', description: 'desc', category: 'cat', packageName: '@arch-engine/policy-pack-other', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }
            ]
        });

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ refreshLockfile: true });
            
            const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
            const parsed = JSON.parse(mockFs[file]);
            
            // Rules should be preserved on trusted pack, stripped on untrusted pack
            const testRegistry = parsed.registries.find((r: any) => r.registryUrl === 'https://test.dev');
            expect(testRegistry).toBeDefined();
            const trustedPack = testRegistry.packs.find((p: any) => p.policyPackId === 'trusted-pack');
            expect(trustedPack).toBeDefined();
            expect(trustedPack.rules).toBeDefined();
            
            const untrustedPack = testRegistry.packs.find((p: any) => p.policyPackId === 'untrusted-pack');
            expect(untrustedPack).toBeDefined();
            expect(untrustedPack.rules).toBeUndefined();
        } finally {
            global.fetch = globalFetch;
        }
    });
});
