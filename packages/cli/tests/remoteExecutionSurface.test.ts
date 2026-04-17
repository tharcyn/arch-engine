import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('../src/loadTrustPolicyConfig.js', () => ({
  loadTrustPolicyConfig: vi.fn()
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

describe('Phase 12A Remote Executable Policy-Pack Enablement Surface', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    test('execution_blocked_when_disabled', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({});

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'test', description: '', category: '', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta[0].rules).toBeUndefined();
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('execution_allowed_when_enabled', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ allowRemoteExecution: true });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'test', description: '', category: '', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta[0].rules).toBeDefined();
            expect(meta[0].rules!.length).toBe(1);
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('signature_required_execution_enforced', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ allowRemoteExecution: true, requireSignatures: true });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'test', description: '', category: '', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta[0].rules).toBeUndefined(); // rules stripped
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('namespace_restriction_enforced', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValue({ allowRemoteExecution: true, allowedNamespaces: ['@arch-engine/policy-pack-test'] });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { policyPackId: 'test1', description: '', category: '', packageName: '@arch-engine/policy-pack-other', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] },
                { policyPackId: 'test2', description: '', category: '', packageName: '@arch-engine/policy-pack-test', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }
            ]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.find(m => m.policyPackId === 'test1')?.rules).toBeUndefined();
            expect(meta.find(m => m.policyPackId === 'test2')?.rules).toBeDefined();
        } finally {
            global.fetch = globalFetch;
        }
    });

    test('registry_restriction_enforced', async () => {
        const trustModule = await import('../src/loadTrustPolicyConfig.js');
        vi.mocked(trustModule.loadTrustPolicyConfig).mockReturnValueOnce({ allowRemoteExecution: true, trustedRegistries: ['https://trusted.dev'] });

        const globalFetch = global.fetch;
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [{ policyPackId: 'test', description: '', category: '', rules: [{ type: 'forbid-edge', from: 'a', to: 'b' }] }]
        });

        try {
            const { loadRemotePolicyPackMetadata } = await import('../src/loadRemotePolicyPackMetadata');
            const { metadata: meta } = await loadRemotePolicyPackMetadata();
            expect(meta.length).toBe(0); // registry https://test.dev not in trustedRegistries
        } finally {
            global.fetch = globalFetch;
        }
    });
});
