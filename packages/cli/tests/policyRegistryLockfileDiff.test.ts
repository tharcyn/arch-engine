import { describe, test, expect, vi, afterEach } from 'vitest';
import * as path from 'node:path';

vi.mock('../src/runCheckCommand', () => ({
  runCheckCommand: vi.fn().mockResolvedValue(0)
}));

vi.mock('@arch-engine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arch-engine/core')>();
  const coreModule = await import('../../core/src/policy/diffPolicyRegistryLockfile.ts');
  return {
    ...actual,
    diffPolicyRegistryLockfile: coreModule.diffPolicyRegistryLockfile
  };
});

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
  };
});

describe('Phase 12E Lockfile Diff / Drift Surface', () => {
    const originalExit = process.exit;
    const originalLog = console.log;

    afterEach(() => {
        vi.clearAllMocks();
        mockFs = {};
        process.exit = originalExit;
        console.log = originalLog;
    });

    test('diff_lockfile_detects_added_packs', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [{ policyPackId: 'existing-pack', description: 'desc', category: 'cat' }] }]
        });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { policyPackId: 'existing-pack', description: 'desc', category: 'cat' },
                { policyPackId: 'new-pack', description: 'desc', category: 'cat' }
            ]
        });

        const mockLog = vi.fn();
        console.log = mockLog;
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        process.exit = mockExit as any;

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ diffLockfile: true });
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            global.fetch = globalFetch;
        }

        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('- new-pack'));
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('diff_lockfile_detects_removed_packs', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [{ policyPackId: 'removed-pack', description: 'desc', category: 'cat' }] }]
        });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => []
        });

        const mockLog = vi.fn();
        console.log = mockLog;
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        process.exit = mockExit as any;

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ diffLockfile: true });
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            global.fetch = globalFetch;
        }

        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('- removed-pack'));
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('diff_lockfile_detects_changed_packs', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [{ policyPackId: 'changed-pack', description: 'desc1', category: 'cat' }] }]
        });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'changed-pack', description: 'desc2', category: 'cat' }]
        });

        const mockLog = vi.fn();
        console.log = mockLog;
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        process.exit = mockExit as any;

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ diffLockfile: true });
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            global.fetch = globalFetch;
        }

        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('- changed-pack'));
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('diff_lockfile_missing_lockfile_fails', async () => {
        const mockLog = vi.fn();
        console.log = mockLog;
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        process.exit = mockExit as any;

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ diffLockfile: true });
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        }

        expect(mockLog).toHaveBeenCalledWith('Policy lockfile not found');
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('diff_lockfile_invalid_flag_combinations_fail', async () => {
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        process.exit = mockExit as any;
        const mockLog = vi.fn();
        console.log = mockLog;
        
        const originalArgv = process.argv;
        process.argv = ['node', 'arch-engine', 'check', 'dataset.json', '--diff-lockfile', '--write-lockfile'];

        try {
            const { main } = await import('../src/index');
            await main();
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            process.argv = originalArgv;
        }

        expect(mockLog).toHaveBeenCalledWith('Cannot use --diff-lockfile with --write-lockfile, --refresh-lockfile, or --use-lockfile');
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('diff_lockfile_output_deterministic', async () => {
        const file = path.resolve(process.cwd(), '.arch-engine/policy-lock.json');
        mockFs[file] = JSON.stringify({
           lockfileSurfaceVersion: '1.0.0',
           registries: [{ registryUrl: 'https://test.dev', packs: [
               { policyPackId: 'Z-pack', description: 'desc', category: 'cat' },
               { policyPackId: 'A-pack', description: 'desc', category: 'cat' }
           ]}]
        });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
               { policyPackId: 'M-pack', description: 'desc', category: 'cat' },
               { policyPackId: 'B-pack', description: 'desc', category: 'cat' }
            ]
        });

        const mockLog = vi.fn();
        console.log = mockLog;
        const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
        process.exit = mockExit as any;

        try {
            const { listPolicyPackMetadata } = await import('../src/listPolicyPackMetadata');
            await listPolicyPackMetadata({ diffLockfile: true });
        } catch (e: any) {
            if (e.message !== 'mock-exit') throw e;
        } finally {
            global.fetch = globalFetch;
        }

        const calls = mockLog.mock.calls.map(c => c[0]);
        const addedAIndex = calls.indexOf('- B-pack');
        const addedBIndex = calls.indexOf('- M-pack');
        expect(addedAIndex).toBeLessThan(addedBIndex);

        const removedAIndex = calls.indexOf('- A-pack');
        const removedBIndex = calls.indexOf('- Z-pack');
        expect(removedAIndex).toBeLessThan(removedBIndex);
    });
});
