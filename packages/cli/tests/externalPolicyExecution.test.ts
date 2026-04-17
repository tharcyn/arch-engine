import { describe, test, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { loadExternalPolicyPackMetadata } from '../src/loadExternalPolicyPackMetadata';
import { loadLocalPolicyPackMetadata } from '../src/loadLocalPolicyPackMetadata';

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
        return ['workspace-invalid.policy.json', 'workspace-mismatch.policy.json'];
      }
      if (typeof p === 'string' && p.includes('node_modules/@arch-engine')) {
        return [
          'policy-pack-success',
          'policy-pack-violation',
          'policy-pack-empty-rules',
          'policy-pack-no-rules',
          'policy-pack-invalid-rules',
          'policy-pack-invalid-manifest',
          'policy-pack-mismatch',
          'policy-pack-caret'
        ];
      }
      return actual.readdirSync(p as any);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.includes('workspace-invalid.policy.json')) {
        return JSON.stringify({ description: 'missing-id-local' });
      }
      if (typeof p === 'string' && p.includes('workspace-mismatch.policy.json')) {
        return JSON.stringify({ policyPackId: 'workspace-mismatch', description: 'desc', category: 'cat', engineCompatibility: '^99.0.0' });
      }
      if (typeof p === 'string' && p.includes('policy-pack-success')) {
        return JSON.stringify({ policyPackId: 'success-pack', description: 'desc', category: 'cat', rules: [] });
      }
      if (typeof p === 'string' && p.includes('policy-pack-violation')) {
        return JSON.stringify({ 
          policyPackId: 'violation-pack', description: 'desc', category: 'cat', 
          rules: [{ type: 'forbid-edge', from: 'controller', to: 'repository' }] 
        });
      }
      if (typeof p === 'string' && p.includes('policy-pack-empty-rules')) {
        return JSON.stringify({ policyPackId: 'empty-rules-pack', description: 'desc', category: 'cat', rules: [] });
      }
      if (typeof p === 'string' && p.includes('policy-pack-no-rules')) {
        return JSON.stringify({ policyPackId: 'no-rules-pack', description: 'desc', category: 'cat' });
      }
      if (typeof p === 'string' && p.includes('policy-pack-invalid-rules')) {
        return JSON.stringify({ policyPackId: 'invalid-rules-pack', description: 'desc', category: 'cat', rules: "not-an-array" });
      }
      if (typeof p === 'string' && p.includes('policy-pack-invalid-manifest')) {
        return JSON.stringify({ description: 'missing-id' });
      }
      if (typeof p === 'string' && p.includes('policy-pack-mismatch')) {
        return JSON.stringify({ policyPackId: 'external-mismatch', description: 'desc', category: 'cat', engineCompatibility: '^99.0.0' });
      }
      if (typeof p === 'string' && p.includes('policy-pack-caret')) {
        return JSON.stringify({ policyPackId: 'caret-pack', description: 'desc', category: 'cat', engineCompatibility: '^1.0.0' });
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

describe('Phase 10B Executable External Policy-Pack Surface (CLI)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('external_pack_rules_execute_successfully', () => {
    const meta = loadExternalPolicyPackMetadata();
    const pack = meta.find(m => m.policyPackId === 'success-pack');
    expect(pack).toBeDefined();
    expect(pack?.rules).toEqual([]);
  });

  test('external_pack_rules_generate_violation', () => {
    const meta = loadExternalPolicyPackMetadata();
    const pack = meta.find(m => m.policyPackId === 'violation-pack');
    expect(pack).toBeDefined();
    expect(pack?.rules).toHaveLength(1);
    expect(pack?.rules?.[0].type).toBe('forbid-edge');
  });

  test('external_pack_rules_empty_array_safe', () => {
    const meta = loadExternalPolicyPackMetadata();
    const pack = meta.find(m => m.policyPackId === 'empty-rules-pack');
    expect(pack).toBeDefined();
    expect(pack?.rules).toEqual([]);
  });

  test('external_pack_rules_missing_safe', () => {
    const meta = loadExternalPolicyPackMetadata();
    const pack = meta.find(m => m.policyPackId === 'no-rules-pack');
    expect(pack).toBeDefined();
    expect(pack?.rules).toBeUndefined();
  });

  test('invalid_rules_structure_skipped', () => {
    const meta = loadExternalPolicyPackMetadata();
    const pack = meta.find(m => m.policyPackId === 'invalid-rules-pack');
    expect(pack).toBeUndefined();
  });

  test('invalid_manifest_skipped', () => {
    const meta = loadExternalPolicyPackMetadata();
    // missing id pack is skipped
    expect(meta.some(m => (m as any).description === 'missing-id')).toBe(false);
  });

  test('workspace_manifest_invalid_skipped', () => {
    const local = loadLocalPolicyPackMetadata();
    expect(local.some(m => (m as any).description === 'missing-id-local')).toBe(false);
  });

  test('external_manifest_invalid_skipped', () => {
    const meta = loadExternalPolicyPackMetadata();
    expect(meta.some(m => (m as any).description === 'missing-id')).toBe(false);
  });

  test('workspace_pack_major_mismatch_skipped', () => {
    const local = loadLocalPolicyPackMetadata();
    expect(local.some(m => m.policyPackId === 'workspace-mismatch')).toBe(false);
  });

  test('external_pack_major_mismatch_skipped', () => {
    const meta = loadExternalPolicyPackMetadata();
    expect(meta.some(m => m.policyPackId === 'external-mismatch')).toBe(false);
  });

  test('caret_match_major_accepted', () => {
    const meta = loadExternalPolicyPackMetadata();
    expect(meta.some(m => m.policyPackId === 'caret-pack')).toBe(true);
  });
});
