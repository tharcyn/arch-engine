import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { loadExternalPolicyPackMetadata } from '../src/loadExternalPolicyPackMetadata';
import { listPolicyPacks } from '../src/listPolicyPacks';
import { listPolicyPackMetadata } from '../src/listPolicyPackMetadata';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('@arch-engine')) return true;
      if (typeof p === 'string' && p.includes('policy-pack-')) return true;
      return actual.existsSync(p);
    }),
    statSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('@arch-engine')) return { isDirectory: () => true };
      if (typeof p === 'string' && p.includes('policy-pack-')) return { isDirectory: () => true };
      return actual.statSync(p as any);
    }),
    readdirSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) {
        return [];
      }
      if (typeof p === 'string' && p.includes('node_modules/@arch-engine')) {
        return ['policy-pack-security', 'policy-pack-invalid', 'not-a-pack'];
      }
      return actual.readdirSync(p as any);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.includes('policy-pack-security')) {
        return JSON.stringify({ policyPackId: 'security-layering', description: 'desc', category: 'sec' });
      }
      if (typeof p === 'string' && p.includes('policy-pack-invalid')) {
        return JSON.stringify({ missingId: true });
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

describe('Phase 10A External Policy Registry Surface', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('external_registry_directory_missing_returns_empty', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);
    expect(loadExternalPolicyPackMetadata()).toHaveLength(0);
  });

  test('listPolicyPackMetadata_includes_external_packs', async () => {
    const meta = await listPolicyPackMetadata();
    
    // built-in
    expect(meta.some(m => m.policyPackId === 'authority-boundaries')).toBe(true);
  });

  test('invalid_metadata_rejected', () => {
    const meta = loadExternalPolicyPackMetadata();
    expect(meta.some(m => m.policyPackId === undefined)).toBe(false);
  });

  test('external_policies_visible_in_list', async () => {
    const packs = await listPolicyPacks();
    expect(packs).toContain('security-layering');
  });

  test('external_policy_visible_in_describe', async () => {
    const meta = await listPolicyPackMetadata();
    const pack = meta.find(m => m.policyPackId === 'security-layering');
    expect(pack).toBeDefined();
    expect(pack?.description).toBe('desc');
  });
});
