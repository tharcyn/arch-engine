import { describe, expect, test } from 'vitest';
import { assessPolicyRegistryLockfileFreshness } from '../../src/policy/assessPolicyRegistryLockfileFreshness';
import type { PolicyRegistryLockfile, PolicyRegistryLockEntry } from '../../src/policy/PolicyRegistryLockfile';

describe('assessPolicyRegistryLockfileFreshness', () => {
  const liveRegistries: PolicyRegistryLockEntry[] = [
    {
      registryUrl: 'https://registry.example.com',
      packs: [
        { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' },
        { policyPackId: 'pack-b', version: '1.0.0', contentHash: 'hash-b' }
      ]
    }
  ];

  test('missing lockfile', () => {
    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, undefined);
    
    expect(result.isFresh).toBe(false);
    expect(result.lockfilePresent).toBe(false);
    expect(result.changeDetected).toBe(true);
    expect(result.message).toBe('Lockfile is missing');
  });

  test('matching live and persisted registry surfaces (unsigned)', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries
    };

    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile);
    
    expect(result.isFresh).toBe(true);
    expect(result.lockfilePresent).toBe(true);
    expect(result.signaturePresent).toBe(false);
    expect(result.changeDetected).toBe(false);
    expect(result.message).toBe('Lockfile is unsigned but fresh');
  });

  test('added registry drift', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [
        {
          registryUrl: 'https://registry.example.com',
          packs: [
            { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' }
          ]
        }
      ]
    };

    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile);
    
    expect(result.isFresh).toBe(false);
    expect(result.changeDetected).toBe(true);
    expect(result.driftSummary).toBe('Registry Drift (Added: 1, Removed: 0, Changed: 0)');
    expect(result.message).toBe('Lockfile is unsigned and stale');
  });

  test('removed registry drift', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [
        {
          registryUrl: 'https://registry.example.com',
          packs: [
            { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' },
            { policyPackId: 'pack-b', version: '1.0.0', contentHash: 'hash-b' },
            { policyPackId: 'pack-c', version: '1.0.0', contentHash: 'hash-c' }
          ]
        }
      ]
    };

    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile);
    
    expect(result.isFresh).toBe(false);
    expect(result.changeDetected).toBe(true);
    expect(result.driftSummary).toBe('Registry Drift (Added: 0, Removed: 1, Changed: 0)');
  });

  test('changed registry drift', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [
        {
          registryUrl: 'https://registry.example.com',
          packs: [
            { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' },
            { policyPackId: 'pack-b', version: '1.1.0', contentHash: 'hash-b-new' }
          ]
        }
      ]
    };

    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile);
    
    expect(result.isFresh).toBe(false);
    expect(result.changeDetected).toBe(true);
    expect(result.driftSummary).toBe('Registry Drift (Added: 0, Removed: 0, Changed: 1)');
  });

  test('signed + trusted + fresh (assumes signature validity is checked externally)', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'abc123def'
    };

    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile);
    
    expect(result.isFresh).toBe(true);
    expect(result.signaturePresent).toBe(true);
    expect(result.signerKeyId).toBe('test-key');
    expect(result.message).toBe('Lockfile is signed and fresh');
  });

  test('signed + trusted + stale', () => {
    const lockfile: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: [
        {
          registryUrl: 'https://registry.example.com',
          packs: [
            { policyPackId: 'pack-a', version: '1.0.0', contentHash: 'hash-a' }
          ]
        }
      ],
      signatureAlgorithm: 'ed25519',
      signatureKeyId: 'test-key',
      signature: 'abc123def'
    };

    const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfile);
    
    expect(result.isFresh).toBe(false);
    expect(result.signaturePresent).toBe(true);
    expect(result.driftSummary).toBe('Registry Drift (Added: 1, Removed: 0, Changed: 0)');
    expect(result.message).toBe('Lockfile is signed but stale');
  });

  describe('dataset identity drift', () => {
    const lockfileWithIdentity: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      datasetIdentity: {
        topologyDatasetIdentity: { dataset_id: 'test-dataset' },
        datasetSemver: '1.0.0',
        datasetFormatIdentifier: 'arch_engine_topology_export_v1',
        topologySchemaVersion: '1.0.0',
        datasetLineage: { root: 'node-1' }
      }
    };

    test('matching dataset identity', () => {
      const activeIdentity = { ...lockfileWithIdentity.datasetIdentity };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithIdentity, activeIdentity);
      expect(result.isFresh).toBe(true);
    });

    test('dataset version mismatch', () => {
      const activeIdentity = { ...lockfileWithIdentity.datasetIdentity, datasetSemver: '1.1.0' };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithIdentity, activeIdentity);
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain('semver changed');
    });

    test('dataset format mismatch', () => {
      const activeIdentity = { ...lockfileWithIdentity.datasetIdentity, datasetFormatIdentifier: 'other_format' };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithIdentity, activeIdentity);
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain('format changed');
    });

    test('topology schema mismatch', () => {
      const activeIdentity = { ...lockfileWithIdentity.datasetIdentity, topologySchemaVersion: '2.0.0' };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithIdentity, activeIdentity);
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain('schema changed');
    });

    test('dataset lineage mismatch', () => {
      const activeIdentity = { ...lockfileWithIdentity.datasetIdentity, datasetLineage: { root: 'node-2' } };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithIdentity, activeIdentity);
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain('lineage mismatch');
    });

    test('dataset replacement detection', () => {
      const activeIdentity = { ...lockfileWithIdentity.datasetIdentity, topologyDatasetIdentity: { dataset_id: 'other-dataset' } };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithIdentity, activeIdentity);
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain('topologyDatasetIdentity fields modified');
    });
  });

  describe('capability manifest drift', () => {
    const lockfileWithCapability: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      datasetCapabilityManifest: {
        'CAPABILITY_A': true,
        'CAPABILITY_B': true
      }
    };

    test('matching capability manifest', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithCapability, undefined, {
        'CAPABILITY_A': true,
        'CAPABILITY_B': true
      });
      expect(result.isFresh).toBe(true);
    });

    test('removed required capability', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithCapability, undefined, {
        'CAPABILITY_A': true
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("missing required capability 'CAPABILITY_B'");
    });

    test('changed capability declaration (new capability)', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithCapability, undefined, {
        'CAPABILITY_A': true,
        'CAPABILITY_B': true,
        'CAPABILITY_C': true
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("new capability declared 'CAPABILITY_C'");
    });

    test('deterministic ordering normalization', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithCapability, undefined, {
        'CAPABILITY_B': true,
        'CAPABILITY_A': true
      });
      expect(result.isFresh).toBe(true);
    });
  });

  describe('mutation class registry drift', () => {
    const lockfileWithMutation: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      datasetMutationClassRegistry: {
        'MUTATION_A': { safe: true },
        'MUTATION_B': { safe: false }
      }
    };

    test('matching mutation class registry', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithMutation, undefined, undefined, {
        'MUTATION_A': { safe: true },
        'MUTATION_B': { safe: false }
      });
      expect(result.isFresh).toBe(true);
    });

    test('missing mutation class', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithMutation, undefined, undefined, {
        'MUTATION_A': { safe: true }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("missing mutation class 'MUTATION_B'");
    });

    test('new mutation class', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithMutation, undefined, undefined, {
        'MUTATION_A': { safe: true },
        'MUTATION_B': { safe: false },
        'MUTATION_C': { safe: true }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("new mutation class 'MUTATION_C'");
    });

    test('changed mutation class', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithMutation, undefined, undefined, {
        'MUTATION_A': { safe: false },
        'MUTATION_B': { safe: false }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("changed mutation class 'MUTATION_A'");
    });
  });

  describe('authority scope registry drift', () => {
    const lockfileWithAuthority: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      datasetAuthorityScopeRegistry: {
        'SCOPE_X': ['read', 'write'],
        'SCOPE_Y': ['read']
      }
    };

    test('matching authority scope registry', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithAuthority, undefined, undefined, undefined, {
        'SCOPE_X': ['read', 'write'],
        'SCOPE_Y': ['read']
      });
      expect(result.isFresh).toBe(true);
    });

    test('missing authority scope', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithAuthority, undefined, undefined, undefined, {
        'SCOPE_X': ['read', 'write']
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("missing authority scope 'SCOPE_Y'");
    });

    test('new authority scope', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithAuthority, undefined, undefined, undefined, {
        'SCOPE_X': ['read', 'write'],
        'SCOPE_Y': ['read'],
        'SCOPE_Z': ['admin']
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("new authority scope 'SCOPE_Z'");
    });

    test('changed authority scope', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithAuthority, undefined, undefined, undefined, {
        'SCOPE_X': ['read'],
        'SCOPE_Y': ['read']
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("changed authority scope 'SCOPE_X'");
    });
  });

  describe('surface confidence registry drift', () => {
    const lockfileWithConfidence: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      datasetSurfaceConfidenceRegistry: {
        'edge_inferred': { confidence: 0.85 },
        'edge_declared': { confidence: 1.0 }
      }
    };

    test('matching confidence registry', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithConfidence, undefined, undefined, undefined, undefined, {
        'edge_declared': { confidence: 1.0 },
        'edge_inferred': { confidence: 0.85 }
      });
      expect(result.isFresh).toBe(true);
    });

    test('missing confidence key', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithConfidence, undefined, undefined, undefined, undefined, {
        'edge_inferred': { confidence: 0.85 }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("missing key 'edge_declared'");
    });

    test('new confidence key', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithConfidence, undefined, undefined, undefined, undefined, {
        'edge_inferred': { confidence: 0.85 },
        'edge_declared': { confidence: 1.0 },
        'edge_heuristic': { confidence: 0.5 }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("new key 'edge_heuristic'");
    });

    test('changed confidence semantics', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithConfidence, undefined, undefined, undefined, undefined, {
        'edge_inferred': { confidence: 0.65 },
        'edge_declared': { confidence: 1.0 }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("changed key 'edge_inferred'");
    });

    test('deterministic ordering normalization', () => {
      const lockfileReversed: PolicyRegistryLockfile = {
        lockfileSurfaceVersion: '1.0.0',
        registries: liveRegistries,
        datasetSurfaceConfidenceRegistry: {
          'edge_declared': { confidence: 1.0 },
          'edge_inferred': { confidence: 0.85 }
        }
      };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileReversed, undefined, undefined, undefined, undefined, {
        'edge_inferred': { confidence: 0.85 },
        'edge_declared': { confidence: 1.0 }
      });
      expect(result.isFresh).toBe(true);
    });
  });

  describe('trust boundary rules drift', () => {
    const lockfileWithBoundary: PolicyRegistryLockfile = {
      lockfileSurfaceVersion: '1.0.0',
      registries: liveRegistries,
      datasetTrustBoundaryRules: {
        'cross_authority_edge': { action: 'deny' },
        'same_authority_edge': { action: 'allow' }
      }
    };

    test('matching trust boundary rules', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithBoundary, undefined, undefined, undefined, undefined, undefined, {
        'cross_authority_edge': { action: 'deny' },
        'same_authority_edge': { action: 'allow' }
      });
      expect(result.isFresh).toBe(true);
    });

    test('missing boundary rule', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithBoundary, undefined, undefined, undefined, undefined, undefined, {
        'same_authority_edge': { action: 'allow' }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("missing rule 'cross_authority_edge'");
    });

    test('new boundary rule', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithBoundary, undefined, undefined, undefined, undefined, undefined, {
        'cross_authority_edge': { action: 'deny' },
        'same_authority_edge': { action: 'allow' },
        'delegated_edge': { action: 'audit' }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("new rule 'delegated_edge'");
    });

    test('changed boundary mapping', () => {
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileWithBoundary, undefined, undefined, undefined, undefined, undefined, {
        'cross_authority_edge': { action: 'allow' },
        'same_authority_edge': { action: 'allow' }
      });
      expect(result.isFresh).toBe(false);
      expect(result.driftSummary).toContain("changed rule 'cross_authority_edge'");
    });

    test('deterministic ordering normalization', () => {
      const lockfileReversed: PolicyRegistryLockfile = {
        lockfileSurfaceVersion: '1.0.0',
        registries: liveRegistries,
        datasetTrustBoundaryRules: {
          'same_authority_edge': { action: 'allow' },
          'cross_authority_edge': { action: 'deny' }
        }
      };
      const result = assessPolicyRegistryLockfileFreshness(liveRegistries, lockfileReversed, undefined, undefined, undefined, undefined, undefined, {
        'cross_authority_edge': { action: 'deny' },
        'same_authority_edge': { action: 'allow' }
      });
      expect(result.isFresh).toBe(true);
    });
  });
});
