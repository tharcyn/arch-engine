import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { EngineRunner } from '../../src/runner/engine-runner';
import { ValidatorRunner } from '../../src/validators/ValidatorRunner';
import type { TopologyValidator } from '../../src/validators/TopologyValidator';
import type { ValidatorResult } from '../../src/validators/validator-result';
import type { ValidatorTopologyView } from '../../src/topology/validator-topology-view';

describe('Phase 2B Validator Runner Execution Substrate', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-engine-test-runner-'));

  function writeTestDataset(name: string, data: any): string {
    const fullPath = path.join(tempDir, name);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    return fullPath;
  }

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const validDataset = {
    topology_dataset_identity: {
      dataset_id: "test-validators",
      dataset_semver: "1.0.0",
      dataset_producer_version: "1.0",
      producer: "arch",
      dataset: "engine"
    },
    dataset_format_identifier: "arch_engine_topology_export_v1",
    topology_schema_version: "1.0.0",
    policy_pack_compatibility: {
      authority_pack: "1.0.0",
      rest_contract_pack: "1.0.0",
      journey_pack: "1.0.0"
    },
    topology_capability_manifest: {
      supports_authority_scope: true,
      supports_directionality: true,
      supports_edge_confidence: true
    }
  };

  const dummyView: ValidatorTopologyView = Object.freeze({
    projectionSurfaceVersion: '1.0.0',
    projectionSurfaceHash: 'hash',
    datasetPath: '/dummy',
    datasetSemver: '1.0.0',
    schemaVersion: '1.0.0',
    identity: {
      dataset_id: 'test',
      dataset_semver: '1.0.0',
      dataset_producer_version: '1.0'
    },
    capabilities: {
      manifest: {
        supports_authority_scope: true,
        supports_directionality: false
      },
      policyPackCompatibility: {},
      supportedPolicyPacks: {},
      requiredCapabilities: []
    }
  } as any);

  class SuccessValidator implements TopologyValidator {
    validatorId = 'success-validator';
    displayName = 'Success Validator';
    run(view: ValidatorTopologyView): ValidatorResult {
      return { validatorId: this.validatorId, success: true, diagnostics: [] };
    }
  }

  class MissingCapabilityValidator implements TopologyValidator {
    validatorId = 'missing-cap-validator';
    displayName = 'Missing Cap Validator';
    requiredCapabilities = ['supports_fictional_feature'];
    run(view: ValidatorTopologyView): ValidatorResult {
      return { validatorId: this.validatorId, success: false, diagnostics: [] };
    }
  }

  class ValidCapabilityValidator implements TopologyValidator {
    validatorId = 'valid-cap-validator';
    displayName = 'Valid Cap Validator';
    requiredCapabilities = ['supports_authority_scope'];
    run(view: ValidatorTopologyView): ValidatorResult {
      return { validatorId: this.validatorId, success: true, diagnostics: [{code: 'VAL_PASS', message: 'Passed', severity: 'info'}] };
    }
  }

  class ViewAssertionValidator implements TopologyValidator {
    validatorId = 'view-assertion';
    displayName = 'View Assertion';
    run(view: ValidatorTopologyView): ValidatorResult {
      if ((view as any).diagnostics !== undefined) {
        throw new Error('Gate diagnostics leaked into validator view');
      }
      return { validatorId: this.validatorId, success: true, diagnostics: [] };
    }
  }

  test('validator executes successfully and preserves ordering', () => {
    const val1 = new SuccessValidator();
    const val2 = new ValidCapabilityValidator();
    const runner = new ValidatorRunner([val1, val2]);
    const envelope = runner.run(dummyView);
    const results = envelope.results;

    expect(envelope.executionSurfaceVersion).toBe('1.0.0');
    expect(results.length).toBe(2);
    expect(results[0].validatorId).toBe('success-validator');
    expect(results[1].validatorId).toBe('valid-cap-validator');
    expect(results[1].diagnostics[0].code).toBe('VAL_PASS');
  });

  test('capability-gated validator is skipped when capabilities missing', () => {
    const val1 = new MissingCapabilityValidator();
    const runner = new ValidatorRunner([val1]);
    const results = runner.run(dummyView).results;

    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(results[0].diagnostics[0].code).toBe('VALIDATOR_SKIPPED');
    expect(results[0].diagnostics[0].severity).toBe('info');
    expect(results[0].diagnostics[0].message).toContain('supports_fictional_feature');
  });

  test('validators receive ValidatorTopologyView only without gate leakage', () => {
    const viewAssertVal = new ViewAssertionValidator();
    const runner = new ValidatorRunner([viewAssertVal]);
    const results = runner.run(dummyView).results;
    expect(results[0].success).toBe(true);
  });

  test('EngineRunner runValidators executes synchronously and completely', () => {
    const p = writeTestDataset('runner.json', validDataset);
    
    // Stub engine manifest
    const manifest = { schemaVersion: '1', version: '1.0.0', capabilities: {} } as any;
    const engine = new EngineRunner(manifest);

    const envelope = engine.runValidators(p, [new MissingCapabilityValidator(), new ValidCapabilityValidator()]);
    const results = envelope.results;
    
    expect(envelope.executionSurfaceVersion).toBe('1.0.0');
    expect(results.length).toBe(2);
    expect(results[0].validatorId).toBe('missing-cap-validator');
    expect(results[0].success).toBe(true); // Due to skip behaviour
    expect(results[1].validatorId).toBe('valid-cap-validator');
    expect(results[1].success).toBe(true);
  });

  test('runner does not mutate input view', () => {
    class MutatorValidator implements TopologyValidator {
      validatorId = 'mutator';
      displayName = 'Mutator';
      run(view: ValidatorTopologyView): ValidatorResult {
         try {
           (view as any).projectionSurfaceVersion = 'hacked';
           return { validatorId: this.validatorId, success: false, diagnostics: [] };
         } catch {
           return { validatorId: this.validatorId, success: true, diagnostics: [] };
         }
      }
    }
    
    const runner = new ValidatorRunner([new MutatorValidator()]);
    const results = runner.run(dummyView).results;

    expect(results[0].success).toBe(true); // Fails strictly to mutate because it's a frozen view functionally
    expect(dummyView.projectionSurfaceVersion).toBe('1.0.0');
  });

  test('duplicate validatorId throws deterministic error', () => {
    const val1 = new SuccessValidator();
    const val2 = new SuccessValidator(); // Same validatorId

    expect(() => new ValidatorRunner([val1, val2])).toThrow('Duplicate validatorId detected: success-validator');
  });

  test('validator_execution_order_is_stable', () => {
    const calls: string[] = [];
    
    class OrderVal implements TopologyValidator {
      constructor(public validatorId: string) {}
      displayName = 'Order';
      run(view: ValidatorTopologyView): ValidatorResult {
        calls.push(this.validatorId);
        return { validatorId: this.validatorId, success: true, diagnostics: [] };
      }
    }

    const runner = new ValidatorRunner([
      new OrderVal('val-A'),
      new OrderVal('val-B'),
      new OrderVal('val-C')
    ]);

    const results = runner.run(dummyView).results;

    // Execution order matches insertion strictly
    expect(calls).toEqual(['val-A', 'val-B', 'val-C']);
    
    // Results order matches insertion strictly
    expect(results[0].validatorId).toBe('val-A');
    expect(results[1].validatorId).toBe('val-B');
    expect(results[2].validatorId).toBe('val-C');
  });
});
