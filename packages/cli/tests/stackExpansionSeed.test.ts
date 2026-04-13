import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { validateSnapshotSchema } from '../src/snapshot-validator.js';

describe('Phase 3A Final: Stack Expansion Determinism Seed', () => {
  const getPayload = (namespace: string | undefined, hash: string, seed: string) => ({
    snapshotVersion: '1.0', schemaVersion: '1.0.0', artifactCompatibilityVersion: '1.0', engineVersion: '4.0.0', timestamp: '2026-04-11T00:00:00.000Z', repoHash: 'abc', workspaceType: 'monorepo', extractionMode: 'package_json_scan', coverage: 1, connectivity: 1, topologyConfidence: 1, stabilityScore: 1, stabilityTier: 'STABLE', topologyConfidenceLabel: 'HIGH', detectedNodes: 1, connectedNodes: 1, expectedNodes: 1, authorityCrossings: 0, warnings: [], regressionSeverity: 'NONE', regressionConfidence: 'HIGH', regressionConfidenceSource: 'topology', regression: { detected: false, severity: 'NONE', confidence: 'HIGH', confidenceSource: 'topology', baselineFound: true, summary: '' }, executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 },
    policyEvaluation: {
      violations: 0,
      mode: 'enforce',
      version: 1,
      policyDetected: true,
      evaluationStrategyVersion: 1,
      policyNamespace: namespace,
      policyHash: hash,
      policyStackIds: ['a'],
      policyStackHashes: ['hA'],
      stackOrderingChecksum: crypto.createHash('sha256').update((namespace || 'local') + ':' + ['a'].join('|')).digest('hex'),
      stackExpansionDeterminismSeed: seed
    }
  });

  const getSeed = (namespace: string, hash: string) => 
    crypto.createHash('sha256').update(namespace + ':' + hash).digest('hex');

  it('Test 1: identical namespace + identical canonicalPolicyHash gives identical seed', () => {
    const seed1 = getSeed('orgA', 'hashX');
    const seed2 = getSeed('orgA', 'hashX');
    expect(seed1).toEqual(seed2);
    
    // Validate the seed using the validator
    const payload = getPayload('orgA', 'hashX', seed1);
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(true);
    expect(result.errors).not.toContain('Stack expansion determinism seed mismatch — traversal replay unsafe');
    expect(result.errors).not.toContain('Stack expansion determinism seed invalid');
  });

  it('Test 2: namespace mutation gives seed mismatch', () => {
    const seed = getSeed('orgA', 'hashX');
    
    const payload = getPayload('orgB', 'hashX', seed);
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stack expansion determinism seed mismatch — traversal replay unsafe');
  });

  it('Test 3: canonicalPolicyHash mutation gives seed mismatch', () => {
    const seed = getSeed('orgA', 'hashX');
    
    const payload = getPayload('orgA', 'hashY', seed);
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stack expansion determinism seed mismatch — traversal replay unsafe');
  });
});
