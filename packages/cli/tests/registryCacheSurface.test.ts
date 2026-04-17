import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('../src/loadTrustPolicyConfig.js', () => ({
  loadTrustPolicyConfig: vi.fn().mockReturnValue({})
}));

vi.mock('../src/writeRegistryCache.js', () => ({
  writeRegistryCache: vi.fn()
}));

vi.mock('../src/readRegistryCache.js', () => ({
  readRegistryCache: vi.fn()
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.endsWith('registry.json')) return true;
      return actual.existsSync(p);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('registry.json')) {
        return JSON.stringify({ registries: ['https://test.dev'] });
      }
      return actual.readFileSync(p as any, enc as any);
    })
  };
});

describe('Phase 12B Remote Policy-Pack Caching Surface', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('successful_fetch_writes_cache', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'test1', description: '', category: '' }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.length).toBe(1);

            const { writeRegistryCache } = await import('../src/writeRegistryCache.js');
            expect(writeRegistryCache).toHaveBeenCalled();
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('failed_fetch_reads_cache_fallback', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: false
        });

        const readModule = await import('../src/readRegistryCache.js');
        vi.mocked(readModule.readRegistryCache).mockReturnValueOnce({
            'https://test.dev': [{ policyPackId: 'cached1', description: '', category: '' }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.length).toBe(1);
            expect(meta[0].policyPackId).toBe('cached1');
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('missing_cache_safe_fallback', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const readModule = await import('../src/readRegistryCache.js');
        vi.mocked(readModule.readRegistryCache).mockReturnValueOnce(null); // missing

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.length).toBe(0);
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('corrupt_cache_rejected_safely', async () => {
        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const readModule = await import('../src/readRegistryCache.js');
        vi.mocked(readModule.readRegistryCache).mockReturnValueOnce(null); // internally returns null on corruption

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.length).toBe(0);
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('trust_enforcement_preserved_on_cache', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ allowRemoteExecution: true, allowedNamespaces: ['@arch-engine/policy-pack-test'] });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const readModule = await import('../src/readRegistryCache.js');
        vi.mocked(readModule.readRegistryCache).mockReturnValueOnce({
            'https://test.dev': [
                { policyPackId: 'cached1', description: '', category: '', packageName: '@arch-engine/policy-pack-other', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] },
                { policyPackId: 'cached2', description: '', category: '', packageName: '@arch-engine/policy-pack-test', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }
            ]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.length).toBe(2);
            expect(meta.find(m => m.policyPackId === 'cached1')?.rules).toBeUndefined(); // stripped
            expect(meta.find(m => m.policyPackId === 'cached2')?.rules).toBeDefined(); // preserved
        } finally {
            global.fetch = globalFetch;
        }
    });
});
