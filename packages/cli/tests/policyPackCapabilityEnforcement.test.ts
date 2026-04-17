import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { runCheckCommand } from '../src/runCheckCommand';

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
        return ['capable.policy.json'];
      }
      return actual.readdirSync(p as any);
    }),
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('capable.policy.json')) {
        return JSON.stringify({
          policyPackId: 'capable-pack',
          description: 'desc',
          category: 'cat',
          requiredDatasetCapabilities: ['supports_magic']
        });
      }
      return actual.readFileSync(p as any, enc as any);
    }),
  };
});

describe('Phase 14B Policy-Pack Capability Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ARCH_ENGINE_ENFORCEMENT_MODE', 'require-signature');
  });
  
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test('blocks execution if required dataset capability is missing', async () => {
    // A dataset that DOES NOT have supports_magic
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
            "capable-pack": "1.0.0"
        },
        topology_capability_manifest: {
            supports_authority_scope: true,
            supports_directionality: true,
            supports_edge_confidence: true
        },
        services: []
    };

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Pass the dataset directly via options since we mocked runCheckCommand to read from file usually,
    // but runCheckCommand parses it from file OR options. Actually runCheckCommand accepts it as a file argument.
    // Let's just mock readFileSync for the dataset path!
    // Wait, the easier way is just to pass options.activeDataset?
    // No, runCheckCommand signature is (datasetPath, options).
    // Let's mock readFileSync for the dataset path.
    vi.mocked(fs.readFileSync).mockImplementation((p, enc) => {
        if (typeof p === 'string' && p.endsWith('dataset.json')) {
            return JSON.stringify(dataset);
        }
        if (typeof p === 'string' && p.endsWith('capable.policy.json')) {
            return JSON.stringify({
                policyPackId: 'capable-pack',
                description: 'desc',
                category: 'cat',
                requiredDatasetCapabilities: ['supports_magic']
            });
        }
        if (typeof p === 'string' && p.endsWith('policy-lock.json')) {
            return JSON.stringify({ schemaVersion: '1.0.0', datasetIdentity: { topologyDatasetIdentity: 'test-dataset' }, registries: [] });
        }
        if (typeof p === 'string' && p.endsWith('trust.json')) {
            return JSON.stringify({ enforcementMode: 'require-signature' });
        }
        return '';
    });
    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (typeof p === 'string' && p.endsWith('dataset.json')) return true;
        if (typeof p === 'string' && p.includes('.arch-engine/policies')) return true;
        if (typeof p === 'string' && p.endsWith('trust.json')) return true;
        return false;
    });

    const exitCode = await runCheckCommand('dataset.json', { policy: ['capable-pack'] });
    expect(exitCode).toBe(1);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Policy-Pack Execution Blocked'));

    consoleSpy.mockRestore();
  });
});
