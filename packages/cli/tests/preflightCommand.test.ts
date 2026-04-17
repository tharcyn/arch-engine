import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { preflightCommand } from '../src/preflightCommand';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
      if (typeof p === 'string' && p.includes('.arch-engine/registry.json')) return false;
      return actual.existsSync(p);
    }),
    statSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) return { isDirectory: () => true };
      return actual.statSync(p as any);
    }),
    readdirSync: vi.fn((p) => {
      if (typeof p === 'string' && p.includes('.arch-engine/policies')) {
        return ['execution.policy.json'];
      }
      return actual.readdirSync(p as any);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('execution.policy.json')) {
        return JSON.stringify({
          policyPackId: 'execution-pack',
          description: 'desc',
          category: 'cat',
          requiredDatasetCapabilities: ['supports_foo'],
          requiredMutationClasses: ['required_mutation_class']
        });
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

describe('Phase 15A Preflight CLI Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('outputs correct JSON for blocked execution', async () => {
    const dataset = {
        topology_dataset_identity: {
            dataset_id: "test-dataset-id",
            dataset_name: "test-dataset",
            dataset_semver: "1.0.0",
            producer_id: "test-producer",
            dataset_producer_version: "1.0.0",
            generation_timestamp: "2026-04-17T00:00:00Z"
        },
        dataset_format_identifier: "arch_engine_topology_export_v1",
        topology_schema_version: "1.0.0",
        policy_pack_compatibility: {
            "authority-boundaries": "1.0.0",
            "rest-contracts": "1.0.0",
            "edge-confidence": "1.0.0",
            "authority_pack": "1.0.0",
            "rest_contract_pack": "1.0.0",
            "edge_confidence_pack": "1.0.0",
            "journey_pack": "1.0.0",
            "journey-flows": "1.0.0",
            "execution-pack": "1.0.0"
        },
        topology_capability_manifest: {
            supports_authority_scope: true,
            supports_directionality: true,
            supports_edge_confidence: true
        },
        mutation_class_registry: {
            "some_other_class": {}
        },
        services: []
    };

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.mocked(fs.readFileSync).mockImplementation((p, enc) => {
        if (typeof p === 'string' && p.endsWith('topology-export.json')) {
            return JSON.stringify(dataset);
        }
        if (typeof p === 'string' && p.endsWith('execution.policy.json')) {
            return JSON.stringify({
                policyPackId: 'execution-pack',
                description: 'desc',
                category: 'cat',
                requiredDatasetCapabilities: ['supports_foo'],
                requiredMutationClasses: ['required_mutation_class']
            });
        }
        if (typeof p === 'string' && p.endsWith('policy-lock.json')) {
            return JSON.stringify({ schemaVersion: '1.0.0', datasetIdentity: { topologyDatasetIdentity: 'test-dataset' }, registries: [] });
        }
        if (typeof p === 'string' && p.endsWith('trust.json')) {
            return JSON.stringify({ 
                version: '1.0.0',
                enforcementMode: 'require-signature',
                lockfileSigners: {
                    'test': { key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----', allowedOperations: ['verify'] }
                } 
            });
        }
        return '';
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.endsWith('topology-export.json')) return true;
        if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
        if (typeof p === 'string' && p.endsWith('trust.json')) return true;
        return false;
    });

    const exitCode = await preflightCommand(['--json']);
    expect(exitCode).toBe(1);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const jsonOutput = JSON.parse(consoleSpy.mock.calls[0][0]);
    
    expect(jsonOutput.allowed).toBe(false);
    expect(jsonOutput.overallStatus).toBe('blocked');
    expect(jsonOutput.primaryBlockReason).toBe('LOCKFILE_ENFORCEMENT_BLOCKED');

    consoleSpy.mockRestore();
  });
  
  test('outputs human readable blocks', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(fs.existsSync).mockImplementation((p) => {
          if (typeof p === 'string' && p.endsWith('trust.json')) return false; // Missing trust means permissive
          return false;
      });

      const exitCode = await preflightCommand([]);
      expect(exitCode).toBe(0); // permissive allowed
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Federation Preflight Execution Decision: ALLOWED'));

      consoleSpy.mockRestore();
  });
});
