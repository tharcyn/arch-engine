import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { validateSnapshotSchema } from '../src/snapshot-validator.js';

describe('Phase 3A Final: Topology Invariant Pre-Execution', () => {
  const getPayload = (overrides: any) => ({
    snapshotVersion: '1.0', schemaVersion: '1.0.0', artifactCompatibilityVersion: '1.0', engineVersion: '4.0.0', timestamp: '2026-04-11T00:00:00.000Z', repoHash: 'abc', workspaceType: 'monorepo', extractionMode: 'package_json_scan', coverage: 1, connectivity: 1, topologyConfidence: 1, stabilityScore: 1, stabilityTier: 'STABLE', topologyConfidenceLabel: 'HIGH', detectedNodes: 1, connectedNodes: 1, expectedNodes: 1, authorityCrossings: 0, warnings: [], regressionSeverity: 'NONE', regressionConfidence: 'HIGH', regressionConfidenceSource: 'topology', regression: { detected: false, severity: 'NONE', confidence: 'HIGH', confidenceSource: 'topology', baselineFound: true, summary: '' }, executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 },
    policyEvaluation: {
      violations: 0,
      mode: 'enforce',
      version: 1,
      policyDetected: true,
      evaluationStrategyVersion: 1,
      policyNamespace: 'local',
      policyHash: 'hashX',
      policyStackIds: ['a'],
      policyStackHashes: ['hA'],
      stackOrderingChecksum: crypto.createHash('sha256').update('local:a').digest('hex'),
      stackExpansionDeterminismSeed: crypto.createHash('sha256').update('local:hashX').digest('hex'),
      ...overrides
    }
  });

  it('Test 5: empty policyStackIds triggers exception', () => {
    const payload = getPayload({
      policyStackIds: []
    });
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid stack topology: empty policyStackIds');
  });

  it('Test 5: hash/id length mismatch triggers exception', () => {
    const payload = getPayload({
      policyStackIds: ['a', 'b'],
      policyStackHashes: ['hA'] // mismatch
    });
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid stack topology: hash/id length mismatch');
  });

  it('Test 5: duplicate ids triggers exception', () => {
    const payload = getPayload({
      policyStackIds: ['a', 'a'],
      policyStackHashes: ['hA', 'hA']
    });
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duplicate stack entries detected');
  });

  it('Test 5: bad checksum triggers exception', () => {
    const payload = getPayload({
      stackOrderingChecksum: 'bad'
    });
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stack ordering checksum invalid');
  });

  it('Test 5: bad seed triggers exception', () => {
    const payload = getPayload({
      stackExpansionDeterminismSeed: 'bad'
    });
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stack expansion determinism seed mismatch — traversal replay unsafe');
  });
});
