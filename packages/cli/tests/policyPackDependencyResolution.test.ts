import { describe, test, expect, vi, afterEach } from 'vitest';
import { resolvePolicyPackDependencies } from '../src/resolvePolicyPackDependencies';
import * as listPolicyPackMetadataModule from '../src/listPolicyPackMetadata';

vi.mock('../src/listPolicyPackMetadata', () => ({
  listPolicyPackMetadata: vi.fn()
}));

describe('Phase 10E Policy-Pack Dependency Resolution Surface', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('single_dependency_resolved', async () => {
    vi.mocked(listPolicyPackMetadataModule.listPolicyPackMetadata).mockResolvedValue([
      { policyPackId: 'A', dependencies: ['B'], description: '', category: '' },
      { policyPackId: 'B', description: '', category: '' }
    ]);
    const res = await resolvePolicyPackDependencies(['A'], ['A', 'B']);
    expect(res).toEqual(['B', 'A']);
  });

  test('multiple_dependencies_resolved', async () => {
    vi.mocked(listPolicyPackMetadataModule.listPolicyPackMetadata).mockResolvedValue([
      { policyPackId: 'A', dependencies: ['B', 'C'], description: '', category: '' },
      { policyPackId: 'B', description: '', category: '' },
      { policyPackId: 'C', description: '', category: '' }
    ]);
    const res = await resolvePolicyPackDependencies(['A'], ['A', 'B', 'C']);
    expect(res).toEqual(['B', 'C', 'A']);
  });

  test('duplicate_dependencies_removed', async () => {
    vi.mocked(listPolicyPackMetadataModule.listPolicyPackMetadata).mockResolvedValue([
      { policyPackId: 'A', dependencies: ['B', 'C'], description: '', category: '' },
      { policyPackId: 'B', dependencies: ['C'], description: '', category: '' },
      { policyPackId: 'C', description: '', category: '' }
    ]);
    const res = await resolvePolicyPackDependencies(['A'], ['A', 'B', 'C']);
    expect(res).toEqual(['C', 'B', 'A']);
  });

  test('cycle_safely_handled', async () => {
    vi.mocked(listPolicyPackMetadataModule.listPolicyPackMetadata).mockResolvedValue([
      { policyPackId: 'A', dependencies: ['B'], description: '', category: '' },
      { policyPackId: 'B', dependencies: ['A'], description: '', category: '' }
    ]);
    const res = await resolvePolicyPackDependencies(['A'], ['A', 'B']);
    expect(res).toEqual(['B', 'A']);
  });

  test('missing_dependency_skipped', async () => {
    vi.mocked(listPolicyPackMetadataModule.listPolicyPackMetadata).mockResolvedValue([
      { policyPackId: 'A', dependencies: ['B', 'MISSING'], description: '', category: '' },
      { policyPackId: 'B', description: '', category: '' }
    ]);
    const res = await resolvePolicyPackDependencies(['A'], ['A', 'B']);
    expect(res).toEqual(['B', 'A']);
  });

  test('execution_order_preserved', async () => {
    vi.mocked(listPolicyPackMetadataModule.listPolicyPackMetadata).mockResolvedValue([
      { policyPackId: 'enterprise-baseline', dependencies: ['authority-boundaries', 'rest-contract'], description: '', category: '' },
      { policyPackId: 'authority-boundaries', description: '', category: '' },
      { policyPackId: 'rest-contract', description: '', category: '' }
    ]);
    const res = await resolvePolicyPackDependencies(['enterprise-baseline'], ['enterprise-baseline', 'authority-boundaries', 'rest-contract']);
    expect(res).toEqual(['authority-boundaries', 'rest-contract', 'enterprise-baseline']);
  });
});
