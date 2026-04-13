import { describe, it, expect } from 'vitest';
import { validateSnapshotSchema } from '../src/snapshot-validator.js';
import * as crypto from 'node:crypto';

describe('Phase 3A: Namespace-Anchored Checksum Tests', () => {
  const getPayload = (namespace: string | undefined, stackIds: string[], checksum: string) => ({
    snapshotVersion: '1.0', schemaVersion: '1.0.0', artifactCompatibilityVersion: '1.0', engineVersion: '4.0.0', timestamp: '2026-04-11T00:00:00.000Z', repoHash: 'abc', workspaceType: 'monorepo', extractionMode: 'package_json_scan', coverage: 1, connectivity: 1, topologyConfidence: 1, stabilityScore: 1, stabilityTier: 'STABLE', topologyConfidenceLabel: 'HIGH', detectedNodes: 1, connectedNodes: 1, expectedNodes: 1, authorityCrossings: 0, warnings: [], regressionSeverity: 'NONE', regressionConfidence: 'HIGH', regressionConfidenceSource: 'topology', regression: { detected: false, severity: 'NONE', confidence: 'HIGH', confidenceSource: 'topology', baselineFound: true, summary: '' }, executionMetrics: { extractionMs: 0, pipelineMs: 0, totalMs: 0 },
    policyEvaluation: {
      violations: 0,
      mode: 'enforce',
      version: 1,
      policyDetected: true,
      evaluationStrategyVersion: 1,
      policyNamespace: namespace,
      policyHash: 'hashX',
      policyStackIds: stackIds,
      policyStackHashes: stackIds.map(() => 'h'),
      stackOrderingChecksum: checksum,
      stackExpansionDeterminismSeed: crypto.createHash('sha256').update((namespace || 'local') + ':hashX').digest('hex')
    }
  });

  const getHash = (namespace: string, stack: string[]) => 
    crypto.createHash('sha256').update(namespace + ':' + stack.join('|')).digest('hex');

  it('Test 1: Namespace difference produces checksum difference', () => {
    const stack = ['a', 'b'];
    const hashA = getHash('orgA', stack);
    const hashB = getHash('orgB', stack);
    expect(hashA).not.toEqual(hashB);
  });

  it('Test 2: Identical namespace + identical stack gives identical checksum', () => {
    const stack = ['a', 'b'];
    const hash1 = getHash('orgA', stack);
    const hash2 = getHash('orgA', stack);
    expect(hash1).toEqual(hash2);
    
    // Validate it passes the validator
    const result = validateSnapshotSchema(getPayload('orgA', stack, hash1), undefined);
    expect(result.valid).toBe(true);
    expect(result.errors).not.toContain('Stack ordering checksum invalid');
  });

  it('Test 3: Stack order mutation gives checksum mismatch', () => {
    const hash1 = getHash('orgA', ['a', 'b']);
    const hash2 = getHash('orgA', ['b', 'a']);
    expect(hash1).not.toEqual(hash2);

    const result = validateSnapshotSchema(getPayload('orgA', ['b', 'a'], hash1), undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stack ordering checksum invalid');
  });

  it('Test 4: Namespace mutation gives checksum mismatch', () => {
    const hash = getHash('orgA', ['a', 'b']);
    
    const result = validateSnapshotSchema(getPayload('orgB', ['a', 'b'], hash), undefined);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Stack ordering checksum invalid');
  });

  it('Backward Compatibility: Auto-regenerates legacy checksums without throwing', () => {
    const stack = ['a', 'b'];
    const legacyHash = crypto.createHash('sha256').update(stack.join('|')).digest('hex');
    const anchoredHash = getHash('local', stack);

    const payload = getPayload(undefined, stack, legacyHash);
    const result = validateSnapshotSchema(payload, undefined);

    expect(result.valid).toBe(true);
    // Auto-migrated in memory
    expect((payload as any).policyEvaluation.stackOrderingChecksum).toBe(anchoredHash);
  });
});
