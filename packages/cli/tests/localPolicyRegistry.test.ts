import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadLocalPolicyPackMetadata } from '../src/loadLocalPolicyPackMetadata';
import { listPolicyPackMetadata } from '../src/listPolicyPackMetadata';
import { listPolicyPacks } from '../src/listPolicyPacks';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
      return actual.existsSync(p);
    }),
    statSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return { isDirectory: () => true };
      return actual.statSync(p as any);
    }),
    readdirSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return ['test.policy.json', 'invalid.policy.json', 'ignore.txt'];
      return actual.readdirSync(p as any);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('test.policy.json')) {
        return JSON.stringify({ policyPackId: 'local-pack', description: 'desc', category: 'cat' });
      }
      if (typeof p === 'string' && p.endsWith('invalid.policy.json')) {
        return '{ invalid json';
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

// ═══════════════════════════════════════════════════════════
//  Phase 9D — Local Policy-Pack Registry Surface
// ═══════════════════════════════════════════════════════════

describe('Phase 9D Local Policy-Pack Registry Surface', () => {

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('local_registry_directory_missing_returns_empty', () => {
    vi.mocked(fs.existsSync).mockImplementationOnce(() => false);
    const result = loadLocalPolicyPackMetadata();
    expect(result).toEqual([]);
  });

  test('valid_local_policy_metadata_loaded', () => {
    const result = loadLocalPolicyPackMetadata();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ policyPackId: 'local-pack', description: 'desc', category: 'cat' });
  });

  test('invalid_metadata_rejected', () => {
    // test.policy.json is valid, invalid.policy.json is rejected, ignore.txt is skipped
    const result = loadLocalPolicyPackMetadata();
    expect(result.some(r => r.policyPackId === 'invalid')).toBe(false);
  });

  test('listPolicyPackMetadata_includes_local_packs', async () => {
    const result = await listPolicyPackMetadata();
    
    // Built-in pack should be present
    expect(result.some(m => m.policyPackId === 'authority-boundaries')).toBe(true);
    // builtins must come first
    expect(result[0].policyPackId).toBe('authority-boundaries');
    expect(result[result.length - 1].policyPackId).toBe('local-pack');
  });

  test('local_policies_visible_in_list', async () => {
    const packs = await listPolicyPacks();
    expect(packs).toContain('local-pack');
  });

  test('local_policy_visible_in_describe', () => {
    const entrySource = fs.readFileSync(path.resolve(__dirname, '../src/index.ts'), 'utf-8');
    expect(entrySource).toContain('const metadataList = await listPolicyPackMetadata({');
    expect(entrySource).toContain('metadataList.find((m: any) => m.policyPackId === targetId)');
  });
});
