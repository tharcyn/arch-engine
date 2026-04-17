import { describe, test, expect } from 'vitest';
import { diffPolicyRegistryLockfile } from '../../src/policy/diffPolicyRegistryLockfile';
import type { PolicyRegistryLockEntry } from '../../src/policy/PolicyRegistryLockfile';

describe('diffPolicyRegistryLockfile', () => {
  test('returns empty diff for identical entries', () => {
    const locked: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'A', description: 'desc', category: 'cat' }] }
    ];
    const current = [...locked];
    const diff = diffPolicyRegistryLockfile(current, locked);
    expect(diff.addedPacks).toEqual([]);
    expect(diff.removedPacks).toEqual([]);
    expect(diff.changedPacks).toEqual([]);
  });

  test('detects added packs', () => {
    const locked: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'A', description: 'desc', category: 'cat' }] }
    ];
    const current: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [
        { policyPackId: 'A', description: 'desc', category: 'cat' },
        { policyPackId: 'B', description: 'desc2', category: 'cat' }
      ]}
    ];
    const diff = diffPolicyRegistryLockfile(current, locked);
    expect(diff.addedPacks).toEqual(['B']);
    expect(diff.removedPacks).toEqual([]);
    expect(diff.changedPacks).toEqual([]);
  });

  test('detects removed packs', () => {
    const locked: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [
        { policyPackId: 'A', description: 'desc', category: 'cat' },
        { policyPackId: 'C', description: 'desc', category: 'cat' }
      ]}
    ];
    const current: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'C', description: 'desc', category: 'cat' }] }
    ];
    const diff = diffPolicyRegistryLockfile(current, locked);
    expect(diff.addedPacks).toEqual([]);
    expect(diff.removedPacks).toEqual(['A']);
    expect(diff.changedPacks).toEqual([]);
  });

  test('detects changed packs based on metadata difference', () => {
    const locked: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'A', description: 'desc1', category: 'cat' }] }
    ];
    const current: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'A', description: 'desc2', category: 'cat' }] }
    ];
    const diff = diffPolicyRegistryLockfile(current, locked);
    expect(diff.addedPacks).toEqual([]);
    expect(diff.removedPacks).toEqual([]);
    expect(diff.changedPacks).toEqual(['A']);
  });

  test('determistic sort order', () => {
    const locked: PolicyRegistryLockEntry[] = [
      { registryUrl: 'https://test.dev', packs: [{ policyPackId: 'Z', description: '', category: '' }, { policyPackId: 'A', description: '', category: '' }] }
    ];
    const current: PolicyRegistryLockEntry[] = [];
    const diff = diffPolicyRegistryLockfile(current, locked);
    expect(diff.removedPacks).toEqual(['A', 'Z']);
  });
});
