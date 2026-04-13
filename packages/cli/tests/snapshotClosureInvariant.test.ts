import { describe, it, expect } from 'vitest';
import { validateSnapshotSchema } from '../src/snapshot-validator.js';
import * as crypto from 'node:crypto';

describe('Phase 3: Snapshot Closure Invariant', () => {
  it('detects mismatching lengths between policyStackIds and policyStackHashes', () => {
    const payload = {
      snapshotVersion: '1.0', schemaVersion: '1.0.0', artifactCompatibilityVersion: '1.0', engineVersion: '4.0.0', timestamp: '2026-04-11T00:00:00.000Z', repoHash: 'abc', workspaceType: 'monorepo', extractionMode: 'package_json_scan', coverage: 1, connectivity: 1, topologyConfidence: 1, stabilityScore: 1, stabilityTier: 'STABLE', topologyConfidenceLabel: 'HIGH', detectedNodes: 1, connectedNodes: 1, expectedNodes: 1, authorityCrossings: 0, warnings: [], regressionSeverity: 'NONE', regressionConfidence: 'HIGH', regressionConfidenceSource: 'topology', regression: { detected: false, severity: 'NONE', confidence: 'HIGH', confidenceSource: 'topology', baselineFound: true, summary: '' }, executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 },
      policyEvaluation: {
        violations: 0,
        mode: 'enforce',
        version: 1,
        policyDetected: true,
        evaluationStrategyVersion: 1,
        policyHash: 'hashX',
        policyStackIds: ['a', 'b'],
        policyStackHashes: ['h1'], // Length mismatch
        stackOrderingChecksum: crypto.createHash('sha256').update('local:a|b').digest('hex'),
        stackExpansionDeterminismSeed: crypto.createHash('sha256').update('local:hashX').digest('hex')
      }
    };
    
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid stack topology: hash/id length mismatch');
  });

  it('passes when lengths match perfectly', () => {
    const payload = {
      snapshotVersion: '1.0', schemaVersion: '1.0.0', artifactCompatibilityVersion: '1.0', engineVersion: '4.0.0', timestamp: '2026-04-11T00:00:00.000Z', repoHash: 'abc', workspaceType: 'monorepo', extractionMode: 'package_json_scan', coverage: 1, connectivity: 1, topologyConfidence: 1, stabilityScore: 1, stabilityTier: 'STABLE', topologyConfidenceLabel: 'HIGH', detectedNodes: 1, connectedNodes: 1, expectedNodes: 1, authorityCrossings: 0, warnings: [], regressionSeverity: 'NONE', regressionConfidence: 'HIGH', regressionConfidenceSource: 'topology', regression: { detected: false, severity: 'NONE', confidence: 'HIGH', confidenceSource: 'topology', baselineFound: true, summary: '' }, executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 },
      policyEvaluation: {
        violations: 0,
        mode: 'enforce',
        version: 1,
        policyDetected: true,
        evaluationStrategyVersion: 1,
        policyHash: 'hashX',
        policyStackIds: ['a', 'b'],
        policyStackHashes: ['h1', 'h2'],
        stackOrderingChecksum: crypto.createHash('sha256').update('local:a|b').digest('hex'),
        stackExpansionDeterminismSeed: crypto.createHash('sha256').update('local:hashX').digest('hex')
      }
    };
    
    const result = validateSnapshotSchema(payload, undefined);
    expect(result.valid).toBe(true);
    expect(result.errors).not.toContain('Invalid stack topology: hash/id length mismatch');
  });
});
