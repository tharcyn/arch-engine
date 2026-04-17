import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { loadRemotePolicyPackMetadata } from '../src/loadRemotePolicyPackMetadata';
import { listPolicyPackMetadata } from '../src/listPolicyPackMetadata';

const MOCK_REGISTRY_URL = 'https://registry.arch-engine.dev/policy-packs.json';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('registry.json')) return true;
      return actual.existsSync(p);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.includes('registry.json')) {
        return JSON.stringify({ registries: [MOCK_REGISTRY_URL] });
      }
      return actual.readFileSync(p as any, enc as any);
    })
  };
});
vi.mock('../src/writeRegistryCache.js', () => ({
  writeRegistryCache: vi.fn()
}));

vi.mock('../src/readRegistryCache.js', () => ({
  readRegistryCache: vi.fn()
}));

global.fetch = vi.fn();

describe('Phase 11A Remote Policy-Pack Registry Surface', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('missing_registry_file_safe', async () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);
    const { metadata: meta } = await loadRemotePolicyPackMetadata();
    expect(meta).toEqual([]);
  });

  test('invalid_registry_JSON_safe', async () => {
    vi.mocked(fs.readFileSync).mockReturnValueOnce('INVALID JSON');
    const { metadata: meta } = await loadRemotePolicyPackMetadata();
    expect(meta).toEqual([]);
  });

  test('invalid_pack_metadata_skipped', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ description: 'missing policyPackId' }]
    } as any);
    const { metadata: meta } = await loadRemotePolicyPackMetadata();
    expect(meta).toEqual([]);
  });

  test('valid_metadata_accepted', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ policyPackId: 'remote-pack', description: 'desc', category: 'remote' }]
    } as any);
    const { metadata: meta } = await loadRemotePolicyPackMetadata();
    expect(meta).toHaveLength(1);
    expect(meta[0].policyPackId).toBe('remote-pack');
  });

  test('registry_ordering_preserved', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ policyPackId: 'remote-pack', description: 'desc', category: 'remote' }]
    } as any);
    const all = await listPolicyPackMetadata();
    expect(all[all.length - 1].policyPackId).toBe('remote-pack');
    expect(all[0].policyPackId).toBe('authority-boundaries'); // Built-in
  });
});
