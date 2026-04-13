import { describe, it, expect } from 'vitest';
import { validateSnapshotSchema } from '../../cli/src/snapshot-validator.js';

describe('Phase 3F: Manifest Schema Validator Parity', () => {

  it('Test 1: Validator correctly processes full telemetry envelopes including manifest v1', () => {
    // Generate valid dummy payload
    const payload = {
      policyNamespace: 'local',
      policyHash: 'abc',
      evaluationStrategyVersion: 1,
      policyDetected: true,
      stackExpansionDeterminismSeed: 'abc',
      stackOrderingChecksum: 'abc',
      stackExpansionTopologyVersion: 'v1',
      policyGovernanceContractVersion: 'v1',
      policyTransportContractVersion: 'v1',
      policyRegistryContractVersion: 'v1',
      policyManifestSchemaVersion: 'v1',
      policyStackIds: ['A'],
      policyStackHashes: ['abc'],
      policyRuleHits: {},
      violations: [],
      timestamp: new Date().toISOString()
    };

    const res = validateSnapshotSchema({ policyEvaluation: payload }, undefined);
    
    // We expect it NOT to complain about manifest schema version mismatch
    expect(res.errors).not.toContain('Missing manifest schema version — snapshot replay unsafe');
    expect(res.errors).not.toContain('Manifest schema version mismatch — snapshot replay unsafe');
  });

});
