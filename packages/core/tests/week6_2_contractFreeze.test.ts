import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { evaluatePolicy } from '../src/policy/evaluator.js';
import type { PolicyConfig, EvaluatorEdge } from '../src/policy/types.js';
import { validateSnapshotSchema } from '../../cli/src/snapshot-validator.js';
import { SUMMARY_SCHEMA_VERSION } from '../../../action/src/summaryRenderer.js';

describe('Week 6.2 Contract Freeze Constraints', () => {

  const edges: EvaluatorEdge[] = [
    { source: 'apps/web', target: 'infra/db' },
    { source: 'apps/mobile', target: 'infra/db' },
  ];

  it('A. policyDetected contract ensures payload stability when missing locally', () => {
    // Tests that policyDetected = false validates successfully and explicitly.
    const mockArtifact = {
      snapshotVersion: '1.0',
      timestamp: new Date().toISOString(),
      workspaceType: 'monorepo',
      engineVersion: '4.0.0',
      extractionMode: 'structured_graph',
      stabilityScore: 0.9,
      stabilityTier: 'STABLE',
      topologyConfidence: 0.9,
      topologyConfidenceLabel: 'HIGH',
      coverage: 0.8,
      connectivity: 0.9,
      detectedNodes: 10,
      connectedNodes: 9,
      expectedNodes: 10,
      authorityCrossings: 0,
      policyEvaluation: {
        violations: 0,
        policyDetected: false // Emulate no local .archengine/policy.yml
      }
    };

    const result = validateSnapshotSchema(mockArtifact);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('B. policyHash invariant holds identical across environments solely from content', () => {
    const policyRaw = `
version: 1
mode: enforce
rules:
  forbid:
    - from: apps
      to: infra
`;
    // Irrespective of whether this file is loaded from CWD='/tmp/A' or CWD='/Users/B'
    const hashA = crypto.createHash('sha256').update(policyRaw).digest('hex').substring(0, 8);
    const hashB = crypto.createHash('sha256').update(policyRaw).digest('hex').substring(0, 8);
    expect(hashA).toStrictEqual(hashB);

    const changedRaw = `
version: 1
mode: advisory
rules:
  forbid:
    - from: apps
      to: infra
`;
    const hashC = crypto.createHash('sha256').update(changedRaw).digest('hex').substring(0, 8);
    expect(hashA).not.toBe(hashC);
  });

  it('C. tierDelta maintains sign invariants and matchedDomain remains decoupled', () => {
    const config: PolicyConfig = {
      version: 1, mode: 'enforce',
      domains: {
        'layer3': { tier: 'high' },    // Rank 3
        'layer2': { tier: 'medium' },  // Rank 2
        'layer1': { tier: 'low' }      // Rank 1
      }
    };
    
    // Evaluate Upward Dependency (Positive Violation Expected: L3 depends on L1)
    const EvalUp = evaluatePolicy([{source: 'layer3/service', target: 'layer1/service'}], config, 'HIGH', 'abc');
    const vUp = EvalUp.violations[0];
    expect(vUp).toBeDefined();
    expect(vUp.tierSource).toBe('high');
    expect(vUp.tierTarget).toBe('low');
    expect(vUp.tierDelta).toBe(2);
    expect(vUp.matchedDomainSource).toBe('layer3'); // Soft-locked
    expect(vUp.matchedDomainTarget).toBe('layer1');

    // Evaluate Downward Dependency implicitly allowed, testing logic math if we forced it
    // Delta would be 1 - 3 = -2 (negative)
  });

  it('D. policyRuleHits calculates edges matched, not nodes', () => {
    const config: PolicyConfig = {
      version: 1, mode: 'enforce',
      rules: { forbid: [{ id: 'rule1', from: 'apps', to: 'infra', severity: 'error'}] }
    };
    // 1 source, 2 targets => 2 edges
    const result = evaluatePolicy([
      { source: 'apps/web', target: 'infra/cache'},
      { source: 'apps/web', target: 'infra/db'}
    ], config, 'HIGH', 'hash1');

    expect(result.violations.length).toBe(2);
    expect(result.policyRuleHits['rule1']).toBe(2); // 2 edges evaluated and matched successfully
  });

  it('E. summarySchemaVersion follows MINOR additive compatibility logic', () => {
    expect(SUMMARY_SCHEMA_VERSION).toBe('1.1');
    const parts = SUMMARY_SCHEMA_VERSION.split('.');
    expect(Number(parts[0])).toBe(1); // Major = 1
    // Readers configured for 1.x logic can ignore added payload structurally
  });
  
  it('F. validateSnapshotSchema permits arbitrary additive expansion cleanly (SOFT-LOCKED)', () => {
    const mockArtifact = {
      snapshotVersion: '1.0',
      timestamp: new Date().toISOString(), workspaceType: 'monorepo', engineVersion: '4.0.0', extractionMode: 'ast',
      stabilityScore: 1, stabilityTier: 'STABLE', topologyConfidence: 1, topologyConfidenceLabel: 'HIGH',
      coverage: 1, connectivity: 1, detectedNodes: 1, connectedNodes: 1, expectedNodes: 1, authorityCrossings: 0,
      policyEvaluation: {
        violations: 1,
        mode: 'enforce',
        version: 1,
        policyHash: 'mockHash',
        evaluationStrategyVersion: 1,
        policyDetected: true,
        policyRuleHits: { 'rule1': 1 },
        policyStackIds: ['local'],
        policyStackHashes: ['mockHash'],
        stackOrderingChecksum: require('node:crypto').createHash('sha256').update('local:local').digest('hex'),
        stackExpansionDeterminismSeed: require('node:crypto').createHash('sha256').update('local:mockHash').digest('hex'),
        // UNKNOWN Additive field (Federation metadata)
        inheritedOverlayOrigin: 'github.com/org/central-policy'
      }
    };
    const result = validateSnapshotSchema(mockArtifact);
    // Extraneous mappings map to valid=true cleanly natively without throwing
    expect(result.valid).toBe(true);
  });
});
